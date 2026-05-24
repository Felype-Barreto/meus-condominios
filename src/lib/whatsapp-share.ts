export type WhatsAppShareType =
  | "announcement"
  | "resident_invite"
  | "syndic_invite"
  | "doorman_invite"
  | "package_notice"
  | "booking_notice"
  | "public_qr"
  | "condominium_signup";

export type WhatsAppShareTextInput = {
  type: WhatsAppShareType;
  condominiumName: string;
  title?: string;
  body?: string;
  link?: string;
  apartment?: string;
  date?: string;
  time?: string;
};

export const whatsappShareTypeLabels: Record<WhatsAppShareType, string> = {
  announcement: "Comunicado",
  resident_invite: "Convite de morador",
  syndic_invite: "Convite de síndico",
  doorman_invite: "Convite de guarita",
  package_notice: "Aviso de encomenda",
  booking_notice: "Aviso de agendamento",
  public_qr: "Link do QR público",
  condominium_signup: "Link de cadastro do condomínio",
};

function cleanLine(value?: string) {
  return value?.trim() || "";
}

export function createWhatsAppShareText({
  type,
  condominiumName,
  title,
  body,
  link,
  apartment,
  date,
  time,
}: WhatsAppShareTextInput) {
  const condo = cleanLine(condominiumName) || "condomínio";
  const safeTitle = cleanLine(title);
  const safeBody = cleanLine(body);
  const safeLink = cleanLine(link);
  const safeApartment = cleanLine(apartment);
  const safeDate = cleanLine(date);
  const safeTime = cleanLine(time);

  if (type === "announcement") {
    return [
      `📢 Comunicado do condomínio ${condo}`,
      "",
      safeTitle,
      "",
      safeBody,
      "",
      safeLink ? "Veja no Meus Condomínios:" : "",
      safeLink,
    ].filter(Boolean).join("\n");
  }

  if (type === "package_notice") {
    return [
      "📦 Encomenda disponível",
      "",
      safeApartment ? `Apartamento: ${safeApartment}` : "",
      safeBody ? `Descrição: ${safeBody}` : "",
      "",
      safeLink ? "Acesse o Meus Condomínios:" : "",
      safeLink,
    ].filter(Boolean).join("\n");
  }

  if (type === "booking_notice") {
    return [
      "📅 Agendamento confirmado",
      "",
      safeTitle ? `Espaço: ${safeTitle}` : "",
      safeDate ? `Data: ${safeDate}` : "",
      safeTime ? `Horário: ${safeTime}` : "",
      safeBody,
      "",
      safeLink ? "Veja os detalhes:" : "",
      safeLink,
    ].filter(Boolean).join("\n");
  }

  if (type === "public_qr") {
    return [
      `QR público do condomínio ${condo}`,
      "",
      "Visitantes podem solicitar contato sem acessar dados de moradores.",
      "",
      safeLink ? "Acesse pelo link:" : "",
      safeLink,
    ].filter(Boolean).join("\n");
  }

  if (type === "condominium_signup") {
    return [
      `Cadastro do condomínio ${condo} no Meus Condomínios`,
      "",
      "Use o link abaixo para acessar o ambiente do condomínio:",
      safeLink,
    ].filter(Boolean).join("\n");
  }

  const roleLabel =
    type === "syndic_invite"
      ? "síndico"
      : type === "doorman_invite"
        ? "guarita"
        : "morador";

  return [
    `Olá! Você foi convidado para acessar o condomínio ${condo} no Meus Condomínios.`,
    "",
    `Perfil do convite: ${roleLabel}.`,
    "",
    "Cadastre-se pelo link:",
    safeLink,
  ].filter(Boolean).join("\n");
}
