import {
  Building2,
  CalendarDays,
  Inbox,
  KeyRound,
  Megaphone,
  QrCode,
  UserRoundCheck,
  Users,
} from "lucide-react";

export const featurePages = {
  comunicados: {
    path: "/recursos/comunicados",
    slug: "comunicados",
    icon: Megaphone,
    title: "Comunicados para condomínio com leitura organizada",
    description:
      "Publique avisos oficiais para todos, blocos, apartamentos ou papéis, mantendo a comunicação do condomínio em um canal claro.",
    keywords: ["comunicados para condomínio", "app para moradores de condomínio", "comunicação condominial"],
    bullets: ["Comunicados urgentes e fixados", "Envio por público-alvo", "Confirmação de leitura conforme plano"],
    sections: [
      { title: "Menos ruído", body: "O síndico comunica o que importa sem depender apenas de grupos informais." },
      { title: "Histórico acessível", body: "Moradores encontram avisos importantes em uma área organizada e pesquisável." },
      { title: "Permissões", body: "Administradores definem quem pode criar, editar, apagar e enviar para todos." },
    ],
    faq: [
      { question: "O Meus Condomínios substitui o WhatsApp?", answer: "Não necessariamente. Ele organiza o comunicado oficial e apoia compartilhamento manual ou notificações conforme o plano." },
      { question: "Dá para enviar comunicado só para um bloco?", answer: "Sim. O Meus Condomínios prevê envio por todos, bloco, apartamento ou papel." },
    ],
  },
  agendamentos: {
    path: "/recursos/agendamentos",
    slug: "agendamentos",
    icon: CalendarDays,
    title: "Reserva de salão de festas e áreas comuns online",
    description:
      "Moradores visualizam calendário, escolhem horários disponíveis e enviam reservas com regras do condomínio.",
    keywords: ["reserva de salão de festas condomínio", "agenda de áreas comuns", "gestão de condomínio online"],
    bullets: ["Calendário mensal, semanal e diário", "Bloqueio de conflito de horário", "Aprovação quando a área exigir"],
    sections: [
      { title: "Calendário visual", body: "A experiência principal é uma agenda real, fácil de tocar no celular." },
      { title: "Regras no backend", body: "Horários, antecedência, limites e conflitos são validados no servidor." },
      { title: "Fluxo simples", body: "Escolha área, data, horário, leia as regras e confirme o aceite." },
    ],
    faq: [
      { question: "O sistema impede duas reservas no mesmo horário?", answer: "Sim. A interface mostra horários e o backend bloqueia conflitos conforme as regras configuradas." },
      { question: "Reservas podem precisar de aprovação?", answer: "Sim. Cada área comum pode exigir aprovação da administração." },
    ],
  },
  encomendas: {
    path: "/recursos/encomendas",
    slug: "encomendas",
    icon: Inbox,
    title: "Controle de encomendas para condomínio",
    description:
      "A portaria registra encomendas por apartamento e acompanha retirada sem expor dados desnecessários dos moradores.",
    keywords: ["controle de encomendas condomínio", "sistema de portaria condomínio"],
    bullets: ["Registro por apartamento", "Status aguardando retirada", "Retirada com responsável"],
    sections: [
      { title: "Portaria rápida", body: "A guarita registra encomendas em poucos campos, com acesso limitado." },
      { title: "Morador informado", body: "O morador consulta suas encomendas e recebe avisos conforme consentimento." },
      { title: "Histórico", body: "A administração mantém rastreabilidade sem planilhas paralelas." },
    ],
    faq: [
      { question: "A guarita vê todos os dados do morador?", answer: "Não. O Meus Condomínios limita dados conforme permissões." },
      { question: "É possível adicionar foto?", answer: "Sim, o fluxo prevê foto da encomenda conforme configuração e plano." },
    ],
  },
  guarita: {
    path: "/recursos/guarita",
    slug: "guarita",
    icon: KeyRound,
    title: "Sistema de portaria e guarita para condomínio",
    description:
      "Painel simples para porteiro, cancela ou guarita buscar apartamento, registrar visitantes, encomendas e ocorrências.",
    keywords: ["sistema de portaria condomínio", "controle de visitantes condomínio", "guarita condomínio"],
    bullets: ["Busca limitada por apartamento", "Visitantes e ocorrências", "Permissões para proteger dados"],
    sections: [
      { title: "Foco operacional", body: "A tela da guarita é rápida e direta, pensada para uso durante atendimento." },
      { title: "Privacidade", body: "Telefones e dados completos só aparecem se a administração permitir." },
      { title: "Registro consultável", body: "Ações importantes geram histórico e auditoria." },
    ],
    faq: [
      { question: "O porteiro consegue alterar plano ou permissões?", answer: "Não. O papel guarita é restrito às funções operacionais autorizadas." },
      { question: "Dá para registrar ocorrência pela portaria?", answer: "Sim, se o papel tiver permissão para criar ocorrência." },
    ],
  },
  "qr-code-condominio": {
    path: "/recursos/qr-code-condominio",
    slug: "qr-code-condominio",
    icon: QrCode,
    title: "QR Code para condomínio sem expor dados de moradores",
    description:
      "Visitantes solicitam contato por QR Code público sem listar apartamentos, nomes completos, telefones ou e-mails.",
    keywords: ["QR Code para condomínio", "visitante condomínio", "portaria digital condomínio"],
    bullets: ["Busca com mensagens genéricas", "Rate limit e logs com hashes", "Privacidade configurável pelo morador"],
    sections: [
      { title: "Sem listagem pública", body: "O QR público usa mensagens genéricas e não revela se um morador ou apartamento existe." },
      { title: "Contato controlado", body: "Moradores escolhem como podem ser encontrados e contatados." },
      { title: "Administração acompanha", body: "Solicitações ficam registradas para análise e melhoria do atendimento." },
    ],
    faq: [
      { question: "O QR lista moradores?", answer: "Não. O fluxo evita listagem e enumeração fácil de dados." },
      { question: "O morador pode desativar busca pública?", answer: "Sim. As preferências de privacidade controlam o comportamento." },
    ],
  },
  sindico: {
    path: "/recursos/sindico",
    slug: "sindico",
    icon: UserRoundCheck,
    title: "Sistema para síndico com permissões controladas",
    description:
      "O assinante define se será o síndico ou convidará outra pessoa, liberando apenas as permissões necessárias.",
    keywords: ["sistema para síndico", "app para síndico", "gestão de condomínio online"],
    bullets: ["Síndico próprio ou convidado", "Permissões por toggle", "Histórico e auditoria"],
    sections: [
      { title: "Assinante no controle", body: "O assinante principal mantém acesso total e não pode ser limitado." },
      { title: "Delegação com permissões", body: "O síndico administra moradores, comunicados e reservas apenas quando permitido." },
      { title: "Convite simples", body: "O cadastro do síndico pede só dados necessários." },
    ],
    faq: [
      { question: "O admin pode ser o síndico?", answer: "Sim. O Meus Condomínios prevê o assinante como síndico ou convite para outra pessoa." },
      { question: "O síndico pode cancelar plano?", answer: "Não por padrão. Assinatura é controle do assinante principal." },
    ],
  },
  moradores: {
    path: "/recursos/moradores",
    slug: "moradores",
    icon: Users,
    title: "App para moradores de condomínio",
    description:
      "Moradores acessam comunicados, reservas, solicitações, encomendas e dados do próprio apartamento com privacidade.",
    keywords: ["app para moradores de condomínio", "aplicativo condomínio moradores"],
    bullets: ["Cadastro por convite", "Aprovação da administração", "Privacidade por preferência"],
    sections: [
      { title: "Entrada organizada", body: "O morador entra por convite e fica pendente até aprovação." },
      { title: "Rotina no celular", body: "Avisos, reservas e solicitações ficam fáceis de acessar." },
      { title: "Dados com acesso controlado", body: "Moradores não devem ver dados de outros apartamentos fora das regras e permissões." },
    ],
    faq: [
      { question: "Morador pendente acessa dados internos?", answer: "Não. O acesso interno depende de aprovação." },
      { question: "Proprietário pode ser diferente do morador?", answer: "Sim. O Meus Condomínios prevê morador, proprietário ou ambos." },
    ],
  },
  "sistema-condominio": {
    path: "/recursos",
    slug: "sistema-condominio",
    icon: Building2,
    title: "Sistema para condomínio online",
    description:
      "Uma base moderna para síndicos e administradoras centralizarem moradores, áreas comuns, portaria e comunicação.",
    keywords: ["sistema para condomínio", "app para condomínio", "gestão de condomínio online"],
    bullets: ["Dados separados por condomínio", "Controle de acesso por perfil", "Mobile-first"],
    sections: [
      { title: "Organização", body: "Cada condomínio tem seus dados isolados e administrados por papéis." },
      { title: "Operação diária", body: "Agendamentos, encomendas, comunicados e solicitações saem da planilha." },
      { title: "Segurança", body: "Permissões, auditoria e privacidade apoiam uma operação mais responsável." },
    ],
    faq: [
      { question: "O Meus Condomínios é para condomínios pequenos?", answer: "Sim. Há plano gratuito para começar e planos pagos para crescer." },
      { question: "Funciona bem no celular?", answer: "Sim. A experiência foi pensada como mobile-first." },
    ],
  },
} as const;

export const blogPosts = {
  "sistema-para-condominio": {
    path: "/blog/sistema-para-condominio",
    title: "Sistema para condomínio: como escolher uma solução simples e responsável",
    description: "Veja critérios práticos para escolher um sistema para condomínio sem aumentar a complexidade da rotina.",
    keyword: "sistema para condomínio",
    date: "2026-05-19",
  },
  "app-para-sindico": {
    path: "/blog/app-para-sindico",
    title: "App para síndico: o que precisa existir além de avisos",
    description: "Um app para síndico deve organizar permissões, moradores, reservas e portaria sem expor dados desnecessários.",
    keyword: "app para síndico",
    date: "2026-05-19",
  },
  "como-organizar-comunicacao-condominio": {
    path: "/blog/como-organizar-comunicacao-condominio",
    title: "Como organizar a comunicação do condomínio sem depender só de grupos",
    description: "Boas práticas para comunicados oficiais, leitura, histórico e mensagens importantes no condomínio.",
    keyword: "comunicados para condomínio",
    date: "2026-05-19",
  },
  "controle-de-encomendas-condominio": {
    path: "/blog/controle-de-encomendas-condominio",
    title: "Controle de encomendas no condomínio: como reduzir falhas na portaria",
    description: "Entenda como registrar, avisar e rastrear encomendas no condomínio com mais cuidado e organização.",
    keyword: "controle de encomendas condomínio",
    date: "2026-05-19",
  },
  "reserva-de-salao-de-festas-online": {
    path: "/blog/reserva-de-salao-de-festas-online",
    title: "Reserva de salão de festas online: regras, calendário e aprovação",
    description: "Como organizar reservas de salão e áreas comuns com calendário, horários e regras claras.",
    keyword: "reserva de salão de festas condomínio",
    date: "2026-05-19",
  },
} as const;
