"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PlatformSession } from "@/lib/admin/auth";
import { getRequestAuditContext } from "@/lib/admin/auth";

export async function logPlatformAction({
  session,
  action,
  entityType,
  entityId,
  reason,
  metadata,
}: {
  session: PlatformSession;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { ip, userAgent } = await getRequestAuditContext();
  const supabase = createSupabaseServiceClient();

  await supabase.from("platform_admin_audit_logs").insert({
    actor_user_id: session.userId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    severity: "normal",
    reason: reason ?? null,
    metadata: {
      ...(metadata ?? {}),
      actor_email: session.email,
      actor_role: session.role,
    },
    ip_address: ip,
    user_agent: userAgent,
  });
}
