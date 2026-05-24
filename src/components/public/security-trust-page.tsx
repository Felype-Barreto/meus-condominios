import Link from "next/link";
import {
  Bell,
  Building2,
  Database,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  QrCode,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { officialContact } from "@/lib/app-data";

const sections = [
  {
    title: "Privacidade por padrão",
    icon: EyeOff,
    items: [
      "telefone oculto por padrão",
      "QR público sem lista de moradores ou apartamentos",
      "morador controla preferências de contato",
      "dados sensíveis não devem ir para grupos",
    ],
  },
  {
    title: "Controle de acesso",
    icon: KeyRound,
    items: [
      "permissões por cargo",
      "admin, síndico e assinante principal com escopos diferentes",
      "guarita/cancela com painel operacional limitado",
      "morador e proprietário acessam apenas o necessário",
    ],
  },
  {
    title: "Isolamento por condomínio",
    icon: Building2,
    items: [
      "dados separados por condomínio",
      "usuário só acessa condomínios onde tem vínculo ativo",
      "controle de acesso no banco com RLS",
      "rotas internas protegidas por autenticação",
    ],
  },
  {
    title: "Logs administrativos",
    icon: Database,
    items: [
      "alterações de permissões",
      "envios de comunicação",
      "bloqueios e ações sensíveis",
      "convites e alterações importantes",
    ],
  },
  {
    title: "WhatsApp com consentimento",
    icon: MessageCircle,
    items: [
      "opt-in e opt-out por categoria",
      "créditos por plano",
      "fallback manual quando automação não estiver disponível",
      "grupos com proteção contra dados sensíveis",
    ],
  },
  {
    title: "QR Code seguro",
    icon: QrCode,
    items: [
      "não lista moradores, apartamentos, telefones ou e-mails",
      "usa mensagens genéricas para reduzir enumeração",
      "registra tentativas com hashes nos logs de abuso",
      "cria solicitação controlada de contato",
    ],
  },
  {
    title: "Boas práticas",
    icon: UploadCloud,
    items: [
      "validação de dados",
      "controle de uploads",
      "storage privado",
      "backups e monitoramento futuro",
    ],
  },
  {
    title: "Uso responsável",
    icon: ShieldCheck,
    items: [
      "política de uso aceitável",
      "canal para denúncia de abuso",
      "orientação para não expor moradores",
      "camadas de proteção para reduzir riscos",
    ],
  },
];

export function SecurityTrustPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Segurança e confiança</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal md:text-5xl">
            Segurança e privacidade para a rotina do seu condomínio
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            O Meus Condomínios foi projetado com controles de acesso, permissões por cargo,
            telefone oculto por padrão, QR Code seguro e logs administrativos para
            ajudar condomínios a organizar informações com mais responsabilidade.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar condomínio grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/qr-seguro">Entender QR seguro</Link>
            </Button>
          </div>
        </div>

        <Card className="p-5">
          <div className="rounded-lg border bg-background p-4">
            <LockKeyhole className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Camadas de proteção</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O foco é reduzir riscos com boas práticas, controles técnicos e
              configuração clara para cada papel.
            </p>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            {["Permissões por cargo", "Telefone oculto", "QR sem listagem pública", "Logs administrativos"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.title} className="p-5">
            <section.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{section.title}</h2>
            <div className="mt-4 space-y-2">
              {section.items.map((item) => (
                <div key={item} className="rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <Bell className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Como reportar uma falha ou abuso</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Se você encontrou uma falha de segurança ou privacidade, entre em contato pelo e-mail{" "}
            <a className="font-semibold text-primary hover:text-[#5F432C]" href={`mailto:${officialContact}`}>
              {officialContact}
            </a>
            .
          </p>
        </Card>
        <Card className="p-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Transparência sem promessa absoluta</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            O Meus Condomínios usa boas práticas, controles e camadas de proteção projetadas
            para reduzir riscos. Segurança também depende de configuração correta,
            senhas protegidas e uso responsável pelo condomínio.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/uso-aceitavel">Uso aceitável</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/denunciar">Denunciar abuso</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seguranca/reportar">Reportar falha</Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
