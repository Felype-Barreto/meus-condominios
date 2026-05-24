import type { SupabaseClient } from "@supabase/supabase-js";

type DataRequestType =
  | "export"
  | "correction"
  | "deletion"
  | "portability"
  | "consent_revocation"
  | "privacy_question";

type RequestInput = {
  supabase: SupabaseClient;
  userId: string;
  condoId?: string | null;
  description?: string | null;
  email?: string | null;
};

async function createDataRequest(
  requestType: DataRequestType,
  input: RequestInput,
) {
  const { data, error } = await input.supabase
    .from("data_requests")
    .insert({
      condominium_id: input.condoId ?? null,
      user_id: input.userId,
      request_type: requestType,
      description: input.description ?? null,
      requested_by_email: input.email ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export function requestDataExport(userId: string, condoId?: string | null) {
  return { userId, condoId, requestType: "export" as const };
}

export function requestDataDeletion(userId: string, condoId?: string | null) {
  return { userId, condoId, requestType: "deletion" as const };
}

export async function createDataExportRequest(input: RequestInput) {
  return createDataRequest("export", input);
}

export async function createDataCorrectionRequest(input: RequestInput) {
  return createDataRequest("correction", input);
}

export async function createDataDeletionRequest(input: RequestInput) {
  return createDataRequest("deletion", input);
}

export async function createConsentRevocationRequest(input: RequestInput) {
  return createDataRequest("consent_revocation", input);
}

export async function exportUserData(supabase: SupabaseClient, userId: string) {
  const [
    { data: profile },
    { data: memberships },
    { data: optIns },
    { data: dataRequests },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,phone,avatar_url,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("id,condominium_id,apartment_id,role,status,privacy_settings,created_at,updated_at")
      .eq("user_id", userId),
    supabase
      .from("whatsapp_opt_ins")
      .select("condominium_id,phone,opted_in,categories,opted_in_at,opted_out_at,source,consent_text_version,created_at,updated_at")
      .eq("user_id", userId),
    supabase
      .from("data_requests")
      .select("id,condominium_id,request_type,status,description,response_note,created_at,updated_at")
      .eq("user_id", userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    scope: "user",
    user_id: userId,
    profile,
    memberships,
    whatsapp_opt_ins: optIns,
    data_requests: dataRequests,
    note: "Alguns dados podem ser retidos por seguranca, auditoria, cobranca, obrigacoes legais ou preservacao de historico do condominio.",
  };
}

export async function exportCondoData(supabase: SupabaseClient, condoId: string) {
  const [
    { data: condominium },
    { data: blocks },
    { data: apartments },
    { data: memberships },
    { data: announcements },
    { data: bookings },
    { data: tickets },
    { data: packages },
    { data: documents },
    { data: incidents },
    { data: visitorRequests },
    { data: dataRequests },
  ] = await Promise.all([
    supabase
      .from("condominiums")
      .select("id,name,slug,legal_name,document,address,contact_email,contact_phone,owner_user_id,plan,subscription_status,public_code,settings,created_at,updated_at")
      .eq("id", condoId)
      .maybeSingle(),
    supabase.from("blocks").select("id,name,sort_order,created_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("apartments").select("id,block_id,number,floor,status,notes_private,created_at,updated_at").eq("condominium_id", condoId).limit(2000),
    supabase
      .from("memberships")
      .select("id,apartment_id,user_id,role,status,privacy_settings,is_primary_syndic,created_at,updated_at")
      .eq("condominium_id", condoId),
    supabase.from("announcements").select("id,created_by,title,body,target_type,target_ids,urgent,pinned,allow_comments,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("bookings").select("id,common_area_id,apartment_id,user_id,title,start_at,end_at,status,notes,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("tickets").select("id,apartment_id,created_by,assigned_to,category,title,description,visibility,priority,status,attachments,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("packages").select("id,apartment_id,registered_by,recipient_name,description,photo_url,status,picked_up_by,picked_up_at,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("documents").select("id,uploaded_by,title,description,file_url,file_type,visibility,created_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("incidents").select("id,apartment_id,created_by,type,title,description,severity,status,attachments,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("visitor_contact_requests").select("id,apartment_id,searched_term,visitor_name,visitor_phone,message,status,created_at").eq("condominium_id", condoId).limit(1000),
    supabase.from("data_requests").select("id,user_id,request_type,status,description,requested_by_email,processed_by,processed_at,response_note,created_at,updated_at").eq("condominium_id", condoId).limit(1000),
  ]);

  return {
    exported_at: new Date().toISOString(),
    scope: "condominium",
    condominium_id: condoId,
    condominium,
    blocks,
    apartments,
    memberships,
    announcements,
    bookings,
    tickets,
    packages,
    documents,
    incidents,
    visitor_contact_requests: visitorRequests,
    data_requests: dataRequests,
    note: "Exportacao operacional. Logs criticos, cobranca e backups podem seguir politica de retencao separada.",
  };
}

export async function anonymizeUserData(
  supabase: SupabaseClient,
  userId: string,
  condoId?: string | null,
) {
  const anonymous = {
    full_name: "Usuario anonimizado",
    phone: null,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(anonymous)
    .eq("id", userId);
  if (profileError) throw profileError;

  if (condoId) {
    const { error } = await supabase
      .from("memberships")
      .update({
        privacy_settings: {
          allow_admin_contact: false,
          allow_internal_search: false,
          allow_public_qr_by_apartment: false,
          allow_public_qr_by_name: false,
          allow_whatsapp_redirect: false,
          hide_phone_by_default: true,
        },
      })
      .eq("user_id", userId)
      .eq("condominium_id", condoId);
    if (error) throw error;
  }
}

export async function scheduleCondoDeletion(
  supabase: SupabaseClient,
  condoId: string,
  requestedBy: string,
  description?: string | null,
) {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  const { data: current } = await supabase
    .from("condominiums")
    .select("settings")
    .eq("id", condoId)
    .maybeSingle();

  const { error } = await supabase
    .from("condominiums")
    .update({
      subscription_status: "pending_deletion",
      settings: {
        ...((current?.settings ?? {}) as Record<string, unknown>),
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_for: deletionDate.toISOString(),
        deletion_requested_by: requestedBy,
        deletion_note: description ?? null,
      },
    })
    .eq("id", condoId);

  if (error) throw error;
  return deletionDate.toISOString();
}
