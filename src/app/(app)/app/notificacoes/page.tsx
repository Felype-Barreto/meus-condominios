import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  answerVisitorContactRequestAction,
  markAllNotificationsReadAction,
} from "./actions";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  type: string | null;
  read_at: string | null;
  created_at: string;
  condominiums: { name: string | null } | null;
};

export default async function AccountNotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("condominium_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const condoIds = (memberships ?? []).map((membership) => membership.condominium_id);

  if (condoIds.length) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("condominium_id", condoIds)
      .is("read_at", null);
  }

  const { data } = await supabase
    .from("notifications")
    .select("id,title,body,href,type,read_at,created_at,condominiums(name)")
    .in("condominium_id", condoIds.length ? condoIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(80);

  const notifications = (data ?? []) as unknown as NotificationRow[];
  const unread = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Minha conta</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Notificações</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Avisos enviados diretamente para sua conta, reunidos em um lugar so.
          </p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" disabled={!unread}>
            Marcar todas como lidas
          </Button>
        </form>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{unread} não lida(s)</h2>
        </div>
        <div className="mt-5 space-y-3">
          {notifications.length ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link
                      href={notification.href ?? "/app/condominios"}
                      className="font-semibold hover:text-primary"
                    >
                      {notification.title}
                    </Link>
                    {notification.body ? (
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {notification.condominiums?.name ?? "Conta"} -{" "}
                      {new Date(notification.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <StatusBadge tone={notification.read_at ? "neutral" : "warning"}>
                    {notification.read_at ? "Lida" : "Nova"}
                  </StatusBadge>
                </div>
                {notification.type === "visitor_contact_request" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <form action={answerVisitorContactRequestAction}>
                      <input
                        type="hidden"
                        name="request_id"
                        value={notification.href?.split("visitor_request_id=")[1] ?? ""}
                      />
                      <input type="hidden" name="answer" value="approve" />
                      <Button type="submit" size="sm">
                        Liberar contato
                      </Button>
                    </form>
                    <form action={answerVisitorContactRequestAction}>
                      <input
                        type="hidden"
                        name="request_id"
                        value={notification.href?.split("visitor_request_id=")[1] ?? ""}
                      />
                      <input type="hidden" name="answer" value="reject" />
                      <Button type="submit" size="sm" variant="outline">
                        Recusar
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
              Nenhuma notificação direta ainda. Quando reservas, convites, encomendas ou comunicados gerarem avisos para você, eles aparecem aqui.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
