"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordResetCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const password = String(formData.get("password") ?? "");
      const confirmation = String(formData.get("confirmation") ?? "");

      if (password.length < 8) {
        setError("A senha precisa ter pelo menos 8 caracteres.");
        return;
      }

      if (password !== confirmation) {
        setError("As senhas não conferem.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Senha atualizada. Agora você já pode entrar com o código do condomínio, e-mail e nova senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full p-6">
      <p className="text-sm font-semibold text-primary">Meus Condomínios</p>
      <h1 className="mt-3 text-2xl font-semibold">Redefinir senha</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Crie uma nova senha. O administrador não consegue ver sua senha antiga, apenas enviar este link seguro.
      </p>

      {message ? (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmation">Confirmar nova senha</Label>
          <Input id="confirmation" name="confirmation" type="password" minLength={8} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar nova senha
        </Button>
      </form>

      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/entrar">Voltar para entrar</Link>
      </Button>
    </Card>
  );
}
