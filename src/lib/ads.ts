export const adsConfig = {
  clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.match(/ca-pub-\d+/)?.[0] ?? "",
  dashboardSlot: process.env.NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT?.match(/\d+/)?.[0] ?? "",
};

export const adForbiddenRoutes = [
  "/admin",
  "/api",
  "/entrar",
  "/cadastro",
  "/checkout",
  "/privacidade",
  "/termos",
  "/cookies",
  "/lgpd",
  "/visitante",
  "/convite",
  "/politica-de-cancelamento",
  "/cancelamento",
  "/tratamento-de-dados",
  "/uso-aceitavel",
  "/seguranca/reportar",
];

export const appAdForbiddenSegments = [
  "/assinatura",
  "/configuracoes",
  "/permissoes",
  "/seguranca",
  "/suporte",
  "/moradores",
  "/documentos",
  "/ocorrencias",
  "/perfil",
];

export function isAdRouteAllowed(pathname: string) {
  const normalized = pathname || "/";
  if (adForbiddenRoutes.some((route) => normalized === route || normalized.startsWith(`${route}/`))) {
    return false;
  }

  if (normalized.startsWith("/app/")) {
    return !appAdForbiddenSegments.some((segment) => normalized.includes(segment));
  }

  return true;
}

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  ads: boolean;
  updatedAt: string;
};

export const cookiePreferencesKey = "morai_cookie_preferences";

export function defaultCookiePreferences(): CookiePreferences {
  return {
    essential: true,
    analytics: false,
    ads: false,
    updatedAt: new Date().toISOString(),
  };
}
