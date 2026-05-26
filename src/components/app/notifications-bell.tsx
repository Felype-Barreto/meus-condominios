"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NotificationPreview = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationPreview[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: memberships } = await supabase
      .from("memberships")
      .select("condominium_id")
      .eq("user_id", auth.user.id)
      .eq("status", "active");

    const condoIds = (memberships ?? []).map((membership) => membership.condominium_id);
    const baseQuery = supabase
      .from("notifications")
      .select("id,title,body,href,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const countQuery = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);

    const [listResult, countResult] = await Promise.all([
      condoIds.length
        ? baseQuery.in("condominium_id", condoIds)
        : baseQuery.eq("user_id", auth.user.id),
      condoIds.length
        ? countQuery.in("condominium_id", condoIds)
        : countQuery.eq("user_id", auth.user.id),
    ]);

    setItems((listResult.data ?? []) as NotificationPreview[]);
    setUnread(countResult.count ?? 0);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    window.addEventListener("focus", refresh);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative"
        aria-label="Notificações"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="fixed inset-x-3 top-[4.5rem] z-[70] max-h-[calc(100dvh-6rem)] overflow-hidden rounded-lg border bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:z-50 sm:w-[min(92vw,360px)]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Notificações</p>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              {unread} nova(s)
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href ?? "/app/notificacoes"}
                  onClick={() => setOpen(false)}
                  className="block border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{item.title}</p>
                    {!item.read_at ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  {item.body ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma notificação por enquanto.
              </p>
            )}
          </div>
          <div className="border-t p-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/app/notificacoes" onClick={() => setOpen(false)}>
                Ver todas
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
