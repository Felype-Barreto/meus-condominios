import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meus Condomínios",
    short_name: "Meus Condomínios",
    description:
      "Gestão simples, segura e moderna para condomínios, moradores e portaria.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#F5EFE6",
    theme_color: "#7C5C3E",
    orientation: "portrait",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/morai-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/morai-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Abrir painel",
        short_name: "Painel",
        url: "/app",
        icons: [{ src: "/icons/morai-icon.svg", sizes: "any" }],
      },
      {
        name: "Contato oficial",
        short_name: "Contato",
        url: "/contato",
        icons: [{ src: "/icons/morai-icon.svg", sizes: "any" }],
      },
    ],
  };
}
