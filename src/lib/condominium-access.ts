import { redirect } from "next/navigation";
import type { SystemRole } from "@/types/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MembershipAccessRow = {
  id: string;
  role: SystemRole;
  apartment_id: string | null;
};

const rolePriority: Record<SystemRole, number> = {
  subscriber_admin: 0,
  admin: 1,
  syndic: 2,
  doorman: 3,
  owner: 4,
  resident: 5,
};

export type CondominiumAccess = {
  userId: string;
  role: SystemRole;
  apartmentId: string | null;
  isAdmin: boolean;
  isSyndic: boolean;
  isDoorman: boolean;
  isResident: boolean;
};

export async function getCondominiumAccess(condoId: string): Promise<CondominiumAccess> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect(`/entrar?next=${encodeURIComponent(`/app/${condoId}/dashboard`)}`);

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("id,role,apartment_id")
    .eq("condominium_id", condoId)
    .eq("user_id", auth.user.id)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const access = ((memberships ?? []) as MembershipAccessRow[]).sort(
    (a, b) => rolePriority[a.role] - rolePriority[b.role],
  )[0];

  if (!access) redirect("/app");

  const role = access.role;
  const isAdmin = role === "subscriber_admin" || role === "admin";
  const isSyndic = role === "syndic";
  const isDoorman = role === "doorman";
  const isResident = role === "resident" || role === "owner";

  return {
    userId: auth.user.id,
    role,
    apartmentId: access.apartment_id,
    isAdmin,
    isSyndic,
    isDoorman,
    isResident,
  };
}

export function canManageCondominium(access: Pick<CondominiumAccess, "isAdmin" | "isSyndic">) {
  return access.isAdmin || access.isSyndic;
}
