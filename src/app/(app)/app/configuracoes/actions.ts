"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  full_name: z.string().min(2, "Informe seu nome.").max(120, "Use um nome menor."),
  phone: z.string().max(30, "Use um telefone menor.").optional(),
});

export async function updateAccountProfileAction(formData: FormData) {
  const parsed = profileSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta.");

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: parsed.data.full_name.trim(),
      phone: parsed.data.phone?.trim() || null,
    });

  if (error) throw new Error("Nao foi possivel atualizar sua conta.");

  revalidatePath("/app/configuracoes");
}
