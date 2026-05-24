import Link from "next/link";

const items = [
  { href: "comunicacao", label: "Visão geral" },
  { href: "comunicacao/canais", label: "Canais" },
  { href: "comunicacao/templates", label: "Modelos" },
  { href: "comunicacao/disparos", label: "Disparos" },
  { href: "comunicacao/resumos", label: "Resumos" },
  { href: "comunicacao/relatorios", label: "Relatórios" },
  { href: "comunicacao/creditos", label: "Créditos" },
  { href: "comunicacao/logs", label: "Logs" },
];

export function CommunicationNav({ condoId }: { condoId: string }) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={`/app/${condoId}/${item.href}`}
          className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
