"use client";

import { Building2, CreditCard, Settings, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sidebarItems } from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const residentItems = new Set([
  "dashboard",
  "comunicados",
  "agendamentos",
  "areas-comuns",
  "solicitacoes",
  "encomendas",
]);
const doormanItems = new Set(["dashboard", "guarita", "historico", "encomendas", "ocorrencias", "suporte"]);
const staffItems = new Set(sidebarItems.map((item) => item.href));
const permissionByItem: Record<string, string> = {
  apartamentos: "apartments.view_grid",
  moradores: "residents.view",
  sindico: "settings.view",
  guarita: "gate.view_panel",
  comunicados: "announcements.view",
  agendamentos: "bookings.view_all",
  "areas-comuns": "bookings.create",
  solicitacoes: "tickets.view_all",
  encomendas: "packages.view_all",
  ocorrencias: "incidents.create",
  permissoes: "settings.roles",
  historico: "gate.view_panel",
};

function useActiveCondoId(fallback: string) {
  const pathname = usePathname();
  const segment = pathname.match(/^\/app\/([^/]+)/)?.[1] ?? fallback;
  return uuidPattern.test(segment) ? segment : "";
}

function RailLabel({
  rail,
  children,
}: {
  rail: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "truncate whitespace-nowrap",
        rail &&
          "w-0 overflow-hidden opacity-0 transition-all group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100",
      )}
    >
      {children}
    </span>
  );
}

function navLinkClass(rail: boolean, active = false) {
  return cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
    rail &&
      "justify-center group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start",
    active && "bg-muted text-foreground",
  );
}

export function Sidebar({
  condoId = "",
  isPlatformAdmin = false,
}: {
  condoId?: string;
  isPlatformAdmin?: boolean;
}) {
  const activeCondoId = useActiveCondoId(condoId);
  const pathname = usePathname();

  return (
    <aside className="group/sidebar sticky top-0 hidden h-screen w-16 shrink-0 overflow-hidden border-r bg-card transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 lg:flex lg:flex-col">
      <SidebarContent
        condoId={activeCondoId}
        isPlatformAdmin={isPlatformAdmin}
        pathname={pathname}
        rail
      />
    </aside>
  );
}

export function SidebarContent({
  condoId,
  isPlatformAdmin = false,
  pathname,
  onNavigate,
  rail = false,
}: {
  condoId: string;
  isPlatformAdmin?: boolean;
  pathname: string;
  onNavigate?: () => void;
  rail?: boolean;
}) {
  const hasCondo = uuidPattern.test(condoId);
  const [role, setRole] = useState<string | null>(null);
  const [permissionItems, setPermissionItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!hasCondo) return;
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
          if (!cancelled) setRole(data?.role ?? null);
        });

      Promise.all(
        Object.entries(permissionByItem).map(async ([href, permission]) => {
          const { data } = await supabase.rpc("has_permission", {
            condo_id: condoId,
            permission_key: permission,
          });
          return [href, data === true] as const;
        }),
      ).then((results) => {
        if (cancelled) return;
        setPermissionItems(new Set(results.filter(([, allowed]) => allowed).map(([href]) => href)));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [condoId, hasCondo]);

  const accountLinksVisible = role === "subscriber_admin" || role === "admin";

  const visibleItems = useMemo(() => {
    const allowed =
      role === null
        ? new Set<string>()
        : role === "resident" || role === "owner"
          ? residentItems
          : role === "doorman"
            ? doormanItems
            : staffItems;

    const merged =
      role === "resident" || role === "owner"
        ? allowed
        : new Set([...allowed, ...permissionItems]);
    return sidebarItems.filter((item) => merged.has(item.href));
  }, [permissionItems, role]);

  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b",
          rail
            ? "justify-center px-3 group-hover/sidebar:justify-start group-hover/sidebar:px-5 group-focus-within/sidebar:justify-start group-focus-within/sidebar:px-5"
            : "px-5 pr-14",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-[#7C5C3E]/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div
          className={cn(
            "min-w-0 whitespace-nowrap",
            rail &&
              "pointer-events-none w-0 overflow-hidden opacity-0 transition-all group-hover/sidebar:pointer-events-auto group-hover/sidebar:w-44 group-hover/sidebar:opacity-100 group-focus-within/sidebar:pointer-events-auto group-focus-within/sidebar:w-44 group-focus-within/sidebar:opacity-100",
          )}
        >
          <p className="truncate font-semibold">Meus Condomínios</p>
          <p className="truncate text-xs text-muted-foreground">Painel do condomínio</p>
        </div>
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain",
          rail ? "p-2 group-hover/sidebar:p-4 group-focus-within/sidebar:p-4" : "p-4",
        )}
      >
        {hasCondo
          ? visibleItems.map((item) => {
              const href = `/app/${condoId}/${item.href}`;
              const active = pathname.startsWith(href);

              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onNavigate}
                  title={item.label}
                  className={navLinkClass(rail, active)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <RailLabel rail={rail}>{item.label}</RailLabel>
                </Link>
              );
            })
          : null}
      </nav>

      <div
        className={cn(
          "shrink-0 space-y-1 border-t",
          rail ? "p-2 group-hover/sidebar:p-4 group-focus-within/sidebar:p-4" : "p-4",
        )}
      >
        {accountLinksVisible ? (
          <>
        <Link
          href="/app/condominios"
          onClick={onNavigate}
          title="Condomínios"
          className={navLinkClass(rail, pathname.startsWith("/app/condominios") || pathname === "/app")}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <RailLabel rail={rail}>Condomínios</RailLabel>
        </Link>
        <Link
          href="/app/assinatura"
          onClick={onNavigate}
          title="Assinatura"
          className={navLinkClass(rail, pathname.startsWith("/app/assinatura"))}
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          <RailLabel rail={rail}>Assinatura</RailLabel>
        </Link>
        <Link
          href="/app/configuracoes"
          onClick={onNavigate}
          title="Configurações"
          className={navLinkClass(rail, pathname.startsWith("/app/configuracoes"))}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <RailLabel rail={rail}>Configurações</RailLabel>
        </Link>
          </>
        ) : null}
        {isPlatformAdmin ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            title="Admin"
            className={navLinkClass(rail, pathname.startsWith("/admin"))}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <RailLabel rail={rail}>Admin</RailLabel>
          </Link>
        ) : null}
      </div>
    </>
  );
}
