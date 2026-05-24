export const editableRoles = ["admin", "syndic", "doorman", "resident", "owner"] as const;
export const systemRoles = ["subscriber_admin", ...editableRoles] as const;

export type EditableRole = (typeof editableRoles)[number];
export type SystemRole = (typeof systemRoles)[number];

export const roleLabels: Record<SystemRole, string> = {
  subscriber_admin: "Assinante principal",
  admin: "Admin adicional",
  syndic: "Síndico",
  doorman: "Guarita",
  resident: "Morador",
  owner: "Proprietário",
};

export const permissionGroups = [
  {
    title: "Apartamentos",
    permissions: [
      ["apartments.view_grid", "Ver grade de apartamentos", "Permite visualizar a listagem geral de unidades."],
      ["apartments.view_details", "Ver detalhes", "Permite abrir a ficha da unidade."],
      ["apartments.view_contacts", "Ver contatos da unidade", "Exibe contatos vinculados ao apartamento."],
      ["apartments.edit", "Editar apartamentos", "Permite alterar dados cadastrais da unidade."],
      ["apartments.create", "Criar apartamentos", "Permite cadastrar novas unidades."],
      ["apartments.delete", "Excluir apartamentos", "Remove unidades do condomínio."],
      ["apartments.private_notes", "Notas privadas", "Exibe observações internas da administração."],
    ],
  },
  {
    title: "Moradores",
    permissions: [
      ["residents.view", "Ver moradores", "Permite consultar moradores vinculados."],
      ["residents.approve", "Aprovar moradores", "Aprova cadastros pendentes."],
      ["residents.block", "Bloquear moradores", "Suspende acesso de moradores."],
      ["residents.edit", "Editar moradores", "Permite alterar dados de moradores."],
      ["residents.invite", "Convidar moradores", "Gera links de cadastro para moradores."],
      ["residents.view_phone", "Ver telefone", "Exibe telefone dos moradores."],
      ["residents.view_email", "Ver e-mail", "Exibe e-mail dos moradores."],
    ],
  },
  {
    title: "Síndico",
    permissions: [
      ["syndic.view", "Ver síndico", "Consulta dados do síndico atual."],
      ["syndic.invite", "Convidar síndico", "Gera convite para síndico."],
      ["syndic.change", "Trocar síndico", "Permite alterar o síndico principal."],
      ["syndic.remove", "Remover síndico", "Remove ou suspende síndicos."],
      ["syndic.manage_permissions", "Gerenciar permissões de síndico", "Permite que síndicos alterem permissões quando liberado."],
      ["syndic.view_history", "Ver histórico", "Mostra histórico básico de síndicos."],
    ],
  },
  {
    title: "Guarita/Cancela",
    permissions: [
      ["gate.view_panel", "Ver painel da guarita", "Acessa a operação de portaria."],
      ["gate.search_apartment_limited", "Busca limitada de apartamento", "Permite localizar unidade sem dados sensíveis."],
      ["gate.register_package", "Registrar encomenda", "Permite lançar encomendas recebidas."],
      ["gate.register_visitor", "Registrar visitante", "Permite registrar visitantes e acessos."],
      ["gate.create_incident", "Criar ocorrência", "Permite registrar ocorrências da portaria."],
      ["gate.call_resident", "Chamar morador", "Permite acionar morador pela portaria."],
      ["gate.view_resident_phone_masked", "Telefone mascarado", "Mostra telefone parcialmente oculto."],
      ["gate.view_resident_phone_full", "Telefone completo", "Mostra telefone completo do morador."],
    ],
  },
  {
    title: "Comunicados",
    permissions: [
      ["announcements.view", "Ver comunicados", "Permite ler comunicados."],
      ["announcements.create", "Criar comunicados", "Permite publicar novos avisos."],
      ["announcements.edit", "Editar comunicados", "Permite ajustar comunicados publicados."],
      ["announcements.delete", "Excluir comunicados", "Remove comunicados."],
      ["announcements.send_to_all", "Enviar para todos", "Dispara comunicado para todo o condomínio."],
      ["announcements.send_to_block", "Enviar para bloco", "Segmenta comunicado por bloco."],
      ["announcements.send_to_apartment", "Enviar para apartamento", "Segmenta comunicado por unidade."],
      ["announcements.view_reads", "Ver leituras", "Mostra confirmação de leitura."],
    ],
  },
  {
    title: "Agendamentos",
    permissions: [
      ["bookings.view", "Ver agenda", "Permite consultar agenda de áreas comuns."],
      ["bookings.create", "Criar reserva", "Permite solicitar reservas."],
      ["bookings.approve", "Aprovar reserva", "Aprova reservas pendentes."],
      ["bookings.cancel_own", "Cancelar próprias", "Cancela reservas do próprio usuário."],
      ["bookings.cancel_any", "Cancelar qualquer reserva", "Cancela reservas de terceiros."],
      ["bookings.manage_rules", "Gerenciar regras", "Edita regras de reserva."],
      ["bookings.view_all", "Ver todas", "Mostra todas as reservas do condomínio."],
    ],
  },
  {
    title: "Áreas comuns",
    permissions: [
      ["common_areas.view", "Ver áreas", "Consulta áreas comuns."],
      ["common_areas.create", "Criar áreas", "Cadastra novas áreas comuns."],
      ["common_areas.edit", "Editar áreas", "Edita dados e regras de áreas."],
      ["common_areas.delete", "Excluir áreas", "Remove áreas comuns."],
    ],
  },
  {
    title: "Solicitações",
    permissions: [
      ["tickets.view_own", "Ver próprias", "Mostra solicitações do próprio usuário."],
      ["tickets.view_all", "Ver todas", "Mostra todas as solicitações."],
      ["tickets.create", "Criar solicitação", "Permite abrir chamados."],
      ["tickets.reply", "Responder", "Permite responder solicitações."],
      ["tickets.assign", "Atribuir", "Define responsável pelo chamado."],
      ["tickets.change_status", "Alterar status", "Move solicitação entre estados."],
      ["tickets.delete", "Excluir", "Remove solicitações."],
    ],
  },
  {
    title: "Encomendas",
    permissions: [
      ["packages.view_own", "Ver próprias", "Mostra encomendas da própria unidade."],
      ["packages.view_all", "Ver todas", "Mostra todas as encomendas."],
      ["packages.create", "Criar", "Registra encomendas."],
      ["packages.edit", "Editar", "Edita encomendas registradas."],
      ["packages.mark_picked_up", "Marcar retirada", "Registra retirada de encomenda."],
      ["packages.delete", "Excluir", "Remove registros de encomenda."],
      ["packages.upload_photo", "Enviar foto", "Anexa imagem da encomenda."],
    ],
  },
  {
    title: "Documentos",
    permissions: [
      ["documents.view", "Ver documentos", "Consulta documentos liberados."],
      ["documents.upload", "Enviar documentos", "Faz upload de arquivos."],
      ["documents.delete", "Excluir documentos", "Remove arquivos."],
      ["documents.admin_only", "Administrativos", "Acessa documentos restritos."],
    ],
  },
  {
    title: "Ocorrências",
    permissions: [
      ["incidents.create", "Criar ocorrência", "Registra uma nova ocorrência."],
      ["incidents.review", "Revisar ocorrência", "Permite analisar e tratar ocorrências."],
    ],
  },
  {
    title: "QR público",
    permissions: [
      ["public_qr.manage", "Gerenciar QR", "Configura QR público do condomínio."],
      ["public_qr.enable", "Ativar QR", "Habilita QR público."],
      ["public_qr.disable", "Desativar QR", "Desabilita QR público."],
      ["public_qr.view_logs", "Ver logs", "Consulta registros de uso do QR."],
    ],
  },
  {
    title: "Assinatura",
    sensitive: true,
    permissions: [
      ["billing.view", "Ver assinatura", "Consulta plano e cobrança."],
      ["billing.manage", "Gerenciar assinatura", "Altera dados de cobrança."],
      ["billing.change_plan", "Trocar plano", "Permite mudar de plano."],
      ["billing.cancel", "Cancelar assinatura", "Cancela o plano do condomínio."],
    ],
  },
  {
    title: "Configurações",
    sensitive: true,
    permissions: [
      ["settings.view", "Ver configurações", "Consulta configurações do condomínio."],
      ["settings.edit", "Editar configurações", "Altera dados gerais do condomínio."],
      ["settings.security", "Segurança", "Altera opções de segurança."],
      ["security.view_reports", "Ver denúncias", "Consulta denúncias de abuso do condomínio."],
      ["security.view_incidents", "Ver incidentes", "Consulta incidentes de segurança do condomínio."],
      ["security.manage_incidents", "Responder incidentes", "Atualiza triagem, severidade e ações tomadas."],
      ["settings.privacy", "Privacidade", "Altera preferências de privacidade."],
      ["settings.roles", "Papéis e permissões", "Permite gerenciar permissões de outros papéis."],
    ],
  },
  {
    title: "Logs",
    sensitive: true,
    permissions: [
      ["audit_logs.view", "Ver logs", "Consulta ações administrativas."],
      ["audit_logs.export", "Exportar logs", "Exporta trilhas de auditoria."],
    ],
  },
  {
    title: "Privacidade",
    sensitive: true,
    permissions: [
      ["privacy.view_sensitive", "Ver dados sensíveis", "Exibe dados pessoais sensíveis."],
      ["privacy.export_data", "Exportar dados", "Exporta dados pessoais."],
      ["privacy.delete_data_request", "Solicitar exclusão", "Gerencia pedidos de exclusão de dados."],
    ],
  },
] as const;

export type PermissionKey =
  (typeof permissionGroups)[number]["permissions"][number][0];

export const allPermissionKeys = permissionGroups.flatMap((group) =>
  group.permissions.map(([key]) => key),
) as PermissionKey[];

export const forbiddenPermissionsByRole: Partial<Record<EditableRole, PermissionKey[]>> = {
  doorman: [
    "billing.manage",
    "billing.change_plan",
    "billing.cancel",
    "settings.roles",
    "privacy.export_data",
    "security.view_incidents",
    "security.manage_incidents",
  ],
  resident: [
    "apartments.view_grid",
    "apartments.view_contacts",
    "apartments.edit",
    "apartments.create",
    "apartments.delete",
    "apartments.private_notes",
    "residents.view",
    "residents.approve",
    "residents.block",
    "residents.edit",
    "residents.invite",
    "residents.view_phone",
    "residents.view_email",
    "tickets.view_all",
    "packages.view_all",
    "billing.manage",
    "billing.change_plan",
    "billing.cancel",
    "settings.roles",
    "privacy.export_data",
    "privacy.view_sensitive",
    "security.view_incidents",
    "security.manage_incidents",
  ],
  owner: [
    "apartments.view_grid",
    "apartments.view_contacts",
    "apartments.edit",
    "apartments.create",
    "apartments.delete",
    "apartments.private_notes",
    "residents.view",
    "residents.approve",
    "residents.block",
    "residents.edit",
    "residents.invite",
    "residents.view_phone",
    "residents.view_email",
    "tickets.view_all",
    "packages.view_all",
    "billing.manage",
    "billing.change_plan",
    "billing.cancel",
    "settings.roles",
    "privacy.export_data",
    "privacy.view_sensitive",
    "security.view_incidents",
    "security.manage_incidents",
  ],
};

function makePreset(enabled: PermissionKey[]) {
  return Object.fromEntries(
    allPermissionKeys.map((key) => [key, enabled.includes(key)]),
  ) as Record<PermissionKey, boolean>;
}

export const rolePermissionPresets: Record<EditableRole, Record<PermissionKey, boolean>> = {
  admin: makePreset([
    "apartments.view_grid",
    "apartments.view_details",
    "apartments.view_contacts",
    "apartments.edit",
    "apartments.create",
    "residents.view",
    "residents.approve",
    "residents.edit",
    "residents.invite",
    "residents.view_phone",
    "residents.view_email",
    "syndic.view",
    "syndic.invite",
    "syndic.view_history",
    "gate.view_panel",
    "announcements.view",
    "announcements.create",
    "announcements.edit",
    "announcements.send_to_all",
    "bookings.view",
    "bookings.approve",
    "bookings.cancel_any",
    "bookings.view_all",
    "common_areas.view",
    "common_areas.create",
    "common_areas.edit",
    "tickets.view_all",
    "tickets.reply",
    "tickets.assign",
    "tickets.change_status",
    "packages.view_all",
    "packages.create",
    "packages.edit",
    "packages.mark_picked_up",
    "documents.view",
    "documents.upload",
    "public_qr.manage",
    "settings.view",
    "settings.edit",
    "security.view_incidents",
    "security.manage_incidents",
    "audit_logs.view",
  ]),
  syndic: makePreset([
    "apartments.view_grid",
    "apartments.view_details",
    "apartments.view_contacts",
    "residents.view",
    "residents.approve",
    "residents.invite",
    "announcements.view",
    "announcements.create",
    "announcements.send_to_all",
    "bookings.view_all",
    "bookings.approve",
    "tickets.view_all",
    "tickets.reply",
    "tickets.change_status",
    "packages.view_all",
    "documents.view",
    "incidents.create",
    "incidents.review",
    "settings.view",
  ]),
  doorman: makePreset([
    "gate.view_panel",
    "gate.search_apartment_limited",
    "gate.register_package",
    "gate.register_visitor",
    "gate.create_incident",
    "gate.call_resident",
    "gate.view_resident_phone_masked",
    "packages.view_all",
    "packages.create",
    "packages.mark_picked_up",
    "packages.upload_photo",
  ]),
  resident: makePreset([
    "announcements.view",
    "bookings.view",
    "bookings.create",
    "bookings.cancel_own",
    "common_areas.view",
    "tickets.view_own",
    "tickets.create",
    "packages.view_own",
    "documents.view",
  ]),
  owner: makePreset([
    "announcements.view",
    "bookings.view",
    "common_areas.view",
    "tickets.view_own",
    "tickets.create",
    "packages.view_own",
    "documents.view",
  ]),
};

export const defaultSyndicPermissions = rolePermissionPresets.syndic;

export const sensitivePermissionKeys = permissionGroups
  .filter((group) => "sensitive" in group && group.sensitive)
  .flatMap((group) => group.permissions.map(([key]) => key));

export function sanitizeRolePermissions(
  role: EditableRole,
  permissions: Record<string, boolean>,
) {
  const forbidden = new Set(forbiddenPermissionsByRole[role] ?? []);

  return Object.fromEntries(
    allPermissionKeys.map((key) => [key, forbidden.has(key) ? false : permissions[key] === true]),
  ) as Record<PermissionKey, boolean>;
}

export const planLimits = {
  free: {
    label: "Free",
    maxBlocks: 2,
    maxApartmentsPerBlock: 12,
    maxTotalApartments: 24,
    maxSyndics: 1,
    advancedPermissions: false,
  },
  premium: {
    label: "Premium",
    maxBlocks: 4,
    maxApartmentsPerBlock: 20,
    maxTotalApartments: 80,
    maxSyndics: 2,
    advancedPermissions: true,
  },
  pro: {
    label: "Pro",
    maxBlocks: 8,
    maxApartmentsPerBlock: 30,
    maxTotalApartments: 240,
    maxSyndics: 6,
    advancedPermissions: true,
  },
  total: {
    label: "Total",
    maxBlocks: 20,
    maxApartmentsPerBlock: 50,
    maxTotalApartments: 1000,
    maxSyndics: 20,
    advancedPermissions: true,
  },
} as const;

export type PlanKey = keyof typeof planLimits;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
