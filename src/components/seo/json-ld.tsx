import Script from "next/script";

function getSchemaId(data: Record<string, unknown>) {
  const type = String(data["@type"] ?? data["@context"] ?? "schema")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `json-ld-${type || "schema"}-${JSON.stringify(data).length}`;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data);

  return (
    <Script
      id={getSchemaId(data)}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
