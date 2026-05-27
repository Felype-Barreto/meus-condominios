import { QrCode } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAsaasPaymentPixQrCode } from "@/lib/billing/asaas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CopyPixButton } from "./copy-pix-button";

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatDate(value?: string | null) {
  if (!value) return "consulte no app do banco";
  return new Date(value).toLocaleString("pt-BR");
}

export default async function PremiumPixPaymentPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id,status,metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const metadata = metadataOf(subscription?.metadata);
  const paymentId =
    typeof metadata.checkout_payment_id === "string"
      ? metadata.checkout_payment_id
      : null;
  const billingType =
    typeof metadata.billing_type === "string" ? metadata.billing_type : null;
  const invoiceUrl =
    typeof metadata.checkout_invoice_url === "string"
      ? metadata.checkout_invoice_url
      : null;

  if (!subscription || billingType !== "PIX" || !paymentId) {
    redirect("/app/assinatura/checkout?plano=premium");
  }

  let pixQrCode: Awaited<ReturnType<typeof getAsaasPaymentPixQrCode>> | null = null;
  let pixError: string | null = null;

  try {
    pixQrCode = await getAsaasPaymentPixQrCode(paymentId);
  } catch (error) {
    pixError =
      error instanceof Error
        ? error.message
        : "Não foi possível recuperar o Pix no Asaas.";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Plano Premium</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Pagar com Pix
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Escaneie o QR Code ou copie o Pix copia e cola. O Premium é liberado
              automaticamente quando o Asaas confirmar o pagamento.
            </p>
          </div>
        </div>

        {pixError ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            {pixError}
          </div>
        ) : null}

        {pixQrCode?.encodedImage ? (
          <div className="mt-6 flex justify-center rounded-xl border bg-white p-5">
            <img
              src={`data:image/png;base64,${pixQrCode.encodedImage}`}
              alt="QR Code Pix do plano Premium"
              className="h-64 w-64"
            />
          </div>
        ) : null}

        {pixQrCode?.payload ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold">Pix copia e cola</p>
            <div className="break-all rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              {pixQrCode.payload}
            </div>
            <CopyPixButton payload={pixQrCode.payload} />
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
          Vencimento: {formatDate(pixQrCode?.expirationDate)}. Se pagar e não
          liberar em poucos minutos, aguarde o webhook do Asaas ou confira o
          histórico financeiro no admin.
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {invoiceUrl ? (
            <Button asChild>
              <Link href={invoiceUrl}>Abrir no Asaas</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/app/assinatura">Voltar para assinatura</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
