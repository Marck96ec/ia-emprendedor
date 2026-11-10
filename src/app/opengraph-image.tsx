import { ImageResponse } from "next/og";

import { OG_IMAGE_ALT, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const cycleSteps = [
  "Diagnosticar",
  "Decidir",
  "Ejecutar",
  "Medir",
  "Aprender",
  "Mejorar",
];

const taglineLines = SITE_TAGLINE.split(". ")
  .map((line) => line.replace(/\.$/, ""))
  .filter(Boolean);

/*
 * Imagen social generada con código: usa la marca real del producto
 * (sin fotos de archivo ni resultados inventados). La fuente Geist 400
 * viene incluida en next/og, así que no se cargan archivos externos.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)",
          color: "white",
          fontFamily: "geist",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: "#10b981",
              }}
            />
            <span
              style={{
                fontSize: 34,
                letterSpacing: 6,
                color: "#f8fafc",
              }}
            >
              {SITE_NAME}
            </span>
          </div>
          <span style={{ fontSize: 24, color: "#94a3b8" }}>
            {SITE_URL.replace("https://", "")}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {taglineLines.map((line) => (
            <div
              key={line}
              style={{ display: "flex", alignItems: "baseline", gap: 20 }}
            >
              <span style={{ fontSize: 56, color: "#10b981" }}>→</span>
              <span style={{ fontSize: 56, color: "#f8fafc" }}>{line}.</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {cycleSteps.map((step, index) => (
            <div
              key={step}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <span
                style={{
                  fontSize: 22,
                  color: "#e2e8f0",
                  background: "rgba(148, 163, 184, 0.16)",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  borderRadius: 9999,
                  padding: "8px 18px",
                }}
              >
                {step}
              </span>
              {index < cycleSteps.length - 1 && (
                <span style={{ fontSize: 20, color: "#64748b" }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
