"use client";

import { Building2, DoorOpen, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SearchResult = {
  id: string;
  href: string;
  icon: typeof Search;
  label: string;
  detail: string;
};

type ApartmentRow = {
  id: string;
  number: string;
  blocks: { name: string | null } | null;
};

type MembershipRow = {
  id: string;
  role: string;
  apartments: { number: string | null } | null;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

type CondoRow = {
  id: string;
  name: string;
  plan: string;
};

export function AppGlobalSearch() {
  const pathname = usePathname();
  const activeCondoId = pathname.match(/^\/app\/([^/]+)/)?.[1];
  const condoId = activeCondoId && uuidPattern.test(activeCondoId) ? activeCondoId : null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const nextResults: SearchResult[] = [];

    if (condoId) {
      const [apartments, memberships] = await Promise.all([
        supabase
          .from("apartments")
          .select("id,number,blocks!apartments_block_id_fkey(name)")
          .eq("condominium_id", condoId)
          .ilike("number", `%${needle}%`)
          .limit(8),
        supabase
          .from("memberships")
          .select("id,role,apartments!memberships_apartment_id_fkey(number),profiles!memberships_user_id_fkey(full_name,email,phone)")
          .eq("condominium_id", condoId)
          .in("role", ["resident", "owner", "syndic", "admin", "doorman"])
          .limit(80),
      ]);

      ((apartments.data ?? []) as unknown as ApartmentRow[]).forEach((item) => {
        nextResults.push({
          id: `apt-${item.id}`,
          href: `/app/${condoId}/apartamentos`,
          icon: DoorOpen,
          label: `Apartamento ${item.number}`,
          detail: item.blocks?.name ?? "Unidade",
        });
      });

      ((memberships.data ?? []) as unknown as MembershipRow[])
        .filter((item) => {
          const haystack = [
            item.profiles?.full_name,
            item.profiles?.email,
            item.profiles?.phone,
            item.apartments?.number,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        })
        .slice(0, 8)
        .forEach((item) => {
          nextResults.push({
            id: `member-${item.id}`,
            href: `/app/${condoId}/moradores`,
            icon: UserRound,
            label: item.profiles?.full_name ?? item.profiles?.email ?? "Cadastro",
            detail: `${item.role}${item.apartments?.number ? ` - apto ${item.apartments.number}` : ""}`,
          });
        });
    } else {
      const { data } = await supabase
        .from("condominiums")
        .select("id,name,plan")
        .ilike("name", `%${needle}%`)
        .limit(10);

      ((data ?? []) as CondoRow[]).forEach((item) => {
        nextResults.push({
          id: `condo-${item.id}`,
          href: `/app/${item.id}/dashboard`,
          icon: Building2,
          label: item.name,
          detail: `Plano ${item.plan}`,
        });
      });
    }

    setResults(nextResults);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="ml-auto hidden h-11 w-full max-w-sm items-center gap-2 rounded-lg border bg-card px-3 text-left text-sm text-muted-foreground shadow-sm md:flex"
        >
          <Search className="h-4 w-4" />
          Buscar morador, unidade ou condomínio
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Busca rápida</DialogTitle>
        </DialogHeader>
        <form onSubmit={runSearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={condoId ? "Nome, telefone, e-mail ou apartamento" : "Nome do condomínio"}
            autoFocus
          />
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </form>
        <div className="mt-2 space-y-2">
          {results.length ? (
            results.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
