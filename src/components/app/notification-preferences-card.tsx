import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function NotificationPreferencesCard() {
  return (
    <Card className="p-5">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <h2 className="mt-4 text-lg font-semibold">Como funciona</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Você pode ativar ou desativar avisos pelo WhatsApp quando quiser.
          Comunicados importantes continuam disponíveis dentro do Meus Condomínios.
        </p>
        <p>
          Seu telefone não aparece publicamente por padrão. O QR público cria
          uma solicitação de contato controlada, sem listar moradores.
        </p>
        <p>
          O envio automático depende do plano do condomínio, créditos
          disponíveis e configuração técnica. Sem autorização, o Meus Condomínios não
          envia WhatsApp automático para você.
        </p>
      </div>
    </Card>
  );
}
