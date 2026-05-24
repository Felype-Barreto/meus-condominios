import { redirect } from "next/navigation";
import {
  CondominiumAccountList,
  type AccountCondominiumMembership,
} from "@/components/app/condominium-account-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountCondominiumsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data } = await supabase
    .from("memberships")
    .select(
      "id,role,status,condominiums(id,name,blocks(id),apartments(id),memberships(id,role,status))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const memberships = ((data ?? []) as unknown as AccountCondominiumMembership[]).filter(
    (membership) => membership.condominiums,
  );

  return <CondominiumAccountList memberships={memberships} />;
}
