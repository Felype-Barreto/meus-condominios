import { Card } from "@/components/ui/card";
import { moneyFromCents } from "@/lib/admin/data";

type ChartPoint = {
  label: string;
  value: number;
};

export function AdminBarChart({
  title,
  points,
  currency = true,
}: {
  title: string;
  points: ChartPoint[];
  currency?: boolean;
}) {
  const max = Math.max(...points.map((point) => point.value), 0);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {points.some((point) => point.value > 0) ? (
        <div className="mt-5 space-y-3">
          {points.map((point) => {
            const width = max ? Math.max((point.value / max) * 100, 3) : 0;
            return (
              <div key={point.label} className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{point.label}</span>
                  <span className="font-semibold">
                    {currency ? moneyFromCents(point.value) : point.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          Ainda não há dados suficientes para este gráfico.
        </p>
      )}
    </Card>
  );
}
