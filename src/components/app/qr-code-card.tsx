"use client";

import { Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const qrMarkup = new XMLSerializer().serializeToString(svg);
    const qrDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrMarkup)}`;
    const posterWindow = window.open("", "_blank", "width=900,height=1100");
    if (!posterWindow) return;

    const safeCondoName = escapeHtml(condoName ?? title);
    const safeValue = escapeHtml(value);

    posterWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>QR Code - ${safeCondoName}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #fff7ed;
      background: #100b08;
    }
    .poster {
      min-height: calc(297mm - 28mm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      border: 2px solid #c49a6c;
      border-radius: 24px;
      background:
        radial-gradient(circle at top left, rgba(196,154,108,.22), transparent 34%),
        linear-gradient(160deg, #19110c 0%, #120d09 55%, #24170f 100%);
      padding: 34px;
      text-align: center;
      overflow: hidden;
    }
    .top {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: #f5d7b5;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .02em;
    }
    .mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #c49a6c;
      color: #16100c;
      font-weight: 900;
      font-size: 22px;
    }
    .site { color: #c49a6c; }
    .headline { width: 100%; }
    .eyebrow {
      margin: 0 0 12px;
      color: #c49a6c;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    h1 {
      margin: 0 auto;
      max-width: 680px;
      font-size: 42px;
      line-height: 1.06;
      letter-spacing: 0;
    }
    .condo {
      margin: 18px auto 0;
      max-width: 690px;
      color: #f7e6d1;
      font-size: 30px;
      font-weight: 900;
      line-height: 1.15;
    }
    .qr-wrap {
      display: grid;
      place-items: center;
      width: 100%;
    }
    .qr {
      border: 8px solid #c49a6c;
      border-radius: 26px;
      background: #fff;
      padding: 26px;
      box-shadow: 0 24px 70px rgba(0,0,0,.28);
    }
    .qr img { width: 315px; height: 315px; display: block; }
    .steps {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      text-align: left;
    }
    .step {
      min-height: 92px;
      border: 1px solid rgba(196,154,108,.48);
      border-radius: 16px;
      background: rgba(255,247,237,.06);
      padding: 16px;
    }
    .step strong {
      display: block;
      color: #f5d7b5;
      font-size: 15px;
      margin-bottom: 6px;
    }
    .step span {
      color: #f7e6d1;
      font-size: 14px;
      line-height: 1.35;
    }
    .footer {
      width: 100%;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 18px;
      text-align: left;
      color: #f7e6d1;
      font-size: 13px;
      line-height: 1.45;
    }
    .cta {
      min-width: 220px;
      border-radius: 999px;
      background: #c49a6c;
      color: #16100c;
      padding: 14px 18px;
      text-align: center;
      font-size: 16px;
      font-weight: 900;
    }
    .url { overflow-wrap: anywhere; color: #e7c9a8; font-size: 11px; }
  </style>
</head>
<body>
  <main class="poster">
    <div class="top">
      <div class="mark"><span class="logo">M</span><span>Meus Condomínios</span></div>
      <div class="site">meuscondominios.site</div>
    </div>
    <section class="headline">
      <p class="eyebrow">Acesso de visitantes</p>
      <h1>Fale com um apartamento pelo QR Code</h1>
      <p class="condo">${safeCondoName}</p>
    </section>
    <section class="qr-wrap">
      <div class="qr"><img src="${qrDataUri}" alt="QR Code do condomínio" /></div>
    </section>
    <section class="steps" aria-label="Como usar">
      <div class="step"><strong>1. Leia o QR Code</strong><span>Aponte a câmera do celular para abrir a página segura.</span></div>
      <div class="step"><strong>2. Informe o apartamento</strong><span>Digite bloco e apartamento que deseja chamar.</span></div>
      <div class="step"><strong>3. Aguarde autorização</strong><span>O contato depende do morador e das regras do condomínio.</span></div>
    </section>
    <footer class="footer">
      <div>
        <strong>Privacidade em primeiro lugar.</strong><br />
        O QR não lista moradores, telefones ou dados pessoais publicamente.
        <div class="url">${safeValue}</div>
      </div>
      <div class="cta">Acesse já</div>
    </footer>
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
