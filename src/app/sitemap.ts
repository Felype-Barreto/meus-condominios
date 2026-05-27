import type { MetadataRoute } from "next";
import { blogPosts, featurePages } from "@/lib/public-content";
import { absoluteUrl } from "@/lib/seo";

const publicRoutes = [
  "/",
  "/precos",
  "/comparativo/whatsapp-condominio",
  "/seguranca",
  "/confianca",
  "/qr-seguro",
  "/lgpd",
  "/tratamento-de-dados",
  "/privacidade",
  "/termos",
  "/uso-aceitavel",
  "/denunciar",
  "/cancelamento",
  "/politica-de-cancelamento",
  "/cookies",
  "/contato",
  "/suporte",
  "/demo",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-19");
  const routes = [
    ...publicRoutes,
    ...Object.values(featurePages).map((page) => page.path),
    "/blog",
    ...Object.values(blogPosts).map((post) => post.path),
  ];

  return Array.from(new Set(routes)).map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/blog") ? 0.7 : 0.85,
  }));
}
