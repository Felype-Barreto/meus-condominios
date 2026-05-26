import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const adminHits = new Map<string, { count: number; resetAt: number }>();

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accountAppSegments = new Set([
  "assinatura",
  "condominios",
  "configuracoes",
  "meus-dados",
  "notificacoes",
  "novo-condominio",
  "suporte",
]);

function parseList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function adminHostAllowed(request: NextRequest) {
  const allowedHosts = parseList(process.env.ADMIN_ALLOWED_HOSTS);
  if (!allowedHosts.size) return true;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  return Boolean(host && allowedHosts.has(host));
}

function adminRateLimited(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const key = `admin:${ip}`;
  const now = Date.now();
  const current = adminHits.get(key);

  if (!current || current.resetAt <= now) {
    adminHits.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return false;
  }

  current.count += 1;
  return current.count > 120;
}

async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSupabaseSession(request);
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  if (segments[0] === "admin") {
    if (!adminHostAllowed(request)) {
      return new NextResponse("Página não encontrada.", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex, nofollow, noarchive",
          "cache-control": "no-store",
        },
      });
    }

    if (adminRateLimited(request)) {
      return new NextResponse("Muitas tentativas. Aguarde alguns minutos.", {
        status: 429,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-robots-tag": "noindex, nofollow, noarchive",
          "cache-control": "no-store",
          "retry-after": "300",
        },
      });
    }

    sessionResponse.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    sessionResponse.headers.set("cache-control", "no-store, max-age=0");
    return sessionResponse;
  }

  const condoId = segments[1];

  if (segments[0] !== "app" || !condoId || accountAppSegments.has(condoId)) {
    return sessionResponse;
  }

  if (!uuidPattern.test(condoId)) {
    return new NextResponse("Página não encontrada.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image).*)",
  ],
};
