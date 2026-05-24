import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { createSeoMetadata } from "@/lib/seo";
import { getPlatformSession } from "@/lib/admin/auth";

export const metadata = createSeoMetadata({
  title: "Admin Meus Condomínios",
  description: "Painel interno da plataforma Meus Condomínios.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/app");

  if (!session.twoFactorVerified) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="p-6">
            <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
            <h1 className="mt-3 text-2xl font-semibold">Verificação em duas etapas necessária</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O acesso interno exige MFA ativo para donos e administradores da plataforma. Ative a verificação em duas etapas no Supabase Auth para este usuário, use um e-mail exclusivo de admin e mantenha os códigos de recuperação guardados offline.
            </p>
            <div className="mt-5 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-semibold">Checklist mínimo antes de liberar:</p>
              <p className="mt-2">1. E-mail na allowlist de admin.</p>
              <p>2. Registro ativo em platform_admin_users.</p>
              <p>3. MFA verificado no Supabase Auth.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
