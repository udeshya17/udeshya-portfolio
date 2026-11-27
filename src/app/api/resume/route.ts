import { connection } from "next/server";
import { getContent } from "@/lib/content/get";
import { loadDefaultResume, store } from "@/lib/content/store";

/** Streams the latest résumé (uploaded via /admin, or the bundled default) as a download. */
export async function GET(request: Request) {
  await connection();
  const file = (await store.readFile("resume").catch(() => null)) ?? (await loadDefaultResume());
  const { resume } = await getContent();
  const inline = new URL(request.url).searchParams.has("view");
  const name = (resume.fileName || file.fileName || "resume.pdf").replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType || "application/pdf",
      "Content-Length": String(file.data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
