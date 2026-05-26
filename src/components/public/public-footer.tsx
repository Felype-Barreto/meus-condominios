import { Building2, Mail } from "lucide-react";
import Link from "next/link";
import { officialContact } from "@/lib/app-data";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="text-lg font-semibold">Meus Condomínios</p>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Gestão de condomínios com cadastro seguro, permissões claras e uma
            rotina mais organizada para administração, síndico, portaria e moradores.
          </p>
          <a
            href={`mailto:${officialContact}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-primary hover:text-[#5F432C] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="h-4 w-4" />
            {officialContact}
          </a>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Produto</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/recursos">Recursos</Link>
            <Link className="hover:text-foreground" href="/seguranca">Segurança</Link>
            <Link className="hover:text-foreground" href="/qr-seguro">QR seguro</Link>
            <Link className="hover:text-foreground" href="/precos">Preços</Link>
            <Link className="hover:text-foreground" href="/suporte">Suporte</Link>
            <Link className="hover:text-foreground" href="/contato">Contato</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/privacidade">Privacidade</Link>
            <Link className="hover:text-foreground" href="/termos">Termos</Link>
            <Link className="hover:text-foreground" href="/cookies">Cookies</Link>
            <Link className="hover:text-foreground" href="/politica-de-cancelamento">Cancelamento</Link>
            <Link className="hover:text-foreground" href="/contato">Contato</Link>
          </div>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        © 2026 Meus Condomínios. Todos os direitos reservados.
      </div>
    </footer>
  );
}
