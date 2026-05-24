"use server";

import { revalidatePath } from "next/cache";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  gateIncidentSchema,
  gatePackageSchema,
  gateSearchSchema,
  gateVisitorSchema,
  inviteDoormanSchema,
} from "@/lib/validations/doorman";

export type GateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteUrl?: string;
  results?: GateSearchResult[];
};

export type GateSearchResult = {
  apartment_id: string;
  block_name: string | null;
  apartment_number: string;
  resident_name: string | null;
  phone_display: string | null;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Entre na sua conta para continuar.");
  }

  return supabase;
}

export async function inviteDoormanAction(
  _previousState: GateActionState,
  formData: FormData,
): Promise<GateActionState> {
  const parsed = inviteDoormanSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await requireUser();
    const { data, error } = await supabase.rpc("invite_doorman", {
      condo_id: parsed.data.condominium_id,
      invite_email: parsed.data.email,
      invite_phone: parsed.data.phone,
    });

    if (error) return { status: "error", message: safeActionErrorMessage(error) };

    revalidatePath(`/app/${parsed.data.condominium_id}/guarita`);
    const result = data as { token: string };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      status: "success",
      message: "Convite de guarita criado.",
      inviteUrl: `${appUrl}/convite/${result.token}`,
    };
  } catch (error) {
    return { status: "error", message: safeActionErrorMessage(error) };
  }
}

export async function searchGateApartmentAction(
  _previousState: GateActionState,
  formData: FormData,
): Promise<GateActionState> {
  const parsed = gateSearchSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    search: String(formData.get("search") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_gate_apartments", {
    condo_id: parsed.data.condominium_id,
    search_term: parsed.data.search,
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  return {
    status: "success",
    message: "Busca concluída.",
    results: (data ?? []) as GateSearchResult[],
  };
}

export async function createGatePackageAction(
  _previousState: GateActionState,
  formData: FormData,
): Promise<GateActionState> {
  const parsed = gatePackageSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    apartment_id: String(formData.get("apartment_id") ?? ""),
    recipient_name: String(formData.get("recipient_name") ?? ""),
    description: String(formData.get("description") ?? ""),
    photo_url: String(formData.get("photo_url") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_gate_package", {
    condo_id: parsed.data.condominium_id,
    apt_id: parsed.data.apartment_id,
    recipient: parsed.data.recipient_name,
    package_description: parsed.data.description,
    package_photo_url: parsed.data.photo_url,
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  revalidatePath(`/app/${parsed.data.condominium_id}/guarita`);
  return { status: "success", message: "Encomenda registrada." };
}

export async function markPackagePickedUpAction(formData: FormData) {
  const condoId = String(formData.get("condominium_id") ?? "");
  const packageId = String(formData.get("package_id") ?? "");
  const pickedUpBy = String(formData.get("picked_up_by") ?? "Retirado na portaria");
  const supabase = await createSupabaseServerClient();

  await supabase.rpc("mark_gate_package_picked_up", {
    condo_id: condoId,
    package_id: packageId,
    picked_up_name: pickedUpBy,
  });

  revalidatePath(`/app/${condoId}/guarita`);
}

export async function createGateVisitorAction(
  _previousState: GateActionState,
  formData: FormData,
): Promise<GateActionState> {
  const parsed = gateVisitorSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    apartment_id: String(formData.get("apartment_id") ?? ""),
    visitor_name: String(formData.get("visitor_name") ?? ""),
    visitor_phone: String(formData.get("visitor_phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_gate_visitor", {
    condo_id: parsed.data.condominium_id,
    apt_id: parsed.data.apartment_id,
    visitor_name_input: parsed.data.visitor_name,
    visitor_phone_input: parsed.data.visitor_phone,
    visitor_message: parsed.data.message,
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  revalidatePath(`/app/${parsed.data.condominium_id}/guarita`);
  return { status: "success", message: "Visitante registrado." };
}

export async function createGateIncidentAction(
  _previousState: GateActionState,
  formData: FormData,
): Promise<GateActionState> {
  const rawApartmentId = String(formData.get("apartment_id") ?? "");
  const parsed = gateIncidentSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    apartment_id: rawApartmentId || undefined,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_gate_incident", {
    condo_id: parsed.data.condominium_id,
    apt_id: parsed.data.apartment_id ?? null,
    incident_title: parsed.data.title,
    incident_description: parsed.data.description,
  });

  if (error) return { status: "error", message: safeActionErrorMessage(error) };

  revalidatePath(`/app/${parsed.data.condominium_id}/guarita`);
  return { status: "success", message: "Ocorrência criada." };
}
