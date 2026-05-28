"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markAllNotificationsReadAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta.");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) throw new Error("Não foi possível marcar notificações como lidas.");

  revalidatePath("/app/notificacoes");
}

export async function answerVisitorContactRequestAction(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const approve = String(formData.get("answer") ?? "") === "approve";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta.");

  if (!requestId) {
    redirect("/app/notificacoes?visitor_status=error&visitor_message=Solicitacao%20invalida.");
  }

  const { data, error } = await supabase.rpc("release_visitor_contact", {
    request_id: requestId,
    approve,
  });

  if (error) {
    redirect("/app/notificacoes?visitor_status=error&visitor_message=Nao%20foi%20possivel%20responder%20a%20solicitacao.");
  }

  const result = data as { ok?: boolean; message?: string } | null;
  const status = result?.ok === false ? "error" : "success";
  const message = encodeURIComponent(
    result?.message ?? (approve ? "Contato liberado." : "Solicitacao recusada."),
  );

  revalidatePath("/app/notificacoes");
  redirect(`/app/notificacoes?visitor_status=${status}&visitor_message=${message}`);
}
