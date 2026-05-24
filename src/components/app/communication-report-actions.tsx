"use client";

import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommunicationReportActions({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const text = `${title}\n\n${body}`;

  async function copy() {
    await navigator.clipboard?.writeText(text);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }

    await copy();
  }

  return (
    <>
      <Button variant="outline" type="button" onClick={copy}>
        <Copy className="h-4 w-4" />
        Copiar mensagem
      </Button>
      <Button variant="outline" type="button" onClick={share}>
        <Share2 className="h-4 w-4" />
        Compartilhar manualmente
      </Button>
    </>
  );
}
