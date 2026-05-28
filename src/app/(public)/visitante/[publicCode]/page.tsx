import { ShieldCheck } from "lucide-react";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import { PublicQrContactForm } from "@/components/public/public-qr-contact-form";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PublicQrConfig = {
  found?: boolean;
  enabled?: boolean;
  condominium_name?: string;
  message?: string;
};

type PublicQrApartmentOption = {
  block_name: string | null;
  apartment_number: string;
  search_value: string;
  label: string;
};

export default async function VisitorPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_qr_config", {
    qr_public_code: publicCode,
  });
  const config = (data ?? {}) as PublicQrConfig;
  const available = config.found === true && config.enabled === true;
  const { data: apartmentOptionsData } = available
    ? await supabase.rpc("get_public_qr_apartments", {
        qr_public_code: publicCode,
      })
    : { data: [] };
  const apartmentOptions = (apartmentOptionsData ?? []) as PublicQrApartmentOption[];

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[220px_minmax(0,640px)_220px] lg:items-start">
        <aside className="hidden lg:block">
          <AdSenseSlot
            plan="free"
            pathname={`/visitante/${publicCode}`}
            label="Publicidade"
          />
        </aside>

        <div className="space-y-5">
          <Card className="p-5 text-center sm:p-7">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-primary">Meus Condomínios</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {config.condominium_name ?? "Contato do condomínio"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {available
                ? "Selecione a unidade ou chame a guarita/responsável."
                : "Este canal de contato não está disponível no momento."}
            </p>
            {available && config.message ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {config.message}
              </p>
            ) : null}
          </Card>

          {available ? (
            <PublicQrContactForm
              publicCode={publicCode}
              apartmentOptions={apartmentOptions}
            />
          ) : (
            <Card className="p-5 text-sm text-muted-foreground">
              O condomínio pode ter desativado temporariamente o QR público.
            </Card>
          )}

          <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
            Por segurança, o Meus Condomínios não exibe moradores ou telefones
            nesta página. Se o responsável autorizar, você receberá um link de contato.
          </p>
        </div>

        <aside className="hidden lg:block">
          <AdSenseSlot
            plan="free"
            pathname={`/visitante/${publicCode}`}
            label="Publicidade"
          />
        </aside>
      </section>
    </main>
  );
}
