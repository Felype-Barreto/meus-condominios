import Script from "next/script";
import { adsConfig } from "@/lib/ads";

export function AdSenseLoader() {
  if (!adsConfig.clientId) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsConfig.clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
