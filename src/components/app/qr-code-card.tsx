"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";

export function QRCodeCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="rounded-lg border bg-white p-3">
          <QRCodeSVG value={value} size={116} fgColor="#111827" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 break-all text-sm text-muted-foreground">{value}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Use este QR Code na portaria para visitantes solicitarem contato com um apartamento. O Meus Condomínios apenas registra
            e encaminha a solicitação; a liberação de contato depende do morador e das regras do condomínio.
          </p>
        </div>
      </div>
    </Card>
  );
}
