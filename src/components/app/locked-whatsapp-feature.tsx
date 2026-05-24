import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LockedWhatsAppFeature({
  condoId,
  condominiumName,
  title,
  description,
}: {
  condoId: string;
  condominiumName?: string | null;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condominiumName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-muted/45" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Recurso bloqueado</h2>
                <StatusBadge tone="warning">Pro e Total em breve</StatusBadge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Esta parte ficará suspensa no lançamento. Por enquanto, use o
                WhatsApp manual para gerar mensagens e compartilhar com controle
                total da administração.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/app/${condoId}/whatsapp`}>Ir para WhatsApp manual</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
