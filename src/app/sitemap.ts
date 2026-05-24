import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const publicRoutes = [
  "/",
  "/precos",
  "/recursos",
  "/recursos/comunicados",
  "/recursos/agendamentos",
  "/recursos/encomendas",
  "/recursos/guarita",
  "/recursos/qr-code-condominio",
  "/recursos/sindico",
  "/recursos/moradores",
  "/recursos/comunicacao-whatsapp",
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
  "/blog",
  "/blog/sistema-para-condominio",
  "/blog/app-para-sindico",
  "/blog/como-organizar-comunicacao-condominio",
  "/blog/controle-de-encomendas-condominio",
  "/blog/reserva-de-salao-de-festas-online",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-19");

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/blog") ? 0.7 : 0.85,
  }));
}
