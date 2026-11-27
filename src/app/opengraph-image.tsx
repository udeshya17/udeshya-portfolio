import { ImageResponse } from "next/og";
import { getContent } from "@/lib/content/get";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portfolio";

export default async function OgImage() {
  const { profile } = await getContent();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#eeeef5",
          background:
            "radial-gradient(circle at 78% 30%, rgba(139,108,255,.45), transparent 45%), radial-gradient(circle at 20% 90%, rgba(63,224,255,.25), transparent 40%), #04040a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#d4ff3f" }}>
          <div style={{ width: 14, height: 14, borderRadius: 99, background: "#d4ff3f" }} />
          {profile.availabilityText}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{profile.name}</div>
          <div style={{ fontSize: 40, marginTop: 24, color: "#b9bbd0" }}>{profile.title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#8d8fa6" }}>
          Full-Stack · Blockchain · AI Agents · System Design
        </div>
      </div>
    ),
    size,
  );
}
