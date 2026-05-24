"use client";

import { CalendarPlus, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function MobileQuickAction() {
  const pathname = usePathname();
  const condoId = pathname.match(/^\/app\/([^/]+)/)?.[1];

  if (!condoId || !uuidPattern.test(condoId)) return null;
  if (pathname.includes("/guarita")) return null;

  const action = pathname.includes("/agendamentos")
    ? {
        href: `/app/${condoId}/agendamentos`,
        label: "Nova reserva",
        icon: CalendarPlus,
      }
    : {
        href: `/app/${condoId}/solicitacoes`,
        label: "Nova solicitação",
        icon: Plus,
      };

  return (
    <Link
      href={action.href}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-[#7C5C3E]/25 active:scale-[0.98] lg:hidden"
    >
      <action.icon className="h-4 w-4" />
      {action.label}
    </Link>
  );
}
