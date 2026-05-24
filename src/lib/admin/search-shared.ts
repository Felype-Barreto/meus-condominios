export type AdminSearchCategory =
  | "condominiums"
  | "users"
  | "subscriptions"
  | "support"
  | "abuse"
  | "lgpd"
  | "refunds"
  | "incidents";

export type AdminSearchResult = {
  id: string;
  category: AdminSearchCategory;
  title: string;
  description: string;
  href: string;
  status?: string | null;
  badge?: string | null;
};

const categoryLabels: Record<AdminSearchCategory, string> = {
  condominiums: "Condominios",
  users: "Usuarios",
  subscriptions: "Assinaturas",
  support: "Suporte",
  abuse: "Denuncias",
  lgpd: "LGPD",
  refunds: "Reembolsos",
  incidents: "Incidentes",
};

export function getAdminSearchCategoryLabel(category: AdminSearchCategory) {
  return categoryLabels[category];
}
