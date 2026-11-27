import type { RealmKind } from "./realms";

/**
 * Procedural atmospheres, one fragment shader per world, plus the wormhole between them.
 * Shared uniforms: uRes (buffer px), uTime (s), uD (0..1 depth into the world),
 * uA (0..1 arrival: 0 the moment you land, 1 once settled), uMouse (-1..1), uP (a point of interest).
 */

const HEAD = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uD;
uniform float uA;
uniform float uFall;
uniform vec2 uMouse;
uniform vec2 uP;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; }
  return v;
}
// a touch of noise hides the banding dark gradients get on 8-bit screens
vec3 grade(vec3 c){ return c + (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - .5) / 255.; }
`;

/* ------------------------------ 01 · first light ------------------------------ */

const COSMOS = /* glsl */ `
float stars(vec2 fc, float cell, float density, float t){
  vec2 g = fc / cell;
  vec2 id = floor(g);
  vec2 fr = fract(g) - .5;
  float h = hash(id);
  vec2 off = (vec2(hash(id + 7.1), hash(id + 3.3)) - .5) * .5;
  float tw = .55 + .45 * sin(t * (1. + h * 3.) + h * 60.);
  return step(1. - density, h) * (1. - smoothstep(0., .3, length(fr - off))) * tw * (.35 + .65 * fract(h * 37.));
}

void main(){
  float ar = uRes.x / uRes.y;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float f = uFall;

  // the sky behind: a domain-warped nebula and its galactic band
  vec2 pm = p + uMouse * vec2(-.012, .008);
  pm.y += uD * .22 + f * .5;
  float t = uTime * .007;
  vec2 nq = pm * 1.35 + vec2(1.7, 9.2);
  vec2 w = vec2(fbm(nq + t), fbm(nq + vec2(5.2, 1.3) - t));
  float n = fbm(nq + 1.9 * w);
  float n2 = fbm(nq * 2.1 - w * 1.3 + 4.);
  float band = exp(-pow((pm.y - pm.x * .42 - .1) * 2.1, 2.));
  vec3 col = vec3(.010, .008, .026);
  col += vec3(.22, .11, .50) * pow(n, 2.6) * 1.6 * (.3 + band);
  col += vec3(.04, .32, .48) * pow(n2, 3.) * 1.1 * (.2 + band * .8);
  col += vec3(.66, .24, .20) * pow(max(w.x * n, 0.), 2.6) * 2. * band;
  col *= 1. - .6 * smoothstep(.46, .78, fbm(nq * 3.1 + w * 2.)) * band;

  // stars, streaming up as you fall
  vec2 fc = gl_FragCoord.xy + vec2(0., (uD * .25 + f * 1.4) * uRes.y);
  float cell = uRes.y / 120.;
  col += vec3(.86, .9, 1.) * (stars(fc, cell, .05, uTime) + .8 * stars(fc * 1.37 + 31., cell * 1.6, .03, uTime * 1.3));

  vec2 uv = gl_FragCoord.xy / uRes;
  col *= 1. - .45 * dot(uv - .5, uv - .5);
  gl_FragColor = vec4(grade(col), 1.);
}`;

/* -------------------------------- 02 · the deep -------------------------------- */

const OCEAN = /* glsl */ `
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.;
  vec2 i = p;
  float c = 1.;
  for (int n = 0; n < 4; n++){
    float tt = t * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005)));
  }
  c = 1.17 - pow(c / 4., 1.4);
  return pow(abs(c), 8.);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float depth = uD;

  // the water column: colour by how far below the surface this pixel is
  float dz = (1. - uv.y) * .5 + depth * 1.25;
  vec3 col = mix(vec3(.05, .40, .54), vec3(.02, .17, .32), smoothstep(0., .42, dz));
  col = mix(col, vec3(.007, .045, .11), smoothstep(.32, .95, dz));
  col = mix(col, vec3(.002, .010, .030), smoothstep(.9, 1.5, dz));

  float sun = 1. - smoothstep(0., .7, depth);

  // shafts of light fanning down from the surface
  vec2 lp = vec2(.1 + uMouse.x * .04, 1.3);
  vec2 d = p - lp;
  float ang = atan(d.x, -d.y);
  float shafts = fbm(vec2(ang * 9. + uTime * .04, uTime * .11)) * fbm(vec2(ang * 24. - uTime * .06, 2.));
  shafts = smoothstep(.1, .46, shafts);
  col += vec3(.42, .86, .96) * shafts * exp(-length(d) * 1.3) * 3.4 * sun * .55;

  // caustic light dancing just under the surface
  float ca = caustic(p * vec2(.8, 1.5) + vec2(0., depth * .9), uTime * .45);
  col += vec3(.5, .92, 1.) * ca * smoothstep(.15, 1., uv.y) * sun * .2;

  // bioluminescent haze in the abyss
  col += vec3(.12, .06, .30) * pow(fbm(p * 1.8 + vec2(uTime * .02, depth)), 2.) * smoothstep(.5, 1., depth) * .5;

  col *= 1. - dot(p * vec2(.75, 1.), p * vec2(.75, 1.)) * (.35 + depth * .5);
  gl_FragColor = vec4(grade(col), 1.);
}`;

/* ------------------------------- 03 · old forest ------------------------------- */

const FOREST = /* glsl */ `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float h = uv.y;

  // twilight: ink above, a warm afterglow where the sun went down
  vec3 col = mix(vec3(.030, .10, .085), vec3(.008, .028, .034), smoothstep(.42, 1., h));
  float glow = exp(-pow((h - .40) * 4., 2.));
  col = mix(col, vec3(.46, .38, .16), glow * .5);
  col = mix(col, vec3(.005, .016, .012), smoothstep(.36, .02, h));

  // moonlight: a halo, and shafts raking through the mist
  vec2 d = p - uP;
  float md = length(d);
  float ang = atan(d.y, d.x);
  float shafts = smoothstep(.36, .74, fbm(vec2(ang * 13., 1.) + uTime * .015));
  col += vec3(.60, .66, .46) * shafts * exp(-md * 1.5) * .26;
  col += vec3(.95, .94, .74) * exp(-md * 8.) * .34;

  // mist pooling between the ridges, drifting sideways
  float m1 = fbm(vec2(p.x * 1.5 + uTime * .018, p.y * 5. - uD * 1.4));
  float m2 = fbm(vec2(p.x * 2.6 - uTime * .012, p.y * 8. + 3.));
  float low = smoothstep(.78, .22, h) * smoothstep(0., .26, h);
  col += vec3(.36, .52, .44) * (pow(m1, 2.) * .3 + pow(m2, 3.) * .22) * low;

  col *= 1. - .45 * dot(uv - .5, uv - .5);
  gl_FragColor = vec4(grade(col), 1.);
}`;

/* --------------------------------- 04 · skyfall --------------------------------- */

const SKY = /* glsl */ `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  p.x += uMouse.x * -.01;
  float h = uv.y;

  // dusk, from the first stars down to the last light
  vec3 col = mix(vec3(.16, .10, .33), vec3(.030, .028, .11), smoothstep(.5, 1., h));
  col = mix(vec3(.47, .20, .41), col, smoothstep(.32, .6, h));
  col = mix(vec3(.93, .43, .36), col, smoothstep(.19, .4, h));
  col = mix(vec3(1., .72, .47), col, smoothstep(.11, .25, h));

  // the sun, half sunk into the cloud sea
  vec2 sp = vec2(.12, -.345);
  float sd = length(p - sp);
  col += vec3(1., .80, .56) * exp(-sd * 6.) * .7;
  col = mix(col, vec3(1., .96, .86), smoothstep(.060, .050, sd));
  float ra = atan(p.y - sp.y, p.x - sp.x);
  col += vec3(1., .70, .50) * smoothstep(.45, .8, fbm(vec2(ra * 7., uTime * .03))) * exp(-sd * 2.2) * .17;

  // three decks of cloud, lit from the sun; the near ones rush up as you fall
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float sc = 1.6 - fi * .45;
    float par = .25 + fi * .75;
    vec2 cp = vec2(p.x * sc + fi * 7.3 + uTime * (.006 + fi * .004), (p.y - uD * par) * sc * 2.4 + fi * 3.1);
    float dn = fbm(cp);
    float cov = .57 - fi * .015;
    float den = smoothstep(cov, cov + .2, dn);
    vec2 ld = normalize(sp - p + vec2(0., .0001));
    float lit = clamp(.55 + (dn - fbm(cp + ld * .16)) * 4., 0., 1.);
    float warm = exp(-sd * 1.6);
    vec3 shade = mix(vec3(.28, .16, .35), vec3(.52, .26, .44), warm);
    vec3 light = mix(vec3(.84, .60, .72), vec3(1., .80, .62), warm);
    col = mix(col, mix(shade, light, lit), den * (.5 + fi * .13));
  }

  // the sea of cloud below
  float edge = h + (fbm(vec2(p.x * 3. + uTime * .01, 2.)) - .5) * .09;
  float sea = smoothstep(.20, .07, edge);
  col = mix(col, mix(vec3(.84, .52, .58), vec3(.24, .13, .33), smoothstep(.17, 0., h)), sea);

  gl_FragColor = vec4(grade(col), 1.);
}`;

/* ----------------------------- 05 · northern lights ----------------------------- */

const AURORA = /* glsl */ `
// one curtain of light: a wavy lower hem, with rays streaming up from it
float curtain(vec2 p, float t, float seed, float amp){
  float x = p.x * 1.15 + seed * 3.7;
  float hem = amp * (.10 * sin(x * 1.3 + t * .35 + seed) + .05 * sin(x * 2.9 - t * .22 + seed * 2.3) + .025 * sin(x * 6.3 + t * .6));
  float dy = p.y - hem;
  float fold = noise(vec2(x * 2.2 + t * .15, seed));
  float rays = .4 + .6 * noise(vec2(x * 24. + sin(t * .2 + seed) * 2., seed * 5.));
  float reach = .2 + .3 * fold;
  return smoothstep(-.012, .012, dy) * exp(-max(dy, 0.) / reach * 1.6) * rays * (.3 + .95 * fold);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  const float hz = .30; // the far shore of the lake

  // fold the lake back onto the sky: what's below the shore is a rippled reflection
  float below = step(uv.y, hz);
  float ry = mix(uv.y, 2. * hz - uv.y, below);
  float rip = below * (noise(vec2(p.x * 26., uv.y * 150. - uTime * .7)) - .5) * .014 * (1. + (hz - uv.y) * 9.);
  vec2 s = vec2(p.x + rip + uMouse.x * -.008, ry - .5);
  float t = uTime * .22;

  vec3 col = mix(vec3(.012, .052, .10), vec3(.004, .010, .030), smoothstep(hz, 1., ry));
  col += vec3(.02, .11, .13) * exp(-(ry - hz) * 6.);

  float c1 = curtain(vec2(s.x + .2, s.y - .02), t, 1., 1.);
  float c2 = curtain(vec2(s.x * 1.5 - .4, s.y - .17), t * 1.2, 2., .8);
  float c3 = curtain(vec2(s.x * .75 + 1.1, s.y + .08), t * .8, 3., 1.2);
  float crown = smoothstep(-.05, .36, s.y);
  vec3 green = vec3(.20, 1., .62), violet = vec3(.56, .36, 1.), ice = vec3(.16, .76, 1.);
  float wake = .22 + .78 * uA;
  col += (c1 * mix(green, violet, crown) + c2 * mix(ice, violet, crown) * .75 + c3 * mix(green, ice, .4) * .6) * wake * .9;

  col = mix(col, col * vec3(.42, .58, .68) * .8 + vec3(0., .010, .018), below);
  gl_FragColor = vec4(grade(col), 1.);
}`;

export const SCENE_SHADERS: Record<RealmKind, string> = {
  cosmos: HEAD + COSMOS,
  ocean: HEAD + OCEAN,
  forest: HEAD + FOREST,
  sky: HEAD + SKY,
  aurora: HEAD + AURORA,
};

/* ------------------------------------ earth ------------------------------------ */

/**
 * The real Earth (NASA Blue Marble / Black Marble), drawn as a sphere seen from space.
 * uC: centre and uR: radius, in screen heights from the middle of the screen (y up).
 * uView: the latitude and longitude (radians) facing you. uSun: light direction, view space.
 * uGlare: how much of the sun to show rising over the limb. uDetail: 0..1, fine surface
 * texture to add as you dive in (the maps run out of pixels long before the ground does).
 * Draws on a transparent canvas: premultiplied colour, alpha = planet + glow.
 */
export const EARTH_SHADER = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define PI 3.14159265
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uC;
uniform float uR;
uniform vec2 uView;
uniform vec3 uSun;
uniform float uGlare;
uniform float uDetail;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uClouds;
uniform sampler2D uOcean;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.07; a *= .5; }
  return v;
}

// view-space normal -> equirectangular uv, for the hemisphere facing uView
vec2 toMap(vec3 n){
  float cl = cos(uView.x), sl = sin(uView.x);
  vec3 w = vec3(n.x, n.y * cl + n.z * sl, -n.y * sl + n.z * cl);
  float lat = asin(clamp(w.y, -1., 1.));
  float lon = atan(w.x, w.z) + uView.y;
  return vec2(fract(lon / (2. * PI) + .5), .5 - lat / PI);
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec2 q = (p - uC) / uR;
  float l = length(q);
  float px = 1.6 / (uRes.y * uR);
  float a = 1. - smoothstep(1. - px, 1., l);
  vec3 col = vec3(0.);

  if (l < 1.) {
    vec3 n = vec3(q, sqrt(max(0., 1. - l * l)));
    vec2 uv = toMap(n);
    vec3 day = texture2D(uDay, uv).rgb;
    vec2 cu = uv + vec2(uTime * .0009, 0.);
    float cloud = texture2D(uClouds, cu).r;
    float ocean = texture2D(uOcean, uv).r;
    // up close, the map gets help: fine grain on land, small waves on water
    if (uDetail > 0.) {
      vec2 g = uv * vec2(4096., 2048.);
      float fine = fbm(g * .35) - .5;
      day *= 1. + fine * .5 * uDetail * (1. - ocean);
      day += vec3(.02, .05, .07) * (noise(g * 1.6 + uTime * .6) - .5) * uDetail * ocean;
      cloud = clamp(cloud + (fbm(g * .25 + uTime * .05) - .5) * .45 * uDetail * step(.06, cloud), 0., 1.);
    }
    float ndl = dot(n, uSun);
    float lit = smoothstep(-.08, .25, ndl);
    // the cloud's own shadow, a little offset toward the night side
    float shade = 1. - .4 * texture2D(uClouds, cu + uSun.xy * .002).r;
    vec3 surf = day * (.025 + 1.25 * max(ndl, 0.)) * shade;
    // sunglint on the oceans
    vec3 r = reflect(-uSun, n);
    surf += day * ocean * .55 * max(ndl, 0.); // open water reads a little brighter than the map
    surf += vec3(1., .9, .75) * (pow(max(r.z, 0.), 180.) * .9 + pow(max(r.z, 0.), 18.) * .08) * ocean * (1. - cloud);
    // city lights on the night side
    surf += texture2D(uNight, uv).rgb * vec3(1.1, .85, .55) * (1. - lit) * (1. - cloud * .8) * 1.4;
    // cloud tops
    surf = mix(surf, vec3(.97, .98, 1.) * (.03 + 1.05 * max(ndl, 0.)), cloud * .92);
    // looking through more air toward the edge: blue haze, strongest on the day side
    float edge = pow(1. - n.z, 3.);
    surf = mix(surf, vec3(.32, .58, 1.) * (.12 + lit), edge * .75);
    col = surf * a;
  }

  // the thin blue line of atmosphere
  float al = max(l - 1., 0.) * uR;
  float side = smoothstep(-.6, .6, dot(normalize(q + 1e-5), uSun.xy) + uSun.z * .5);
  vec3 halo = (vec3(.38, .68, 1.) * exp(-al * 44.) * (.18 + .95 * side) + vec3(.2, .42, .95) * exp(-al * 8.) * .16 * side) * (1. - a);

  // the sun, just over the limb
  vec2 sunAt = normalize(vec2(-.35, .94));
  vec2 sp = uC + sunAt * uR * 1.035;
  float sd = length(p - sp);
  float glare = (exp(-sd * 46.) * 1.6 + exp(-sd * 7.) * .26) * (1. - a);
  glare += exp(-abs(p.y - sp.y) * 170.) * exp(-abs(p.x - sp.x) * 1.8) * .5;
  vec3 sun = vec3(1., .86, .7) * glare * uGlare;

  vec3 add = halo + sun;
  float alpha = clamp(a + max(add.r, max(add.g, add.b)), 0., 1.);
  gl_FragColor = vec4(col + add, alpha);
}`;
