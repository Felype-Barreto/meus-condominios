export type WhatsAppPlan = "free" | "premium" | "pro" | "total";

export type WhatsAppEventType =
  | "package_created"
  | "booking_approved"
  | "booking_rejected"
  | "urgent_announcement_created"
  | "visitor_contact_request_created"
  | "booking_reminder_24h"
  | "booking_reminder_2h"
  | "ticket_status_changed"
  | "announcement_created_important"
  | "package_waiting_reminder"
  | "daily_summary"
  | "weekly_summary"
  | "group_announcement"
  | "block_group_announcement"
  | "meeting_reminder"
  | "maintenance_reminder";

export type WhatsAppEventDefinition = {
  event: WhatsAppEventType;
  minimumPlan: Exclude<WhatsAppPlan, "free">;
  templateKey: string;
  permission: string;
  targetType: "user" | "group";
};

export const whatsappEventDefinitions: Record<
  WhatsAppEventType,
  WhatsAppEventDefinition
> = {
  package_created: {
    event: "package_created",
    minimumPlan: "pro",
    templateKey: "package_created",
    permission: "packages.create",
    targetType: "user",
  },
  booking_approved: {
    event: "booking_approved",
    minimumPlan: "pro",
    templateKey: "booking_approved",
    permission: "bookings.approve",
    targetType: "user",
  },
  booking_rejected: {
    event: "booking_rejected",
    minimumPlan: "pro",
    templateKey: "booking_rejected",
    permission: "bookings.approve",
    targetType: "user",
  },
  urgent_announcement_created: {
    event: "urgent_announcement_created",
    minimumPlan: "pro",
    templateKey: "urgent_announcement",
    permission: "announcements.create",
    targetType: "user",
  },
  visitor_contact_request_created: {
    event: "visitor_contact_request_created",
    minimumPlan: "pro",
    templateKey: "visitor_contact_request",
    permission: "public_qr.view_logs",
    targetType: "user",
  },
  booking_reminder_24h: {
    event: "booking_reminder_24h",
    minimumPlan: "pro",
    templateKey: "booking_reminder",
    permission: "bookings.view_all",
    targetType: "user",
  },
  booking_reminder_2h: {
    event: "booking_reminder_2h",
    minimumPlan: "pro",
    templateKey: "booking_reminder",
    permission: "bookings.view_all",
    targetType: "user",
  },
  ticket_status_changed: {
    event: "ticket_status_changed",
    minimumPlan: "pro",
    templateKey: "ticket_status_changed",
    permission: "tickets.change_status",
    targetType: "user",
  },
  announcement_created_important: {
    event: "announcement_created_important",
    minimumPlan: "pro",
    templateKey: "important_announcement",
    permission: "announcements.create",
    targetType: "user",
  },
  package_waiting_reminder: {
    event: "package_waiting_reminder",
    minimumPlan: "pro",
    templateKey: "package_waiting_reminder",
    permission: "packages.view_all",
    targetType: "user",
  },
  daily_summary: {
    event: "daily_summary",
    minimumPlan: "total",
    templateKey: "daily_summary",
    permission: "announcements.create",
    targetType: "user",
  },
  weekly_summary: {
    event: "weekly_summary",
    minimumPlan: "total",
    templateKey: "weekly_summary",
    permission: "announcements.create",
    targetType: "user",
  },
  group_announcement: {
    event: "group_announcement",
    minimumPlan: "total",
    templateKey: "group_announcement",
    permission: "announcements.send_to_all",
    targetType: "group",
  },
  block_group_announcement: {
    event: "block_group_announcement",
    minimumPlan: "total",
    templateKey: "group_announcement",
    permission: "announcements.send_to_block",
    targetType: "group",
  },
  meeting_reminder: {
    event: "meeting_reminder",
    minimumPlan: "total",
    templateKey: "meeting_reminder",
    permission: "announcements.create",
    targetType: "user",
  },
  maintenance_reminder: {
    event: "maintenance_reminder",
    minimumPlan: "total",
    templateKey: "maintenance_reminder",
    permission: "announcements.create",
    targetType: "user",
  },
};

const planRank: Record<WhatsAppPlan, number> = {
  free: 0,
  premium: 1,
  pro: 2,
  total: 3,
};

export function isWhatsAppEventAllowedForPlan(
  plan: string | null | undefined,
  event: WhatsAppEventType,
) {
  const normalizedPlan = (plan ?? "free").toLowerCase() as WhatsAppPlan;
  const definition = whatsappEventDefinitions[event];

  return (
    definition !== undefined &&
    (planRank[normalizedPlan] ?? 0) >= planRank[definition.minimumPlan]
  );
}

export function getWhatsAppEventDefinition(event: WhatsAppEventType) {
  return whatsappEventDefinitions[event];
}
