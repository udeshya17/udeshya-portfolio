/**
 * The smallest WebGL runtime that can draw a full-screen fragment shader.
 * No library: one triangle, one program, a handful of uniforms.
 * Buffers are rendered below CSS resolution (atmospheres are soft) and upscaled by the browser.
 */

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

export type Uniforms = Record<string, number | readonly number[]>;
export type Layer = {
  /** Draws one frame. Returns false if there was nothing to draw into (hidden canvas, lost context). */
  render: (u: Uniforms) => boolean;
  /** Buffer pixels per CSS pixel, for uniforms given in screen space. */
  scale: number;
};

export function createLayer(
  canvas: HTMLCanvasElement,
  frag: string,
  opts: { scale: number; alpha?: boolean; textures?: Record<string, string> },
): Layer | null {
  const gl = canvas.getContext("webgl", {
    alpha: !!opts.alpha,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[world] shader failed to compile:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[world] shader failed to link:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

  // textures: sampler name -> image URL. The layer draws nothing until every one has arrived.
  let pending = 0;
  Object.entries(opts.textures ?? {}).forEach(([name, url], unit) => {
    pending++;
    const tex = gl.createTexture();
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      // no mipmaps: an equirectangular map would sample the wrong level along its seam
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(prog, name), unit);
      pending--;
    };
    img.onerror = () => console.warn(`[world] texture failed to load: ${url}`);
    img.src = url;
  });

  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
  });

  const locs = new Map<string, WebGLUniformLocation | null>();
  const loc = (name: string) => {
    let l = locs.get(name);
    if (l === undefined) {
      l = gl.getUniformLocation(prog, name);
      locs.set(name, l);
    }
    return l;
  };

  let w = 0;
  let h = 0;
  return {
    scale: opts.scale,
    render(u) {
      if (lost || pending > 0) return false;
      const cw = Math.round(canvas.clientWidth * opts.scale);
      const ch = Math.round(canvas.clientHeight * opts.scale);
      if (cw < 2 || ch < 2) return false;
      if (cw !== w || ch !== h) {
        w = canvas.width = cw;
        h = canvas.height = ch;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(loc("uRes"), w, h);
      for (const k in u) {
        const l = loc(k);
        if (!l) continue;
        const v = u[k];
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
        else gl.uniform4f(l, v[0], v[1], v[2], v[3]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
  };
}
