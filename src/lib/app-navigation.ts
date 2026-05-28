import { sidebarItems } from "@/lib/app-data";

export type AppNavItem = (typeof sidebarItems)[number];

export const alwaysVisibleCondoItems = new Set(["dashboard"]);

export const adminOnlyCondoItems = new Set(["suporte"]);

export const permissionsByCondoItem: Record<string, string[]> = {
  historico: ["audit_logs.view", "syndic.view_history", "public_qr.view_logs"],
  apartamentos: ["apartments.view_grid"],
  moradores: ["residents.view"],
  sindico: ["syndic.view", "syndic.invite", "syndic.change", "syndic.remove"],
  guarita: ["gate.view_panel"],
  comunicados: ["announcements.view"],
  agendamentos: ["bookings.view", "bookings.view_all", "bookings.create"],
  "areas-comuns": ["common_areas.view"],
  solicitacoes: ["tickets.view_own", "tickets.view_all", "tickets.create"],
  encomendas: ["packages.view_own", "packages.view_all", "packages.create"],
  ocorrencias: ["incidents.create", "incidents.review", "gate.create_incident"],
  permissoes: ["settings.roles"],
};

export const mobileNavPriority = [
  "dashboard",
  "apartamentos",
  "moradores",
  "guarita",
  "comunicados",
  "agendamentos",
  "areas-comuns",
  "solicitacoes",
  "encomendas",
  "ocorrencias",
  "historico",
  "permissoes",
  "suporte",
];

export const mobileLabelByItem: Record<string, string> = {
  dashboard: "Painel",
  apartamentos: "Aptos",
  moradores: "Pessoas",
  comunicados: "Avisos",
  agendamentos: "Agenda",
  solicitacoes: "Solicitar",
  encomendas: "Pacotes",
  ocorrencias: "Ocorr.",
};

export function filterCondoNavigationItems({
  admin,
  allowedItems,
}: {
  admin: boolean;
  allowedItems: Set<string>;
}) {
  if (admin) return sidebarItems;

  return sidebarItems.filter((item) => {
    if (alwaysVisibleCondoItems.has(item.href)) return true;
    if (adminOnlyCondoItems.has(item.href)) return false;
    return allowedItems.has(item.href);
  });
}

export function sortMobileItems(items: AppNavItem[]) {
  const priority = new Map(mobileNavPriority.map((href, index) => [href, index]));

  return [...items]
    .sort(
      (left, right) =>
        (priority.get(left.href) ?? Number.MAX_SAFE_INTEGER) -
        (priority.get(right.href) ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 5);
}
