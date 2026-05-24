import { roleLabels } from "@/lib/app-data";
import type { SystemRole } from "@/types/domain";

const roleStyles: Record<SystemRole, string> = {
  subscriber_admin: "bg-primary/10 text-primary ring-primary/25",
  admin: "bg-muted text-muted-foreground ring-border",
  syndic: "bg-success/10 text-success ring-success/25",
  doorman: "bg-warning/10 text-warning ring-warning/25",
  resident: "bg-muted text-muted-foreground ring-border",
  owner: "bg-muted text-muted-foreground ring-border",
};

export function RoleBadge({ role }: { role: SystemRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}
