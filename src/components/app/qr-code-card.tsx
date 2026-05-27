"use client";

import { Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function QRCodeCard({
  title,
  value,
  condoName,
}: {
  title: string;
  value: string;
  condoName?: string;
}) {
  const qrRef = useRef<HTMLDivElement>(null);

  function openPrintPoster() {
    const qrMarkup = qrRef.current?.querySelector("svg")?.outerHTML;
    if (!qrMarkup) return;

    const posterWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
    if (!posterWindow) return;

    posterWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>QR Code - ${condoName ?? "Meus Condomínios"}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      background: #f5efe6;
    }
    .poster {
      min-height: calc(297mm - 36mm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      border: 2px solid #7c5c3e;
      border-radius: 18px;
      background: #fffaf3;
      padding: 36px;
      text-align: center;
    }
    .brand { color: #7c5c3e; font-size: 18px; font-weight: 700; }
    h1 { margin: 0; font-size: 36px; line-height: 1.1; }
    .condo { margin: 0; font-size: 22px; font-weight: 700; }
    .qr { border: 1px solid #e7dccb; border-radius: 18px; background: #fff; padding: 24px; }
    .qr svg { width: 280px; height: 280px; }
    .hint { max-width: 520px; margin: 0; font-size: 18px; line-height: 1.5; }
    .url { max-width: 520px; overflow-wrap: anywhere; font-size: 12px; color: #4b5563; }
    .footer { margin-top: 8px; font-size: 13px; color: #4b5563; }
  </style>
</head>
<body>
  <main class="poster">
    <div class="brand">Meus Condomínios</div>
    <h1>Visitante, fale com o condomínio pelo QR Code</h1>
    <p class="condo">${condoName ?? title}</p>
    <div class="qr">${qrMarkup}</div>
    <p class="hint">Aponte a câmera do celular, informe o apartamento desejado e aguarde o contato autorizado pelo condomínio.</p>
    <p class="url">${value}</p>
    <p class="footer">Seus dados não ficam expostos publicamente. O contato depende das regras do condomínio.</p>
  </main>
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`);
    posterWindow.document.close();
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div ref={qrRef} className="rounded-lg border bg-white p-3">
          <QRCodeSVG value={value} size={116} fgColor="#111827" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 break-all text-sm text-muted-foreground">{value}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Use este QR Code na portaria para visitantes solicitarem contato com um apartamento. O Meus Condomínios apenas registra
            e encaminha a solicitação; a liberação de contato depende do morador e das regras do condomínio.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={openPrintPoster}>
            <Download className="h-4 w-4" />
            Baixar cartaz PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}
