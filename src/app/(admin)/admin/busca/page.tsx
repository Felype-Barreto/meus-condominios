import Link from "next/link";
import { Search } from "lucide-react";
import { AdminStatus } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePlatformSession } from "@/lib/admin/auth";
import {
  performAdminGlobalSearch,
} from "@/lib/admin/search";
import { getAdminSearchCategoryLabel, type AdminSearchResult } from "@/lib/admin/search-shared";

function groupResults(results: AdminSearchResult[]) {
  return results.reduce<Record<string, AdminSearchResult[]>>((acc, item) => {
    const label = getAdminSearchCategoryLabel(item.category);
    acc[label] = [...(acc[label] ?? []), item];
    return acc;
  }, {});
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePlatformSession();
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const response =
    query.length >= 2
      ? await performAdminGlobalSearch({
          session,
          query,
          limit: 10,
          source: "page",
        })
      : { results: [], sensitive: false };
  const grouped = groupResults(response.results);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Admin Meus Condomínios</p>
        <h1 className="mt-2 text-3xl font-semibold">Busca global</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pesquise registros internos com permissao aplicada no backend e dados sensiveis mascarados.
        </p>
      </div>

      <Card className="p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Nome, slug, ID, chamado, status ou categoria"
              className="pl-9"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
        {response.sensitive ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Esta busca parece envolver dado sensivel e foi registrada em auditoria.
          </p>
        ) : null}
      </Card>

      {query.length < 2 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar.
        </Card>
      ) : null}

      {query.length >= 2 && response.results.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nada encontrado. Tente nome do condominio, slug, ID ou assunto do chamado.
        </Card>
      ) : null}

      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-lg font-semibold">{category}</h2>
            <div className="grid gap-3">
              {items.map((item) => (
                <Card key={`${item.category}:${item.id}`} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        {item.badge ? (
                          <span className="rounded-full bg-[#F1E3D2] px-2 py-1 text-[11px] font-semibold text-[#5F432C]">
                            {item.badge}
                          </span>
                        ) : null}
                        {item.status ? <AdminStatus value={item.status} /> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={item.href}>Abrir</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
