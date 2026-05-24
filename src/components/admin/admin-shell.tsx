import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { Button } from "@/components/ui/button";
import { platformRoleLabels, type PlatformSession } from "@/lib/admin/auth";

const navItems = [
  { href: "/admin", label: "Visao geral", icon: Home },
  { href: "/admin/busca", label: "Busca global", icon: Search },
  { href: "/admin/condominios", label: "Condominios", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/financeiro", label: "Financeiro", icon: Receipt },
  { href: "/admin/reembolsos", label: "Reembolsos", icon: RefreshCcw },
  { href: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
  { href: "/admin/denuncias", label: "Denuncias", icon: AlertTriangle },
  { href: "/admin/seguranca", label: "Seguranca", icon: LockKeyhole },
  { href: "/admin/incidentes", label: "Incidentes", icon: ShieldAlert },
  { href: "/admin/lgpd", label: "LGPD", icon: FileText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/logs", label: "Logs", icon: Activity },
  { href: "/admin/configuracoes", label: "Configuracoes", icon: Settings },
];

export function AdminShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: PlatformSession;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-card xl:flex xl:flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Meus Condomínios</p>
              <p className="text-xs text-muted-foreground">Admin Meus Condomínios</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur-xl md:px-6">
            <div className="flex items-center gap-2 xl:hidden">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <span className="font-semibold">Admin Meus Condomínios</span>
            </div>
            <AdminGlobalSearch />
            <span className="ml-auto rounded-full bg-[#F1E3D2] px-3 py-1 text-xs font-semibold text-[#5F432C] ring-1 ring-[#E7DCCB]">
              Admin Meus Condomínios
            </span>
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold">{session.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {platformRoleLabels[session.role]} via {session.source}
              </p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
