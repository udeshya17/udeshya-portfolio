import { connection } from "next/server";
import { store } from "@/lib/content/store";

/** Serves images uploaded from /admin (stored in ./data or MongoDB). */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  await connection();
  const { key } = await params;
  if (!/^img-[0-9a-f-]{36}$/.test(key)) return new Response("Not found", { status: 404 });
  const file = await store.readFile(key).catch(() => null);
  if (!file || !file.contentType.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
