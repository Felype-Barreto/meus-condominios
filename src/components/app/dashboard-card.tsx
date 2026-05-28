import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "p-5",
        href &&
          "h-full transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm",
      )}
    >
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

  if (!href) return content;

  return (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
