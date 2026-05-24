import { cn } from "@/lib/utils";

export function PlanUsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percent = limit <= 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const isWarning = percent >= 80 && percent < 100;
  const isBlocked = percent >= 100;

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <span className="text-sm text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full bg-success",
            isWarning && "bg-warning",
            isBlocked && "bg-destructive",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isWarning ? (
        <p className="text-sm font-medium text-warning">Você já usou 80% deste limite.</p>
      ) : null}
      {isBlocked ? (
        <p className="text-sm font-medium text-destructive">Limite atingido. Faça upgrade para continuar.</p>
      ) : null}
    </div>
  );
}
