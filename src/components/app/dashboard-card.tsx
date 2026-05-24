import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <strong className="mt-3 block text-3xl font-semibold">{value}</strong>
        </div>
        <span className="rounded-lg bg-muted p-3 text-primary ring-1 ring-border">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
    </Card>
  );
}
