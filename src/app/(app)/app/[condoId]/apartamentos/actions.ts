"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DeleteActionState } from "@/components/common/delete-confirmation";
import { safeActionErrorMessage } from "@/lib/safe-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApartmentStructureState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const blockSchema = z.object({
  condominium_id: z.string().uuid(),
  name: z.string().min(1, "Informe o nome do bloco.").max(40, "Use um nome menor."),
});

const apartmentSchema = z.object({
  condominium_id: z.string().uuid(),
  block_id: z.string().uuid(),
  floor: z.string().min(1, "Informe o andar.").max(20, "Use um andar menor."),
  number: z.string().min(1, "Informe o número do apartamento.").max(20, "Use um número menor."),
});

const updateBlockSchema = z.object({
  condominium_id: z.string().uuid(),
  block_id: z.string().uuid(),
  name: z.string().min(1, "Informe o nome do bloco.").max(40, "Use um nome menor."),
});

const updateApartmentSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  number: z.string().min(1, "Informe o numero do apartamento.").max(20, "Use um numero menor."),
  floor: z.string().min(1, "Informe o andar.").max(20, "Use um andar menor."),
  status: z.enum(["vacant", "occupied", "reserved", "maintenance", "inactive"]),
});

const deleteBlockSchema = z.object({
  condominium_id: z.string().uuid(),
  block_id: z.string().uuid(),
  confirmation: z.literal("EXCLUIR"),
});

const deleteApartmentSchema = z.object({
  condominium_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  confirmation: z.literal("EXCLUIR"),
});

const deleteFloorSchema = z.object({
  condominium_id: z.string().uuid(),
  block_id: z.string().uuid(),
  floor: z.string().min(1),
  confirmation: z.literal("EXCLUIR"),
});

function actionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key") || lower.includes("unique")) {
    return "Já existe um item com esse nome ou número neste bloco.";
  }

  return safeActionErrorMessage(error);
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Entre na sua conta.");
  return supabase;
}

export async function createBlockAction(
  _state: ApartmentStructureState,
  formData: FormData,
): Promise<ApartmentStructureState> {
  const parsed = blockSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    name: String(formData.get("name") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await requireUser();
    const { data: lastBlock } = await supabase
      .from("blocks")
      .select("sort_order")
      .eq("condominium_id", parsed.data.condominium_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("blocks").insert({
      condominium_id: parsed.data.condominium_id,
      name: parsed.data.name.trim(),
      sort_order: Number(lastBlock?.sort_order ?? 0) + 1,
    });

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Bloco adicionado." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function createApartmentAction(
  _state: ApartmentStructureState,
  formData: FormData,
): Promise<ApartmentStructureState> {
  const parsed = apartmentSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    block_id: String(formData.get("block_id") ?? ""),
    floor: String(formData.get("floor") ?? ""),
    number: String(formData.get("number") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("apartments").insert({
      condominium_id: parsed.data.condominium_id,
      block_id: parsed.data.block_id,
      floor: parsed.data.floor.trim(),
      number: parsed.data.number.trim(),
      status: "vacant",
    });

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Apartamento adicionado." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function updateBlockAction(
  _state: ApartmentStructureState,
  formData: FormData,
): Promise<ApartmentStructureState> {
  const parsed = updateBlockSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    block_id: String(formData.get("block_id") ?? ""),
    name: String(formData.get("name") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await requireUser();
    const { data: canManage } = await supabase.rpc("has_permission", {
      condo_id: parsed.data.condominium_id,
      permission_key: "apartments.edit",
    });
    const { data: isAdmin } = await supabase.rpc("is_condo_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!canManage && !isAdmin) {
      throw new Error("Voce nao tem permissao para editar blocos.");
    }

    const { error } = await supabase
      .from("blocks")
      .update({ name: parsed.data.name.trim() })
      .eq("id", parsed.data.block_id)
      .eq("condominium_id", parsed.data.condominium_id);

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Bloco atualizado." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function updateApartmentAction(
  _state: ApartmentStructureState,
  formData: FormData,
): Promise<ApartmentStructureState> {
  const parsed = updateApartmentSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    apartment_id: String(formData.get("apartment_id") ?? ""),
    number: String(formData.get("number") ?? ""),
    floor: String(formData.get("floor") ?? ""),
    status: String(formData.get("status") ?? "vacant"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await requireUser();
    const { data: canEdit } = await supabase.rpc("has_permission", {
      condo_id: parsed.data.condominium_id,
      permission_key: "apartments.edit",
    });
    const { data: isAdmin } = await supabase.rpc("is_condo_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!canEdit && !isAdmin) {
      throw new Error("Voce nao tem permissao para editar apartamentos.");
    }

    const { error } = await supabase
      .from("apartments")
      .update({
        number: parsed.data.number.trim(),
        floor: parsed.data.floor.trim(),
        status: parsed.data.status,
      })
      .eq("id", parsed.data.apartment_id)
      .eq("condominium_id", parsed.data.condominium_id);

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Apartamento atualizado." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function deleteBlockAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  const parsed = deleteBlockSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    block_id: String(formData.get("block_id") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Digite EXCLUIR para confirmar." };
  }

  try {
    const supabase = await requireUser();
    const { data: canManage } = await supabase.rpc("has_permission", {
      condo_id: parsed.data.condominium_id,
      permission_key: "apartments.create",
    });
    const { data: isAdmin } = await supabase.rpc("is_condo_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!canManage && !isAdmin) {
      throw new Error("Voce nao tem permissao para excluir blocos.");
    }

    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("id", parsed.data.block_id)
      .eq("condominium_id", parsed.data.condominium_id);

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Bloco excluido." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function deleteApartmentAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  const parsed = deleteApartmentSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    apartment_id: String(formData.get("apartment_id") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Digite EXCLUIR para confirmar." };
  }

  try {
    const supabase = await requireUser();
    const { data: canDelete } = await supabase.rpc("has_permission", {
      condo_id: parsed.data.condominium_id,
      permission_key: "apartments.delete",
    });
    const { data: isAdmin } = await supabase.rpc("is_condo_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!canDelete && !isAdmin) {
      throw new Error("Voce nao tem permissao para excluir apartamentos.");
    }

    const { error } = await supabase
      .from("apartments")
      .delete()
      .eq("id", parsed.data.apartment_id)
      .eq("condominium_id", parsed.data.condominium_id);

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Apartamento excluido." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}

export async function deleteFloorAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  const parsed = deleteFloorSchema.safeParse({
    condominium_id: String(formData.get("condominium_id") ?? ""),
    block_id: String(formData.get("block_id") ?? ""),
    floor: String(formData.get("floor") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Digite EXCLUIR para confirmar." };
  }

  try {
    const supabase = await requireUser();
    const { data: canDelete } = await supabase.rpc("has_permission", {
      condo_id: parsed.data.condominium_id,
      permission_key: "apartments.delete",
    });
    const { data: isAdmin } = await supabase.rpc("is_condo_admin", {
      condo_id: parsed.data.condominium_id,
    });

    if (!canDelete && !isAdmin) {
      throw new Error("Voce nao tem permissao para excluir andares.");
    }

    const { error } = await supabase
      .from("apartments")
      .delete()
      .eq("condominium_id", parsed.data.condominium_id)
      .eq("block_id", parsed.data.block_id)
      .eq("floor", parsed.data.floor);

    if (error) throw error;
    revalidatePath(`/app/${parsed.data.condominium_id}/apartamentos`);
    return { status: "success", message: "Andar excluido." };
  } catch (error) {
    return { status: "error", message: actionError(error) };
  }
}
