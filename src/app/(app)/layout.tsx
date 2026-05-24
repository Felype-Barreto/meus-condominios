import { AppShell } from "@/components/app/app-shell";
import { getPlatformSession } from "@/lib/admin/auth";
import { createSeoMetadata } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createSeoMetadata({
  title: "Painel Meus Condomínios",
  description: "Área interna do Meus Condomínios.",
  path: "/app",
  noIndex: true,
});

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", user.id)
    .maybeSingle();

  const emailConfirmed = Boolean(user.email_confirmed_at);
  const platformSession = await getPlatformSession();

  return (
    <AppShell
      isPlatformAdmin={Boolean(platformSession)}
      emailConfirmed={emailConfirmed}
      userName={profile?.full_name ?? user.user_metadata?.full_name ?? null}
      userEmail={profile?.email ?? user.email ?? null}
    >
      {children}
    </AppShell>
  );
}
