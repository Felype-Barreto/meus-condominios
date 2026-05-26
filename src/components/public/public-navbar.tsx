import { Building2, LogIn } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const links = [
  { href: "/recursos", label: "Recursos" },
  { href: "/demo", label: "Demo" },
  { href: "/blog", label: "Blog" },
  { href: "/seguranca", label: "Segurança" },
  { href: "/precos", label: "Preços" },
  { href: "/suporte", label: "Suporte" },
  { href: "/contato", label: "Contato" },
];

export async function PublicNavbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-[#7C5C3E]/20">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">Meus Condomínios</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={user ? "/app" : "/entrar"}>
              <LogIn className="h-4 w-4" /> {user ? "Painel" : "Entrar"}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/cadastro">Começar</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
