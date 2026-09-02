import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled, sendWhatsAppTemplate } from "@/lib/whatsapp";
import {
  getWhatsAppTemplate,
  validateWhatsAppTemplatePayload,
  type WhatsAppRecipientType,
  type WhatsAppTemplateName,
} from "@/lib/whatsapp-templates";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface SendEventInput {
  supabase?: ServiceClient;
  merchantId?: string | null;
  orderId?: string | null;
  eventKey?: string;
  templateName: WhatsAppTemplateName;
  recipientPhone: string | null | undefined;
  variables: string[];
  buttonParams?: string[];
  recipientType?: WhatsAppRecipientType;
}

export function adminWhatsAppNumbers(): string[] {
  return (process.env.OSHICART_ADMIN_WHATSAPP_NUMBERS || "")
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);
}

export function formatDateForWhatsApp(value: string | Date | null | undefined): string {
  if (!value) return "soon";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";
  return date.toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export async function sendWhatsAppEvent(input: SendEventInput) {
  const template = getWhatsAppTemplate(input.templateName);
  if (!template) return { ok: false, skipped: false, error: "Unknown template" };

  const recipientPhone = input.recipientPhone?.trim();
  if (!recipientPhone) return { ok: false, skipped: true, error: "Missing recipient phone" };

  const validationError = validateWhatsAppTemplatePayload(
    input.templateName,
    input.variables,
    input.buttonParams
  );
  if (validationError) return { ok: false, skipped: false, error: validationError };

  if (!isWhatsAppEnabled()) {
    return { ok: false, skipped: true, error: "WhatsApp disabled" };
  }

  const supabase = input.supabase ?? createServiceClient();

  if (input.eventKey) {
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id, status")
      .eq("event_key", input.eventKey)
      .maybeSingle();

    if (existing) {
      return { ok: true, skipped: true, messageId: existing.id as string };
    }
  }

  const { data: logRow, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      merchant_id: input.merchantId || null,
      order_id: input.orderId || null,
      event_key: input.eventKey || null,
      template_name: input.templateName,
      recipient_phone: recipientPhone,
      recipient_type: input.recipientType || template.recipientType,
      category: template.category,
      variables: input.variables,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true, skipped: true };
    }
    return { ok: false, skipped: false, error: insertError.message };
  }

  const result = await sendWhatsAppTemplate(
    recipientPhone,
    input.templateName,
    input.variables,
    input.buttonParams
  );

  if (logRow?.id) {
    await supabase
      .from("whatsapp_messages")
      .update(
        result.success
          ? {
              status: "sent",
              meta_message_id: result.messageId,
              sent_at: new Date().toISOString(),
            }
          : {
              status: "failed",
              error_message: result.error,
            }
      )
      .eq("id", logRow.id);
  }

  return { ok: result.success, skipped: false, messageId: result.messageId, error: result.error };
}

export async function notifyAdmins(input: {
  supabase?: ServiceClient;
  eventKeyPrefix: string;
  templateName:
    | "admin_new_merchant_signup"
    | "admin_subscription_payment_received"
    | "admin_safety_review_alert";
  variables: string[];
  merchantId?: string | null;
}) {
  const phones = adminWhatsAppNumbers();

  // No admins configured is a silent no-op that looks exactly like success.
  // OSHICART_ADMIN_WHATSAPP_NUMBERS was never set in production, so this loop
  // ran zero times for 17 merchant signups and nobody was told -- not the
  // caller, not the logs, not the whatsapp_messages table, which only gets a
  // row once a send is actually attempted. Say so loudly instead.
  if (phones.length === 0) {
    console.error(
      `[notifyAdmins] ${input.templateName} not sent: OSHICART_ADMIN_WHATSAPP_NUMBERS is empty. ` +
        `Set it to a comma-separated list of admin numbers in E.164 form (e.g. +264812384424).`
    );
    return [];
  }

  const results = [];
  for (const phone of phones) {
    results.push(
      await sendWhatsAppEvent({
        supabase: input.supabase,
        merchantId: input.merchantId,
        eventKey: `${input.eventKeyPrefix}:${phone.replace(/\D/g, "")}`,
        templateName: input.templateName,
        recipientPhone: phone,
        recipientType: "admin",
        variables: input.variables,
      })
    );
  }
  return results;
}
