import { FileText, Search } from "lucide-react";
import {
  CommunicationTemplateCard,
  CommunicationTemplateForm,
  type CommunicationTemplateCardData,
} from "@/components/app/communication-forms";
import { CommunicationNav } from "@/components/app/communication-nav";
import { UpgradeBanner } from "@/components/app/upgrade-banner";
import { EmptyState } from "@/components/common/empty-state";
import { Card } from "@/components/ui/card";
import { getCommunicationTemplateLimit } from "@/lib/communication";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const categories = [
  "todas",
  "manutenção",
  "meeting",
  "announcement",
  "security",
  "package",
  "booking",
  "ticket",
  "visitor",
  "summary",
];

export default async function CommunicationTemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ condoId: string }>;
  searchParams: Promise<{ categoria?: string; busca?: string }>;
}) {
  const { condoId } = await params;
  const { categoria = "todas", busca = "" } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: templates }, { data: canCreate }, limit] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase
      .from("communication_templates")
      .select("*")
      .or(`condominium_id.is.null,condominium_id.eq.${condoId}`)
      .order("condominium_id", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "announcements.create" }),
    getCommunicationTemplateLimit(condoId),
  ]);

  const rows = ((templates ?? []) as CommunicationTemplateCardData[])
    .filter((template) => template.active || template.condominium_id)
    .filter((template) => categoria === "todas" || template.category === categoria)
    .filter((template) => {
      const term = busca.trim().toLowerCase();
      if (!term) return true;
      return [
        template.name,
        template.category,
        template.title_template,
        template.body_template,
      ].some((value) => value.toLowerCase().includes(term));
    })
    .map((template) => ({
      ...template,
      suggested_channels: Array.isArray(template.suggested_channels) ? template.suggested_channels : [],
      variables: Array.isArray(template.variables) ? template.variables : [],
    }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Modelos prontos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Biblioteca de mensagens seguras para síndicos enviarem rápido sem escrever tudo do zero.
        </p>
      </div>

      <CommunicationNav condoId={condoId} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Templates próprios</p>
          <strong className="mt-1 block text-3xl font-semibold">{limit.used}/{limit.limit}</strong>
          <p className="mt-2 text-xs text-muted-foreground">Plano {limit.plan}</p>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <form className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                name="busca"
                defaultValue={busca}
                placeholder="Buscar modelo"
                className="h-12 w-full rounded-lg border bg-card pl-10 pr-3 text-base outline-none focus-visible:border-primary md:h-11 md:text-sm"
              />
            </label>
            <select
              name="categoria"
              defaultValue={categoria}
              className="h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-primary md:h-11 md:text-sm"
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground md:col-span-2">
              Filtrar
            </button>
          </form>
        </Card>
      </div>

      {canCreate && limit.allowed ? (
        <CommunicationTemplateForm condoId={condoId} />
      ) : canCreate ? (
        <UpgradeBanner
          condoId={condoId}
          title="Limite de modelos personalizados atingido"
          description="Use os modelos globais ou faça upgrade para criar mais templates próprios."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? (
          rows.map((template) => (
            <CommunicationTemplateCard key={template.id} condoId={condoId} template={template} />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon={FileText}
              title="Nenhum modelo encontrado"
              description="Tente outra busca ou categoria."
            />
          </div>
        )}
      </div>
    </div>
  );
}
