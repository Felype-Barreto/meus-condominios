"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  History,
  Home,
  KeyRound,
  Megaphone,
  MoreHorizontal,
  Package,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MobileRole = "admin" | "syndic" | "doorman" | "resident" | "owner";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const roleGroups: Record<MobileRole, Array<{ href: string; label: string; icon: typeof Home }>> = {
  resident: [
    { href: "dashboard", label: "Painel", icon: Home },
    { href: "comunicados", label: "Avisos", icon: Megaphone },
    { href: "agendamentos", label: "Agenda", icon: CalendarDays },
    { href: "solicitacoes", label: "Solicitar", icon: ClipboardList },
    { href: "perfil/notificacoes", label: "Alertas", icon: Bell },
  ],
  owner: [
    { href: "dashboard", label: "Painel", icon: Home },
    { href: "comunicados", label: "Avisos", icon: Megaphone },
    { href: "agendamentos", label: "Agenda", icon: CalendarDays },
    { href: "solicitacoes", label: "Solicitar", icon: ClipboardList },
    { href: "perfil/notificacoes", label: "Alertas", icon: Bell },
  ],
  admin: [
    { href: "dashboard", label: "Painel", icon: Home },
    { href: "apartamentos", label: "Aptos", icon: Building2 },
    { href: "moradores", label: "Pessoas", icon: UsersRound },
    { href: "comunicados", label: "Avisos", icon: Megaphone },
    { href: "configuracoes", label: "Mais", icon: MoreHorizontal },
  ],
  syndic: [
    { href: "dashboard", label: "Painel", icon: Home },
    { href: "apartamentos", label: "Aptos", icon: Building2 },
    { href: "moradores", label: "Pessoas", icon: UsersRound },
    { href: "comunicados", label: "Avisos", icon: Megaphone },
    { href: "configuracoes", label: "Mais", icon: MoreHorizontal },
  ],
  doorman: [
    { href: "dashboard", label: "Painel", icon: Home },
    { href: "guarita", label: "Buscar", icon: Search },
    { href: "encomendas", label: "Pacotes", icon: Package },
    { href: "historico", label: "Histórico", icon: History },
    { href: "ocorrencias", label: "Ocorr.", icon: KeyRound },
  ],
};

function normalizeRole(role?: string | null): MobileRole {
  if (role === "resident" || role === "owner" || role === "doorman" || role === "syndic") {
    return role;
  }
  if (role === "admin" || role === "subscriber_admin") return "admin";
  return "resident";
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const condoId = pathname.match(/^\/app\/([^/]+)/)?.[1];
  const [role, setRole] = useState<MobileRole>("resident");

  useEffect(() => {
    if (!condoId || !uuidPattern.test(condoId)) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user) return;

      supabase
        .from("memberships")
        .select("role")
        .eq("condominium_id", condoId)
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setRole(normalizeRole(data?.role));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [condoId]);

  const items = useMemo(() => roleGroups[role], [role]);

  if (!condoId || !uuidPattern.test(condoId)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_28px_rgba(17,24,39,0.08)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-flow-col auto-cols-fr gap-1">
        {items.map((item) => {
          const href = `/app/${condoId}/${item.href}`;
          const active = pathname.startsWith(href);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={href}
              className={cn(
                "flex min-h-[3.65rem] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.67rem] font-semibold text-muted-foreground active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-muted text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
