import { LucideIcon, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export function ModulePage({
  title,
  description,
  icon,
  action = "Adicionar",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Residencial Jardim</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {action}
        </Button>
      </div>
      <EmptyState icon={icon} title={`${title} sem registros`} description="Quando houver registros, os dados deste módulo aparecerão aqui com filtros e ações." action={action} />
    </div>
  );
}

