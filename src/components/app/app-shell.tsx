import Link from "next/link";
import { Building2, LogOut, ShieldAlert } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { AppGlobalSearch } from "@/components/app/app-global-search";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { MobileDrawer } from "@/components/app/mobile-drawer";
import { MobileQuickAction } from "@/components/app/mobile-quick-action";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { Sidebar } from "@/components/app/sidebar";
import { CookieConsentBanner } from "@/components/common/cookie-consent-banner";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  emailConfirmed = true,
  isPlatformAdmin = false,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  emailConfirmed?: boolean;
  isPlatformAdmin?: boolean;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const initials = (userName || userEmail || "Meus Condomínios")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar isPlatformAdmin={isPlatformAdmin} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur-xl md:px-6">
            <MobileDrawer isPlatformAdmin={isPlatformAdmin} />
            <Link
              href="/"
              className="hidden shrink-0 items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            >
              <Building2 className="h-5 w-5 text-primary" />
              <span>Meus Condomínios</span>
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Meus Condomínios</span>
            </div>
            <AppGlobalSearch />
            {isPlatformAdmin ? (
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                <Link href="/admin">
                  <ShieldAlert className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            ) : null}
            <NotificationsBell />
            <ThemeToggle />
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold">{userName ?? "Minha conta"}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary text-center text-sm font-semibold leading-9 text-primary-foreground shadow-sm shadow-[#7C5C3E]/20">
              {initials || "M"}
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="icon">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sair da conta</span>
              </Button>
            </form>
          </header>
          <main className="flex-1 p-4 pb-28 md:p-6 md:pb-28 lg:p-8">
            {!emailConfirmed ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Confirmacao de e-mail pendente</p>
                <p className="mt-1">
                  Voce ja pode conhecer o painel. Para proteger a conta e liberar todos os recursos
                  sensiveis, confirme seu e-mail quando receber a mensagem.
                </p>
              </div>
            ) : null}
            {children}
          </main>
          <MobileQuickAction />
          <MobileBottomNav />
          <CookieConsentBanner />
        </div>
      </div>
    </div>
  );
}
