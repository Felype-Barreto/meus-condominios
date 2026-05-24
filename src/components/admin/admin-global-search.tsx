"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { adminGlobalSearchAction } from "@/app/(admin)/admin/actions";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAdminSearchCategoryLabel, type AdminSearchResult } from "@/lib/admin/search-shared";

type GroupedResults = Record<string, AdminSearchResult[]>;

function groupResults(results: AdminSearchResult[]) {
  return results.reduce<GroupedResults>((acc, item) => {
    const label = getAdminSearchCategoryLabel(item.category);
    acc[label] = [...(acc[label] ?? []), item];
    return acc;
  }, {});
}

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [recent, setRecent] = useState<AdminSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const grouped = useMemo(() => groupResults(results), [results]);
  const showRecent = query.trim().length < 2 && recent.length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const response = await adminGlobalSearchAction({ query: value });
          setResults(response.results);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Nao foi possivel buscar agora.");
          setResults([]);
        }
      });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [query]);

  function remember(item: AdminSearchResult) {
    setRecent((current) => [item, ...current.filter((entry) => entry.href !== item.href)].slice(0, 5));
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const resultList = showRecent ? recent : results;
  const hasQuery = query.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="hidden min-w-72 max-w-md flex-1 items-center gap-2 rounded-lg border bg-card px-3 shadow-sm transition hover:border-primary/40 md:flex"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left text-sm text-muted-foreground">
            Buscar condominio, usuario, chamado...
          </span>
          <span className="rounded border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            Ctrl K
          </span>
        </button>
      </DialogTrigger>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Busca global"
      >
        <Search className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Busca global</DialogTitle>
          <DialogDescription>
            Encontre registros do Superadmin com dados sensiveis mascarados e permissoes aplicadas no backend.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            placeholder="Digite nome, slug, id, chamado ou status"
            className="pl-9"
          />
        </div>

        {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
        {isPending ? <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">Buscando...</p> : null}

        <div className="max-h-[52svh] overflow-y-auto">
          {showRecent ? <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recentes nesta sessao</p> : null}
          {hasQuery && !isPending && resultList.length === 0 ? (
            <div className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
              Nada encontrado com esse termo. Tente nome do condominio, slug, ID ou assunto do chamado.
            </div>
          ) : null}

          {showRecent ? (
            <div className="grid gap-2">
              {recent.map((item) => (
                <SearchResultLink key={`${item.category}:${item.id}`} item={item} onClick={() => remember(item)} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <section key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{category}</h3>
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <SearchResultLink key={`${item.category}:${item.id}`} item={item} onClick={() => remember(item)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResultLink({
  item,
  onClick,
}: {
  item: AdminSearchResult;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="block rounded-lg border bg-background p-3 text-sm transition hover:border-primary/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{item.title}</p>
        <div className="flex items-center gap-2">
          {item.badge ? <span className="rounded-full bg-[#F1E3D2] px-2 py-1 text-[11px] font-semibold text-[#5F432C]">{item.badge}</span> : null}
          {item.status ? <AdminStatus value={item.status} /> : null}
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
    </Link>
  );
}
