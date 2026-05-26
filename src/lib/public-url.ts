export function cleanEnvValue(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, "") ?? "";
}

export function getPublicAppUrl(fallback = "https://meuscondominios.site") {
  const raw = cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL) || fallback;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin.replace(/\/+$/, "");
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

export function buildPublicUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}
