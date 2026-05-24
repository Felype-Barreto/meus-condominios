import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  searchParams,
}: {
  searchParams?: Promise<{ title?: string }>;
}) {
  const { title } = (await searchParams) ?? {};
  const headline = title || "Meus Condomínios | Gestão moderna de condomínios";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F5EFE6",
          color: "#111827",
          padding: 72,
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "#7C5C3E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800 }}>
              M
            </div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>Meus Condomínios</div>
          </div>
          <div style={{ maxWidth: 830, fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>
            {headline}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#4B5563" }}>
            <span>condomínio</span>
            <span>•</span>
            <span>síndico</span>
            <span>•</span>
            <span>moradores</span>
            <span>•</span>
            <span>portaria</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
