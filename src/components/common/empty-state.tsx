import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 rounded-lg bg-muted p-3 text-primary ring-1 ring-border">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <Button className="mt-6">{action}</Button> : null}
    </Card>
  );
}
