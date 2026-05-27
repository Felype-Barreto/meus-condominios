"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyPixButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
      }}
    >
      <Copy className="h-4 w-4" />
      {copied ? "Pix copiado" : "Copiar Pix"}
    </Button>
  );
}
