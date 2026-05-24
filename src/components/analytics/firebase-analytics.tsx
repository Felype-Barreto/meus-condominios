"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cookiePreferencesKey, defaultCookiePreferences, type CookiePreferences } from "@/lib/ads";
import { setFirebaseAnalyticsEnabled, trackFirebasePageView } from "@/lib/firebase/client";

function readAnalyticsConsent() {
  if (typeof window === "undefined") return false;

  try {
    const stored = window.localStorage.getItem(cookiePreferencesKey);
    if (!stored) return false;

    const preferences = {
      ...defaultCookiePreferences(),
      ...JSON.parse(stored),
    } as CookiePreferences;

    return preferences.analytics;
  } catch {
    return false;
  }
}

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    function syncConsent() {
      setEnabled(readAnalyticsConsent());
    }

    syncConsent();
    window.addEventListener("morai:cookies-updated", syncConsent);

    return () => window.removeEventListener("morai:cookies-updated", syncConsent);
  }, []);

  useEffect(() => {
    setFirebaseAnalyticsEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    trackFirebasePageView(pathname);
  }, [enabled, pathname]);

  return null;
}
