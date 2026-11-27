import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 25%, #1a1a2e, #04040a 75%)",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d4ff3f" />
              <stop offset="0.55" stopColor="#3fe0ff" />
              <stop offset="1" stopColor="#8b6cff" />
            </linearGradient>
          </defs>
          <ellipse cx="32" cy="32" rx="25" ry="9" fill="none" stroke="url(#g)" strokeWidth="1.6" opacity="0.55" transform="rotate(-28 32 32)" />
          <path d="M20 16v18a12 12 0 0 0 24 0V16" fill="none" stroke="url(#g)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="49.5" cy="20" r="3.2" fill="#d4ff3f" />
        </svg>
      </div>
    ),
    size,
  );
}
