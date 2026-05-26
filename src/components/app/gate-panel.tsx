"use client";

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  History,
  Loader2,
  Package,
  Phone,
  Search,
  UserPlus,
} from "lucide-react";
import { useActionState, useState } from "react";
import {
  createGateIncidentAction,
  createGatePackageAction,
  createGateVisitorAction,
  inviteDoormanAction,
  markPackagePickedUpAction,
  searchGateApartmentAction,
  type GateActionState,
} from "@/app/(app)/app/[condoId]/guarita/actions";
import { StatusBadge } from "@/components/common/status-badge";
import { PackagePhotoUploadField } from "@/components/app/package-photo-upload-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApartmentOption = {
  id: string;
  number: string;
  blocks?: { name: string | null } | null;
};

type GatePackage = {
  id: string;
  apartment_id?: string | null;
  recipient_name: string | null;
  description: string | null;
  status?: string | null;
  picked_up_by?: string | null;
  picked_up_at?: string | null;
  created_at: string;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

type Visitor = {
  id: string;
  apartment_id?: string | null;
  apartment_number?: string | null;
  visitor_name: string | null;
  visitor_phone: string | null;
  message?: string | null;
  status: string;
  created_at: string;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

type GateIncident = {
  id: string;
  apartment_id: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  severity: string | null;
  created_at: string;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  created_at: string;
};

type GateBooking = {
  id: string;
  apartment_id?: string | null;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string;
  common_areas?: { name: string | null } | null;
};

const idle: GateActionState = { status: "idle" };

function StateMessage({ state }: { state: GateActionState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`rounded-lg border p-3 text-sm font-medium ${
        state.status === "success"
          ? "border-green-200 bg-green-50 text-success"
          : "border-red-200 bg-red-50 text-destructive"
      }`}
    >
      {state.message}
    </div>
  );
}

export function GatePanel({
  condoId,
  condoName,
  apartments,
  waitingPackages,
  packageHistory,
  recentVisitors,
  recentIncidents,
  announcements,
  canInviteDoorman,
  todayBookings = [],
}: {
  condoId: string;
  condoName: string;
  apartments: ApartmentOption[];
  waitingPackages: GatePackage[];
  packageHistory: GatePackage[];
  recentVisitors: Visitor[];
  recentIncidents: GateIncident[];
  announcements: Announcement[];
  canInviteDoorman: boolean;
  todayBookings?: GateBooking[];
}) {
  const [searchState, searchAction, searchPending] = useActionState(
    searchGateApartmentAction,
    idle,
  );
  const [packageState, packageAction, packagePending] = useActionState(
    createGatePackageAction,
    idle,
  );
  const [visitorState, visitorAction, visitorPending] = useActionState(
    createGateVisitorAction,
    idle,
  );
  const [incidentState, incidentAction, incidentPending] = useActionState(
    createGateIncidentAction,
    idle,
  );
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteDoormanAction,
    idle,
  );
  const [selectedApartmentId, setSelectedApartmentId] = useState(apartments[0]?.id ?? "");
  const selectedApartment = apartments.find((apartment) => apartment.id === selectedApartmentId);
  const selectedApartmentLabel = selectedApartment
    ? `${selectedApartment.blocks?.name ?? "Bloco"} - ${selectedApartment.number}`
    : "Nenhum apartamento selecionado";
  const selectedBookings = todayBookings.filter(
    (booking) => !booking.apartment_id || booking.apartment_id === selectedApartmentId,
  );
  const selectedWaitingPackages = waitingPackages.filter(
    (item) => !selectedApartmentId || item.apartment_id === selectedApartmentId,
  );
  const selectedVisitors = recentVisitors.filter(
    (visitor) => !selectedApartmentId || visitor.apartment_id === selectedApartmentId,
  );
  const selectedPackageHistory = packageHistory.filter(
    (item) => !selectedApartmentId || item.apartment_id === selectedApartmentId,
  );
  const selectedIncidents = recentIncidents.filter(
    (incident) => !selectedApartmentId || incident.apartment_id === selectedApartmentId,
  );
  const historyRows = [
    ...selectedPackageHistory.map((item) => ({
      id: `package-${item.id}`,
      type: "Encomenda",
      title: item.recipient_name ?? "Encomenda registrada",
      detail: item.description ?? (item.status === "picked_up" ? "Retirada" : "Aguardando retirada"),
      status: item.status ?? "waiting",
      created_at: item.created_at,
    })),
    ...selectedVisitors.map((visitor) => ({
      id: `visitor-${visitor.id}`,
      type: "Visitante",
      title: visitor.visitor_name ?? "Visitante registrado",
      detail: visitor.message ?? "Solicitação de contato registrada",
      status: visitor.status,
      created_at: visitor.created_at,
    })),
    ...selectedIncidents.map((incident) => ({
      id: `incident-${incident.id}`,
      type: "Ocorrência",
      title: incident.title ?? "Ocorrência registrada",
      detail: incident.description ?? "Sem descrição",
      status: incident.status ?? "open",
      created_at: incident.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condoName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Guarita/Cancela
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Painel operacional rápido, com dados limitados e ações de portaria.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Busca por apartamento</h2>
          </div>
          <form action={searchAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="condominium_id" value={condoId} />
            <Input name="search" placeholder="Ex: Bloco A, 101, 12" />
            <Button type="submit" disabled={searchPending}>
              {searchPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Buscar
            </Button>
          </form>
          <StateMessage state={searchState} />
          {searchState.results?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {searchState.results.map((result) => (
                <div key={result.apartment_id} className="rounded-lg border bg-muted p-4">
                  <p className="font-semibold">
                    {result.block_name} - {result.apartment_number}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.resident_name ?? "Morador autorizado"}
                  </p>
                  {result.phone_display ? (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      {result.phone_display}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSelectedApartmentId(result.apartment_id)}
                  >
                    Usar em registros
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {canInviteDoorman ? (
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Convidar guarita</h2>
            </div>
            <form action={inviteAction} className="mt-4 space-y-3">
              <input type="hidden" name="condominium_id" value={condoId} />
              <Input name="email" type="email" placeholder="operador@email.com" />
              <Input name="phone" placeholder="Telefone opcional" />
              <Button type="submit" disabled={invitePending} className="w-full">
                {invitePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar convite
              </Button>
            </form>
            <StateMessage state={inviteState} />
            {inviteState.inviteUrl ? (
              <p className="mt-3 break-all rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {inviteState.inviteUrl}
              </p>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Card className="border-primary/35 bg-primary/5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Apartamento em atendimento</p>
            <h2 className="mt-1 text-2xl font-semibold">{selectedApartmentLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Encomenda, visitante e ocorrência serão vinculados a esta unidade.
            </p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <Label htmlFor="shared-apartment" className="mt-5 block">Trocar apartamento</Label>
        <select
          id="shared-apartment"
          value={selectedApartmentId}
          onChange={(event) => setSelectedApartmentId(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {apartment.blocks?.name ?? "Bloco"} - {apartment.number}
            </option>
          ))}
        </select>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Agenda de hoje da unidade</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {selectedBookings.length ? (
            selectedBookings.map((booking) => (
              <div key={booking.id} className="rounded-lg border bg-muted p-4">
                <StatusBadge tone={booking.status === "approved" ? "success" : "warning"}>
                  {booking.status === "approved" ? "Aprovado" : "Pendente"}
                </StatusBadge>
                <p className="mt-3 font-semibold">
                  {booking.common_areas?.name ?? booking.title ?? "Reserva"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(booking.start_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(booking.end_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma reserva prevista para hoje neste apartamento.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Registrar encomenda</h2>
          </div>
          <form action={packageAction} className="mt-4 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="apartment_id" value={selectedApartmentId} />
            <Input name="recipient_name" placeholder="Destinatário" />
            <Input name="description" placeholder="Descrição opcional" />
            <PackagePhotoUploadField condoId={condoId} />
            <Button type="submit" disabled={packagePending} className="w-full">
              Registrar encomenda
            </Button>
          </form>
          <StateMessage state={packageState} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Registrar visitante</h2>
          </div>
          <form action={visitorAction} className="mt-4 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="apartment_id" value={selectedApartmentId} />
            <Input name="visitor_name" placeholder="Nome do visitante" />
            <Input name="visitor_phone" placeholder="Telefone opcional" />
            <Input name="message" placeholder="Observação opcional" />
            <Button type="submit" disabled={visitorPending} className="w-full">
              Registrar visitante
            </Button>
          </form>
          <StateMessage state={visitorState} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">Criar ocorrência</h2>
          </div>
          <form action={incidentAction} className="mt-4 space-y-3">
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="apartment_id" value={selectedApartmentId} />
            <Input name="title" placeholder="Título" />
            <Input name="description" placeholder="Descrição" />
            <Button type="submit" disabled={incidentPending} className="w-full">
              Criar ocorrência
            </Button>
          </form>
          <StateMessage state={incidentState} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Encomendas aguardando retirada</h2>
          <div className="mt-4 space-y-3">
            {selectedWaitingPackages.length ? (
              selectedWaitingPackages.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {item.apartments?.blocks?.name} - {item.apartments?.number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.recipient_name ?? "Destinatário não informado"}
                      </p>
                    </div>
                    <StatusBadge tone="warning">Aguardando</StatusBadge>
                  </div>
                  <form action={markPackagePickedUpAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="condominium_id" value={condoId} />
                    <input type="hidden" name="package_id" value={item.id} />
                    <Input name="picked_up_by" placeholder="Retirado por" />
                    <Button type="submit" size="icon" variant="outline">
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma encomenda aguardando para esta unidade.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Visitantes recentes</h2>
          <div className="mt-4 space-y-3">
            {selectedVisitors.length ? (
              selectedVisitors.slice(0, 6).map((visitor) => (
                <div key={visitor.id} className="rounded-lg border bg-muted p-4">
                  <p className="font-semibold">{visitor.visitor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {visitor.apartments?.blocks?.name ?? "Bloco"} - {visitor.apartments?.number ?? visitor.apartment_number ?? "não informado"}
                  </p>
                  <StatusBadge>{visitor.status}</StatusBadge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum visitante recente nesta unidade.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Alertas do condomínio</h2>
          </div>
          <div className="mt-4 space-y-3">
            {announcements.length ? (
              announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-lg border bg-muted p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{announcement.title}</p>
                    {announcement.urgent ? <StatusBadge tone="warning">Urgente</StatusBadge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {announcement.body}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem alertas para guarita.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Histórico da guarita</h2>
              <p className="text-sm text-muted-foreground">
                Registros dos últimos 3 meses para {selectedApartmentLabel}. O painel diário reinicia a cada data.
              </p>
            </div>
          </div>
          <StatusBadge tone="warning">90 dias</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {historyRows.length ? (
            historyRows.slice(0, 12).map((row) => (
              <div key={row.id} className="rounded-lg border bg-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-primary">{row.type}</p>
                  <StatusBadge>{row.status}</StatusBadge>
                </div>
                <p className="mt-2 font-semibold">{row.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.detail}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(row.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum registro encontrado para esta unidade nos últimos 3 meses.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
