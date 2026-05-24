import Link from "next/link";

const items = [
  { href: "whatsapp", label: "Visão geral" },
  { href: "whatsapp/grupos", label: "Grupos" },
  { href: "whatsapp/templates", label: "Templates" },
  { href: "whatsapp/logs", label: "Logs" },
  { href: "configuracoes/whatsapp", label: "Configuração" },
];

export function WhatsAppNav({ condoId }: { condoId: string }) {
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
