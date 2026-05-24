import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";

export type AdminTableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export function AdminTable<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: AdminTableColumn<T>[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top">
                    {column.render(row)}
                  </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      )}
    </Card>
  );
}

export function AdminStatus({ value }: { value?: string | null }) {
  const normalized = value ?? "sem status";
  const tone =
    normalized.includes("active") || normalized.includes("paid") || normalized.includes("resolved")
      ? "success"
      : normalized.includes("pending") || normalized.includes("open")
        ? "warning"
        : "neutral";

  return <StatusBadge tone={tone}>{normalized}</StatusBadge>;
}
