import {
  Bell,
  CalendarCheck,
  ClipboardList,
  Home,
  Inbox,
  KeyRound,
  Megaphone,
  MessageCircle,
  QrCode,
  ShieldCheck,
  UserCheck,
  Users,
  Warehouse,
} from "lucide-react";

export const announcementTemplates = [
  {
    key: "falta_agua",
    label: "Falta de água",
    title: "Aviso de falta de água",
    body: "Informamos que poderá haver interrupção no abastecimento de água hoje. A administração acompanhará a situação e atualizará os moradores assim que houver previsão de normalização.",
  },
  {
    key: "manutencao_elevador",
    label: "Manutenção do elevador",
    title: "Manutenção programada no elevador",
    body: "O elevador passará por manutenção preventiva no período informado. Pedimos que os moradores se programem e respeitem a sinalização da equipe técnica.",
  },
  {
    key: "assembleia",
    label: "Assembleia",
    title: "Convocação para assembleia",
    body: "Convidamos os moradores e proprietários para assembleia do condomínio. A pauta e os detalhes estão disponíveis no Meus Condomínios.",
  },
  {
    key: "limpeza_caixa",
    label: "Limpeza da caixa d'água",
    title: "Limpeza da caixa d'água",
    body: "A limpeza da caixa d'água será realizada em data programada. Poderá haver oscilação no fornecimento durante o serviço.",
  },
  {
    key: "mudanca",
    label: "Mudança",
    title: "Orientação para mudanças",
    body: "Mudanças devem seguir os horários e regras do condomínio. Antes de iniciar, comunique a administração e a portaria.",
  },
  {
    key: "regra_salao",
    label: "Regra do salão",
    title: "Regras de uso do salão de festas",
    body: "Lembramos que o salão de festas deve ser usado conforme as regras do condomínio, respeitando horários, limpeza e limite de convidados.",
  },
  {
    key: "encomendas",
    label: "Encomendas",
    title: "Retirada de encomendas na portaria",
    body: "Moradores com encomendas aguardando retirada devem procurar a portaria dentro do horário de atendimento.",
  },
  {
    key: "seguranca",
    label: "Segurança",
    title: "Orientação de segurança",
    body: "Pedimos atenção ao acesso de visitantes e prestadores. Em caso de dúvida, acione a portaria ou administração.",
  },
  {
    key: "obra",
    label: "Obra",
    title: "Comunicado sobre obra",
    body: "Informamos que haverá obra ou manutenção em área do condomínio. Pedimos compreensão durante o período de execução.",
  },
];

export const quickActionsByRole = {
  resident: [
    { label: "Reservar", href: "agendamentos", icon: CalendarCheck },
    { label: "Reclamar/sugerir", href: "solicitacoes", icon: ClipboardList },
    { label: "Ver encomenda", href: "encomendas", icon: Inbox },
    { label: "Ler aviso", href: "comunicados", icon: Megaphone },
  ],
  owner: [
    { label: "Reservar", href: "agendamentos", icon: CalendarCheck },
    { label: "Reclamar/sugerir", href: "solicitacoes", icon: ClipboardList },
    { label: "Ver encomenda", href: "encomendas", icon: Inbox },
    { label: "Ler aviso", href: "comunicados", icon: Megaphone },
  ],
  syndic: [
    { label: "Enviar aviso", href: "comunicados", icon: Megaphone },
    { label: "Aprovar reserva", href: "agendamentos", icon: CalendarCheck },
    { label: "Aprovar morador", href: "moradores", icon: UserCheck },
    { label: "Registrar ocorrência", href: "ocorrencias", icon: Bell },
  ],
  admin: [
    { label: "Enviar aviso", href: "comunicados", icon: Megaphone },
    { label: "Aprovar reserva", href: "agendamentos", icon: CalendarCheck },
    { label: "Aprovar morador", href: "moradores", icon: UserCheck },
    { label: "Registrar ocorrência", href: "ocorrencias", icon: Bell },
  ],
  subscriber_admin: [
    { label: "Enviar aviso", href: "comunicados", icon: Megaphone },
    { label: "Aprovar reserva", href: "agendamentos", icon: CalendarCheck },
    { label: "Aprovar morador", href: "moradores", icon: UserCheck },
    { label: "Configurar QR", href: "configuracoes/qr-publico", icon: QrCode },
  ],
  doorman: [
    { label: "Buscar apto", href: "guarita", icon: Home },
    { label: "Registrar encomenda", href: "guarita", icon: Inbox },
    { label: "Registrar visitante", href: "guarita", icon: Users },
    { label: "Criar ocorrência", href: "guarita", icon: Bell },
  ],
};

export const onboardingSteps = [
  { key: "apartments", title: "Criar blocos e apartamentos", href: "apartamentos", icon: Home },
  { key: "syndic", title: "Definir síndico", href: "sindico", icon: UserCheck },
  { key: "residents", title: "Convidar moradores", href: "convites", icon: Users },
  { key: "commonArea", title: "Criar primeira área comum", href: "areas-comuns", icon: Warehouse },
  { key: "announcement", title: "Enviar primeiro aviso", href: "comunicados", icon: Megaphone },
  { key: "qr", title: "Ativar QR Code", href: "configuracoes/qr-publico", icon: QrCode },
  { key: "whatsapp", title: "Configurar WhatsApp", href: "configuracoes/whatsapp", icon: MessageCircle },
  { key: "gate", title: "Configurar Guarita/Cancela", href: "guarita", icon: KeyRound },
];

export const privacySeal = {
  icon: ShieldCheck,
  title: "Seus dados ficam protegidos.",
  description:
    "Seu telefone não aparece publicamente sem permissão. Visitantes e QR público usam fluxo seguro.",
};
