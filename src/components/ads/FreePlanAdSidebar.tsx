"use client";

import { usePathname } from "next/navigation";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import { isAdRouteAllowed } from "@/lib/ads";

export function FreePlanAdSidebar({ plan }: { plan?: string | null }) {
  const pathname = usePathname();

  if (plan !== "free" || !isAdRouteAllowed(pathname)) return null;

  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 self-start xl:block">
      <AdSenseSlot plan={plan} pathname={pathname} />
    </aside>
  );
}
