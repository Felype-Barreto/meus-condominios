"use client";

import { useEffect, useState } from "react";
import {
  adsConfig,
  cookiePreferencesKey,
  defaultCookiePreferences,
  isAdRouteAllowed,
  type CookiePreferences,
} from "@/lib/ads";

function readPreferences(): CookiePreferences {
  if (typeof window === "undefined") return defaultCookiePreferences();

  try {
    const stored = window.localStorage.getItem(cookiePreferencesKey);
    if (!stored) return defaultCookiePreferences();
    return { ...defaultCookiePreferences(), ...JSON.parse(stored) };
  } catch {
    return defaultCookiePreferences();
  }
}

export function useCanShowAds({
  plan,
  pathname,
  safePlacement = true,
}: {
  plan?: string | null;
  pathname?: string;
  safePlacement?: boolean;
}) {
  const [preferences, setPreferences] = useState<CookiePreferences>(() =>
    readPreferences(),
  );

  useEffect(() => {
    function refresh() {
      setPreferences(readPreferences());
    }

    window.addEventListener("morai:cookies-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("morai:cookies-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return Boolean(
    plan === "free" &&
      safePlacement &&
      isAdRouteAllowed(pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/")) &&
      preferences.ads &&
      adsConfig.clientId,
  );
}
