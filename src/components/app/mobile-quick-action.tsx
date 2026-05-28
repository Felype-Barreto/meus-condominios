"use client";

import { CalendarPlus, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function MobileQuickAction() {
  const pathname = usePathname();
  const condoId = pathname.match(/^\/app\/([^/]+)/)?.[1];
  const [canCreateBooking, setCanCreateBooking] = useState(false);
  const [canCreateTicket, setCanCreateTicket] = useState(false);

  useEffect(() => {
    if (!condoId || !uuidPattern.test(condoId)) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user) return;

      Promise.all([
        supabase.rpc("has_permission", {
          condo_id: condoId,
          permission_key: "bookings.create",
        }),
        supabase.rpc("has_permission", {
          condo_id: condoId,
          permission_key: "tickets.create",
        }),
      ]).then(([booking, ticket]) => {
        if (cancelled) return;
        setCanCreateBooking(booking.data === true);
        setCanCreateTicket(ticket.data === true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [condoId]);

  if (!condoId || !uuidPattern.test(condoId)) return null;
  if (pathname.includes("/guarita")) return null;

  const action = pathname.includes("/agendamentos")
    ? canCreateBooking
      ? {
          href: `/app/${condoId}/agendamentos`,
          label: "Nova reserva",
          icon: CalendarPlus,
        }
      : null
    : canCreateTicket
      ? {
          href: `/app/${condoId}/solicitacoes`,
          label: "Nova solicitação",
          icon: Plus,
        }
      : null;

  if (!action) return null;

  return (
    <Link
      href={action.href}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.65rem)] right-4 z-30 inline-flex min-h-12 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-[#7C5C3E]/25 active:scale-[0.98] lg:hidden"
    >
      <action.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{action.label}</span>
    </Link>
  );
}
