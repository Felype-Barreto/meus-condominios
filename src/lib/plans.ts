import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlanId = "free" | "premium" | "pro" | "total";

export type PlanLimitCheck = {
  key: string;
  allowed: boolean;
  used: number;
  limit: number;
  percent: number;
  warn: boolean;
  blocked: boolean;
  file_size_mb?: number;
};

export type CurrentUsage = {
  blocks: number;
  apartments: number;
  admins: number;
  syndics: number;
  doormen: number;
  common_areas: number;
  bookings_month: number;
  tickets_month: number;
  announcements_month: number;
  packages_month: number;
  storage_mb: number;
};

export type CondominiumCreationEntitlement = {
  plan: PlanId;
  planLabel: string;
  limits: (typeof plans)[PlanId]["limits"];
  currentUsage: {
    ownedCondominiums: number;
    activeCondominiums: number;
  };
  canCreate: boolean;
  blockedReason: string | null;
  subscriptionStatus: string;
};

export const plans = {
  free: {
    id: "free",
    name: "Grátis",
    monthlyPrice: "R$ 0",
    annualPrice: null,
    description: "Bom para começar sem custo, com WhatsApp manual e limites de segurança.",
    featured: false,
    limits: {
      blocks: 2,
      condominiums: 1,
      apartmentsPerBlock: 24,
      totalApartments: 24,
      admins: 1,
      syndics: 1,
      doormen: 0,
      commonAreas: 2,
      bookingsPerMonth: 20,
      ticketsPerMonth: 30,
      announcementsPerMonth: 20,
      packagesPerMonth: 10,
      storageMb: 30,
      whatsappCredits: 0,
      communicationChannels: 1,
      uploadFileMb: 2,
      calendarDays: 60,
    },
    features: [
      "2 blocos e até 24 apartamentos",
      "1 condomínio por conta",
      "1 admin e 1 síndico",
      "sem guarita/cancela",
      "2 áreas comuns",
      "WhatsApp manual e 1 canal",
      "30 MB de armazenamento",
      "calendário até 60 dias à frente",
      "AdSense ativo quando configurado",
      "com marca Meus Condomínios",
      "sem relatórios avançados",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPrice: "R$ 39,90",
    annualPrice: null,
    description: "Para condomínios pequenos que precisam tirar anúncios e organizar melhor a rotina.",
    featured: true,
    limits: {
      blocks: 2,
      condominiums: 2,
      apartmentsPerBlock: 24,
      totalApartments: 24,
      admins: 2,
      syndics: 2,
      doormen: 1,
      commonAreas: 5,
      bookingsPerMonth: 150,
      ticketsPerMonth: 250,
      announcementsPerMonth: 150,
      packagesPerMonth: 250,
      storageMb: 500,
      whatsappCredits: 0,
      communicationChannels: 2,
      uploadFileMb: 5,
      calendarDays: 180,
    },
    features: [
      "2 blocos e até 24 apartamentos",
      "2 condomínios por conta",
      "1 guarita/cancela",
      "500 MB de armazenamento",
      "WhatsApp manual, sem envio automático",
      "2 canais manuais",
      "permissões por toggle",
      "calendário até 6 meses à frente",
      "sem anúncios",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: "R$ 99,90",
    annualPrice: null,
    description: "Para condomínios médios com relatórios, exportação e mais canais.",
    featured: false,
    limits: {
      blocks: 8,
      condominiums: 5,
      apartmentsPerBlock: 240,
      totalApartments: 240,
      admins: 6,
      syndics: 6,
      doormen: 3,
      commonAreas: 15,
      bookingsPerMonth: 800,
      ticketsPerMonth: 1500,
      announcementsPerMonth: 800,
      packagesPerMonth: 1500,
      storageMb: 3000,
      whatsappCredits: 500,
      communicationChannels: 6,
      uploadFileMb: 10,
      calendarDays: 365,
    },
    features: [
      "8 blocos e até 240 apartamentos",
      "5 condomínios por conta",
      "3 guaritas/cancelas",
      "3 GB de armazenamento",
      "500 créditos WhatsApp/mês",
      "até 6 canais/grupos",
      "relatórios",
      "exportação CSV",
      "calendário até 12 meses à frente",
    ],
  },
  total: {
    id: "total",
    name: "Total",
    monthlyPrice: "R$ 249,90",
    annualPrice: null,
    description: "Para operações maiores com automação avançada e relatórios completos.",
    featured: false,
    limits: {
      blocks: 20,
      condominiums: 20,
      apartmentsPerBlock: 1000,
      totalApartments: 1000,
      admins: 20,
      syndics: 20,
      doormen: 10,
      commonAreas: 100,
      bookingsPerMonth: 5000,
      ticketsPerMonth: 10000,
      announcementsPerMonth: 5000,
      packagesPerMonth: 10000,
      storageMb: 20000,
      whatsappCredits: 2000,
      communicationChannels: 20,
      uploadFileMb: 25,
      calendarDays: 730,
    },
    features: [
      "até 20 blocos",
      "até 20 condomínios por conta",
      "até 1000 apartamentos",
      "10 guaritas/cancelas",
      "20 GB de armazenamento",
      "2.000 créditos WhatsApp/mês",
      "até 20 canais/grupos",
      "multi-grupos avançado",
      "relatórios completos",
      "exportação CSV/PDF",
      "calendário até 24 meses à frente",
    ],
  },
} as const satisfies Record<PlanId, unknown>;

export function getPlanLimits(plan: PlanId) {
  return plans[plan].limits;
}

function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in plans;
}

export async function getUserCurrentPlan(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,plan,status,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !isPlanId(data.plan) || data.plan === "free") {
    return {
      plan: "free" as const,
      status: error ? "unavailable" : data?.status ?? "free",
      subscriptionId: null,
      active: false,
    };
  }

  const expired = data.current_period_end
    ? new Date(data.current_period_end).getTime() < Date.now()
    : false;

  if (expired) {
    return {
      plan: "free" as const,
      status: "expired",
      subscriptionId: data.id,
      active: false,
    };
  }

  return {
    plan: data.plan,
    status: data.status,
    subscriptionId: data.id,
    active: true,
  };
}

export async function getCondominiumCreationEntitlement(
  userId: string,
): Promise<CondominiumCreationEntitlement> {
  const supabase = await createSupabaseServerClient();
  const [subscription, { count: ownedCondominiums }, { count: activeCondominiums }] =
    await Promise.all([
      getUserCurrentPlan(userId),
      supabase
        .from("condominiums")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", userId),
      supabase
        .from("condominiums")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", userId)
        .not("subscription_status", "in", "(canceled,blocked,pending_deletion)"),
    ]);

  const limits = getPlanLimits(subscription.plan);
  const activeCount = activeCondominiums ?? 0;
  const condoLimit = limits.condominiums;
  const canCreate = activeCount < condoLimit;

  return {
    plan: subscription.plan,
    planLabel: plans[subscription.plan].name,
    limits,
    currentUsage: {
      ownedCondominiums: ownedCondominiums ?? 0,
      activeCondominiums: activeCount,
    },
    canCreate,
    blockedReason: canCreate
      ? null
      : `Seu plano ${plans[subscription.plan].name} permite até ${condoLimit} condomínio(s).`,
    subscriptionStatus: subscription.status,
  };
}

async function rpcLimit(
  functionName: string,
  args: Record<string, unknown>,
): Promise<PlanLimitCheck> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    throw new Error(error.message);
  }

  return data as PlanLimitCheck;
}

export async function getCurrentUsage(condoId: string): Promise<CurrentUsage> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_current_usage", {
    condo_id: condoId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as CurrentUsage;
}

export async function canCreateBlock(condoId: string) {
  return rpcLimit("can_create_block", { condo_id: condoId });
}

export async function canCreateApartment(condoId: string, blockId: string) {
  return rpcLimit("can_create_apartment", {
    condo_id: condoId,
    block_id: blockId,
  });
}

export async function canInviteAdmin(condoId: string) {
  return rpcLimit("can_invite_admin", { condo_id: condoId });
}

export async function canInviteSyndic(condoId: string) {
  return rpcLimit("can_invite_syndic", { condo_id: condoId });
}

export async function canInviteDoorman(condoId: string) {
  return rpcLimit("can_invite_doorman", { condo_id: condoId });
}

export async function canCreateCommonArea(condoId: string) {
  return rpcLimit("can_create_common_area", { condo_id: condoId });
}

export async function canCreateBooking(condoId: string) {
  return rpcLimit("can_create_booking", { condo_id: condoId });
}

export async function canCreateTicket(condoId: string) {
  return rpcLimit("can_create_ticket", { condo_id: condoId });
}

export async function canCreateAnnouncement(condoId: string) {
  return rpcLimit("can_create_announcement", { condo_id: condoId });
}

export async function canCreatePackage(condoId: string) {
  return rpcLimit("can_create_package", { condo_id: condoId });
}

export async function canUploadFile(condoId: string, fileSize: number) {
  return rpcLimit("can_upload_file", {
    condo_id: condoId,
    file_size: fileSize,
  });
}
