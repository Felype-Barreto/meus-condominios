"use client";

import { Building2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { CaptchaBox } from "@/components/public/captcha-box";
import { GoogleAuthButton } from "@/components/public/google-auth-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already")) {
    return "Este e-mail já tem uma conta. Tente entrar.";
  }

  if (lower.includes("email rate limit")) {
    return "O serviço de e-mail limitou novas mensagens por alguns minutos. Tente entrar; se ainda precisar confirmar, aguarde um pouco antes de pedir outro envio.";
  }

  if (lower.includes("email not confirmed")) {
    return "Seu e-mail ainda está pendente de confirmação. Tente entrar novamente depois de confirmar a mensagem enviada para sua caixa de entrada.";
  }

  if (lower.includes("password")) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  return message || "Não foi possível continuar agora. Revise os dados e tente novamente.";
}

function safeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function AuthCard({
  mode,
  initialNext,
}: {
  mode: "signin" | "signup";
  initialNext?: string | null;
}) {
  const signup = mode === "signup";
  const router = useRouter();
  const nextPath = safeNextPath(
    initialNext ?? null,
    signup ? "/app/novo-condominio" : "/app",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [accountMode, setAccountMode] = useState<"admin" | "condominium">("admin");
  const [savedCondominiumCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("meuscondominios:last-condominium-code") ?? "",
  );

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  async function verifyCaptcha(formData: FormData) {
    const response = await fetch("/api/security/verify-captcha", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: captchaToken,
        fallback: String(formData.get("captcha_fallback") ?? ""),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { success?: boolean };
    return response.ok && result.success === true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const supabase = createSupabaseBrowserClient();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const condominiumCode = String(formData.get("condominium_code") ?? "")
        .trim()
        .toLowerCase();

      if (signup) {
        const parsed = signUpSchema.safeParse({
          name: String(formData.get("name") ?? "").trim(),
          condoName: String(formData.get("condo") ?? "").trim(),
          email,
          password,
          isSyndic: formData.get("is_syndic") === "on",
          acceptTerms: formData.get("accept_terms") === "on",
          acceptAcceptableUse: formData.get("accept_acceptable_use") === "on",
        });

        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
          return;
        }

        if (!(await verifyCaptcha(formData))) {
          setError("Confirme a verificação anti-bot antes de criar a conta.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            captchaToken: captchaToken || undefined,
            data: {
              full_name: parsed.data.name,
              condo_name: parsed.data.condoName,
              is_syndic: parsed.data.isSyndic,
              accepted_terms_at: new Date().toISOString(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          return;
        }

        if (!data.session) {
          setMessage("Conta criada. Enviamos um e-mail de confirmação. Você pode tentar entrar enquanto a confirmação fica pendente, conforme a configuração do projeto.");
          return;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }

      if (accountMode === "condominium") {
        if (!condominiumCode) {
          await supabase.auth.signOut();
          setError("Informe o código do condomínio.");
          return;
        }

        const { data: accessData, error: accessError } = await supabase.rpc(
          "resolve_condominium_login",
          { condo_code: condominiumCode },
        );
        const access = (Array.isArray(accessData) ? accessData[0] : accessData) as
          | { condominium_id?: string; status?: string }
          | null;

        if (accessError || !access?.condominium_id) {
          await supabase.auth.signOut();
          setError("Não encontramos uma conta ativa para este e-mail nesse condomínio.");
          return;
        }

        if (access.status !== "active") {
          await supabase.auth.signOut();
          setError("Seu cadastro nesse condomínio ainda está pendente de aprovação.");
          return;
        }

        window.localStorage.setItem("meuscondominios:last-condominium-code", condominiumCode);
        router.replace(`/app/${access.condominium_id}/dashboard`);
        router.refresh();
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <div className="hidden md:block">
        <p className="text-sm font-semibold text-primary">Meus Condomínios</p>
        <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-normal">
          {signup ? "Comece com um condomínio organizado." : "Acesse seu painel com segurança."}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          Gestão simples para síndico, administração, portaria e moradores, com permissões claras desde o primeiro acesso.
        </p>
        <div className="mt-6 grid max-w-md gap-3">
          {["Convites por link", "Dados separados por condomínio", "Permissões por cargo"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <Card className="w-full p-6 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Meus Condomínios</p>
            <p className="text-xs text-muted-foreground">{signup ? "Criar conta" : "Entrar"}</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold">{signup ? "Criar conta no Meus Condomínios" : "Entrar no Meus Condomínios"}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {signup ? "Cadastre-se e crie seu primeiro condomínio em poucos passos." : "Use seu e-mail e senha para continuar."}
        </p>
        {!signup ? (
          <div className="mt-6 grid grid-cols-2 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setAccountMode("admin")}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                accountMode === "admin"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setAccountMode("condominium")}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                accountMode === "condominium"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Condomínio
            </button>
          </div>
        ) : null}
        {signup || accountMode === "admin" ? (
        <div className="mt-6">
          <GoogleAuthButton nextPath={nextPath} />
        </div>
        ) : null}
        {signup || accountMode === "admin" ? (
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
        ) : (
          <div className="my-5 rounded-lg border bg-muted p-3 text-sm leading-6 text-muted-foreground">
            O código é o identificador do condomínio. O síndico ou admin pode
            informar esse código junto com o convite.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {signup ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" name="name" placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condo">Condomínio</Label>
                <Input id="condo" name="condo" placeholder="Residencial Jardim" required />
              </div>
            </>
          ) : null}
          {!signup && accountMode === "condominium" ? (
            <div className="space-y-2">
              <Label htmlFor="condominium_code">Código do condomínio</Label>
              <Input
                id="condominium_code"
                name="condominium_code"
                placeholder="ex: residencial-cumbaru"
                defaultValue={savedCondominiumCode}
                autoCapitalize="none"
                autoComplete="organization"
                required
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Se você já entrou neste aparelho, o último código usado fica salvo aqui.
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Esqueceu o código? Peça ao administrador do condomínio.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="voce@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
          </div>
          {signup ? (
            <>
              <label className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
                <input name="is_syndic" type="checkbox" className="mt-1 accent-[#7C5C3E]" />
                <span>Eu também serei o síndico deste condomínio por enquanto.</span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-[#E7DCCB] bg-white p-3 text-sm leading-6 text-[#1f1f1f]">
                <input name="accept_terms" type="checkbox" required className="mt-1 accent-[#7C5C3E]" />
                <span>
                  Li e aceito os{" "}
                  <Link className="font-semibold text-primary hover:text-[#5F432C]" href="/termos" target="_blank">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link className="font-semibold text-primary hover:text-[#5F432C]" href="/privacidade" target="_blank">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-[#E7DCCB] bg-white p-3 text-sm leading-6 text-[#1f1f1f]">
                <input name="accept_acceptable_use" type="checkbox" required className="mt-1 accent-[#7C5C3E]" />
                <span>
                  Li e aceito a{" "}
                  <Link className="font-semibold text-primary hover:text-[#5F432C]" href="/uso-aceitavel" target="_blank">
                    Política de Uso Aceitável
                  </Link>
                  .
                </span>
              </label>

              <CaptchaBox onTokenChange={handleCaptchaToken} />
            </>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-success">
              {message}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {signup ? "Criar conta" : "Entrar"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {signup ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <Link
            className="font-semibold text-primary hover:text-[#5F432C]"
            href={`${signup ? "/entrar" : "/cadastro"}?next=${encodeURIComponent(nextPath)}`}
          >
            {signup ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </Card>
    </section>
  );
}
