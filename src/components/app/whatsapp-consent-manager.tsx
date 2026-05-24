import { MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/status-badge";
import {
  type WhatsAppConsentCategories,
  whatsappConsentCategoryLabels,
  whatsappConsentCategoryKeys,
} from "@/lib/whatsapp/consent";

type WhatsAppConsentManagerProps = {
  condoId: string;
  phone: string;
  optedIn: boolean;
  categories: WhatsAppConsentCategories;
  allowPublicContact: boolean;
  allowWhatsAppRedirect: boolean;
  action: (formData: FormData) => Promise<void>;
};

export function WhatsAppConsentManager({
  condoId,
  phone,
  optedIn,
  categories,
  allowPublicContact,
  allowWhatsAppRedirect,
  action,
}: WhatsAppConsentManagerProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Avisos por WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Escolha exatamente quais avisos você aceita receber. Você pode
            revogar o consentimento a qualquer momento.
          </p>
        </div>
        <StatusBadge tone={optedIn ? "success" : "warning"}>
          {optedIn ? "Opt-in ativo" : "Opt-out"}
        </StatusBadge>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="condominium_id" value={condoId} />
        <div className="space-y-2">
          <Label htmlFor="notification-phone">Telefone com DDD</Label>
          <Input
            id="notification-phone"
            name="phone"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            defaultValue={phone}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use um número válido. O telefone não será exibido publicamente por padrão.
          </p>
        </div>

        <div className="space-y-3">
          {whatsappConsentCategoryKeys.map((key) => {
            const item = whatsappConsentCategoryLabels[key];
            return (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm"
              >
                <input
                  name={`whatsapp_${key}`}
                  type="checkbox"
                  defaultChecked={categories[key]}
                  className="mt-1 accent-[#7C5C3E]"
                />
                <span>
                  <span className="block font-medium text-foreground">{item.label}</span>
                  <span className="mt-1 block leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="rounded-lg border bg-muted p-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">QR público</p>
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <input
                name="allow_public_contact"
                type="checkbox"
                defaultChecked={allowPublicContact}
                className="mt-1 accent-[#7C5C3E]"
              />
              Permitir contato via QR público.
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <input
                name="allow_whatsapp_redirect"
                type="checkbox"
                defaultChecked={allowWhatsAppRedirect}
                className="mt-1 accent-[#7C5C3E]"
              />
              Permitir WhatsApp direto via QR quando autorizado.
            </label>
          </div>
        </div>

        <Button type="submit" className="min-h-11 w-full sm:w-auto">
          Salvar preferências
        </Button>
      </form>
    </Card>
  );
}
