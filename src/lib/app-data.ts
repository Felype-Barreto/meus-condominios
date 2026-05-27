import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  History,
  MessagesSquare,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Package,
  ShieldCheck,
  Users,
  UserRoundCheck,
  Warehouse,
} from "lucide-react";
import type { Apartment, SystemRole } from "@/types/domain";

export const officialContact = "codeflowbr1@gmail.com";

export const roleLabels: Record<SystemRole, string> = {
  subscriber_admin: "Assinante",
  admin: "Admin",
  syndic: "Síndico",
  doorman: "Guarita",
  resident: "Morador",
  owner: "Proprietário",
};

export const sidebarItems = [
  { href: "dashboard", label: "Painel geral", icon: LayoutDashboard },
  { href: "historico", label: "Histórico", icon: History },
  { href: "apartamentos", label: "Apartamentos", icon: Building2 },
  { href: "moradores", label: "Pessoas", icon: Users },
  { href: "sindico", label: "Síndico", icon: UserRoundCheck },
  { href: "guarita", label: "Guarita", icon: KeyRound },
  { href: "convites", label: "Convites", icon: Inbox },
  { href: "comunicados", label: "Avisos", icon: Megaphone },
  { href: "comunicacao", label: "Comunicação Pro", icon: MessagesSquare },
  { href: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "areas-comuns", label: "Áreas comuns", icon: Warehouse },
  { href: "solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "encomendas", label: "Encomendas", icon: Package },
  { href: "ocorrencias", label: "Ocorrências", icon: Bell },
  { href: "permissoes", label: "Permissões", icon: ShieldCheck },
  { href: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "suporte", label: "Suporte", icon: LifeBuoy },
];

export const sampleApartments: Apartment[] = [
  { id: "a101", block: "Torre A", number: "101", residents: 3, ownerName: "Carla Mendes", status: "occupied" },
  { id: "a102", block: "Torre A", number: "102", residents: 0, status: "available" },
  { id: "b204", block: "Torre B", number: "204", residents: 2, ownerName: "Rafael Nunes", status: "occupied" },
  { id: "c310", block: "Torre C", number: "310", residents: 1, ownerName: "Lia Rocha", status: "pending" },
];

export const featureCards = [
  {
    icon: Home,
    title: "Cadastro por convite",
    description: "Links seguros para moradores, proprietários, síndico e guarita entrarem no condomínio certo.",
  },
  {
    icon: ShieldCheck,
    title: "Permissões por toggle",
    description: "Defina o que cada papel pode ver e fazer sem compartilhar senhas ou planilhas paralelas.",
  },
  {
    icon: KeyRound,
    title: "Portaria organizada",
    description: "Visitantes, QR público, encomendas e ocorrências em fluxos simples para a rotina diária.",
  },
];
