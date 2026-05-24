"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { DispatchSafetyResult } from "@/lib/communication/safety";

export function SafetyAlert({
  safety,
  onUseSafeVersion,
  onRemoveGroups,
  onPrivateOnly,
}: {
  safety: DispatchSafetyResult;
  onUseSafeVersion: () => void;
  onRemoveGroups: () => void;
  onPrivateOnly: () => void;
}) {
  if (!safety.risks.length) {
    return (
      <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Mensagem segura para os canais selecionados</p>
          <p className="mt-1">Nenhum risco sensível foi detectado para grupos ou canais públicos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Risco de vazamento detectado</p>
            <StatusBadge tone={safety.allowed ? "warning" : "error"}>
              {safety.allowed ? "Atenção" : "Bloqueado para grupos"}
            </StatusBadge>
          </div>
          <div className="mt-3 space-y-2">
            {safety.risks.slice(0, 4).map((risk, index) => (
              <p key={`${risk.key}-${risk.channelId ?? index}`} className="text-sm">
                <strong>{risk.channelName ? `${risk.channelName}: ` : ""}{risk.label}</strong>. {risk.suggestion}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onUseSafeVersion}>
          Usar versão segura para grupo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onRemoveGroups}>
          Remover canais de grupo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onPrivateOnly}>
          Enviar apenas no app/privado
        </Button>
      </div>
    </div>
  );
}
