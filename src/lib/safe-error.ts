export function safeActionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();

  const expectedUserErrors = [
    "apartamento",
    "convite",
    "responsaveis",
    "responsáveis",
    "autenticado",
    "obrigatorio",
    "obrigatório",
    "email",
    "e-mail",
  ];

  if (expectedUserErrors.some((fragment) => lower.includes(fragment))) {
    return message;
  }

  if (lower.includes("permiss")) {
    return "Você não tem permissão para executar esta ação.";
  }

  if (lower.includes("limite do plano") || lower.includes("limite de armazenamento")) {
    return message;
  }

  if (lower.includes("já existe reserva") || lower.includes("reserva neste horário")) {
    return "Já existe uma reserva neste horário.";
  }

  if (lower.includes("entre na sua conta")) {
    return "Entre na sua conta para continuar.";
  }

  return "Não foi possível concluir a ação agora. Revise os dados e tente novamente.";
}
