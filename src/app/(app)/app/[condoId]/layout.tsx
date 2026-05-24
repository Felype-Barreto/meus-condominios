import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { FreePlanInterstitialAd } from "@/components/ads/FreePlanInterstitialAd";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CondoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;

  if (!uuidPattern.test(condoId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: condo } = await supabase
    .from("condominiums")
    .select("plan")
    .eq("id", condoId)
    .single();

  return (
    <>
      {children}
      <FreePlanInterstitialAd plan={condo?.plan} />
    </>
  );
}
