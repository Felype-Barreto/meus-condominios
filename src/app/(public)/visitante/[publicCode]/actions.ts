"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicQrRequestSchema } from "@/lib/validations/public-qr";

export type PublicQrRequestState = {
  status: "idle" | "success" | "error" | "limited" | "disabled";
  message?: string;
  matched?: boolean;
  requestId?: string;
};

function hashIp(value: string) {
  return createHash("sha256")
    .update(`${value}:${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "morai"}`)
    .digest("hex");
}

async function requestFingerprint() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "local";
  return {
    ipHash: hashIp(ip),
    userAgent: headerStore.get("user-agent") ?? "unknown",
  };
}

export async function submitPublicQrRequestAction(
  _previousState: PublicQrRequestState,
  formData: FormData,
): Promise<PublicQrRequestState> {
  const parsed = publicQrRequestSchema.safeParse({
    public_code: String(formData.get("public_code") ?? ""),
    search: String(formData.get("search") ?? ""),
    visitor_name: String(formData.get("visitor_name") ?? ""),
    visitor_phone: String(formData.get("visitor_phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const { ipHash, userAgent } = await requestFingerprint();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_public_qr_request", {
    qr_public_code: parsed.data.public_code,
    search_term: parsed.data.search,
    visitor_name_input: parsed.data.visitor_name ?? "",
    visitor_phone_input: parsed.data.visitor_phone ?? "",
    visitor_message: parsed.data.message,
    request_ip_hash: ipHash,
    request_user_agent: userAgent,
  });

  if (error) {
    return {
      status: "error",
      message: "Não foi possível registrar a solicitação agora. Tente novamente em instantes.",
    };
  }

  const result = data as {
    status?: string;
    matched?: boolean;
    request_id?: string;
  } | null;

  if (result?.status === "rate_limited") {
    return {
      status: "limited",
      message: "Muitas tentativas em pouco tempo. Tente novamente mais tarde.",
    };
  }

  if (result?.status === "disabled") {
    return {
      status: "disabled",
      message: "Este canal de contato não está disponível no momento.",
    };
  }

  return {
    status: "success",
    matched: result?.matched === true,
    requestId: result?.request_id,
    message:
      result?.matched === true
        ? "Solicitação enviada. Aguarde alguns instantes; o responsável será avisado."
        : "Não foi possível concluir a solicitação. Verifique os dados ou fale com a portaria.",
  };
}
