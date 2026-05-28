"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  filterCondoNavigationItems,
  mobileLabelByItem,
  permissionsByCondoItem,
  sortMobileItems,
  type AppNavItem,
} from "@/lib/app-navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rolePriority = ["subscriber_admin", "admin", "syndic", "doorman", "owner", "resident"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const condoId = pathname.match(/^\/app\/([^/]+)/)?.[1];
  const [role, setRole] = useState<string | null>(null);
  const [permissionItems, setPermissionItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!condoId || !uuidPattern.test(condoId)) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user) return;

      supabase
        .from("memberships")
        .select("role")
        .eq("condominium_id", condoId)
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .then(({ data }) => {
          if (cancelled) return;
          const roles = new Set((data ?? []).map((membership) => membership.role));
          setRole(rolePriority.find((candidate) => roles.has(candidate)) ?? null);
        });

      Promise.all(
        Object.entries(permissionsByCondoItem).map(async ([href, permissions]) => {
          const checks = await Promise.all(
            permissions.map((permission) =>
              supabase.rpc("has_permission", {
                condo_id: condoId,
                permission_key: permission,
              }),
            ),
          );

          return [href, checks.some((result) => result.data === true)] as const;
        }),
      ).then((results) => {
        if (cancelled) return;
        setPermissionItems(new Set(results.filter(([, allowed]) => allowed).map(([href]) => href)));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [condoId]);

  const items = useMemo(() => {
    return sortMobileItems(
      filterCondoNavigationItems({
        admin: role === "subscriber_admin" || role === "admin",
        allowedItems: permissionItems,
      }),
    );
  }, [permissionItems, role]);

  if (!condoId || !uuidPattern.test(condoId)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_28px_rgba(17,24,39,0.08)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-flow-col auto-cols-fr gap-1">
        {items.map((item) => {
          const href = `/app/${condoId}/${item.href}`;
          const active = pathname.startsWith(href);
          const Icon = item.icon as AppNavItem["icon"] | typeof Home;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={href}
              className={cn(
                "flex min-h-[3.65rem] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.67rem] font-semibold text-muted-foreground active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-muted text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{mobileLabelByItem[item.href] ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
