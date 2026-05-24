import { AdminMetricCard } from "@/components/admin/admin-card";
import { AdminStatus } from "@/components/admin/admin-table";
import { SensitiveField } from "@/components/admin/sensitive-field";
import { Card } from "@/components/ui/card";
import { createAdminSupabase, maskEmail, maskPhone } from "@/lib/admin/data";

export default async function AdminUsersPage() {
  const supabase = createAdminSupabase();
  const [{ data: profiles }, { data: staff }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,phone,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("platform_admin_users").select("id,role,status,profiles(email)"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Usuários</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard label="Usuários listados" value={profiles?.length ?? 0} />
        <AdminMetricCard label="Equipe interna" value={staff?.length ?? 0} />
        <AdminMetricCard label="Dados sensíveis" value="Mascarados" />
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Revelar dado sensível</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre motivo antes de consultar e-mail/telefone completos.
        </p>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(profiles ?? []).map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-semibold">
                    {profile.full_name ?? "Sem nome"}
                  </td>
                  <td>
                    <SensitiveField
                      entityType="profiles"
                      entityId={profile.id}
                      field="email"
                      contextModule="users"
                      maskedValue={maskEmail(profile.email)}
                    />
                  </td>
                  <td>
                    <SensitiveField
                      entityType="profiles"
                      entityId={profile.id}
                      field="phone"
                      contextModule="users"
                      maskedValue={maskPhone(profile.phone)}
                    />
                  </td>
                  <td>{new Date(profile.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Equipe Meus Condomínios</h2>
        <div className="mt-4 grid gap-3">
          {(staff ?? []).map((item) => {
            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm"
              >
                <span>
                  {maskEmail(profile?.email)} · {item.role}
                </span>
                <AdminStatus value={item.status} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
