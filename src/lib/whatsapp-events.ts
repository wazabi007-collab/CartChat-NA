import { createServiceClient } from "@/lib/supabase/service";
import { namibianMonthKey, namibianMonthRange } from "@/lib/date";
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

  // All merchant-scoped sends, including order/status routes, share this guard.
  // Fail closed if we cannot establish whether this is a practice store.
  if (input.merchantId) {
    const { data: merchant, error } = await supabase.from("merchants")
      .select("is_demo").eq("id", input.merchantId).single();
    if (error || !merchant) return { ok: false, skipped: true, error: "Store notification eligibility unavailable" };
    if (merchant.is_demo) return { ok: true, skipped: true };
  }

  // One stock alert per store per Namibian month.
  //
  // The key used to carry the product and its quantity, so every sale minted a
  // fresh event and this cron -- which runs 96 times a day -- kept re-sending:
  // 85 messages to one store in 66 seconds on 26 May, until Meta rate-limited
  // the pair. Keying per store fixed the storm but made it one alert EVER, so a
  // merchant who ran low once would never be warned again.
  //
  // A calendar month is the reset: loud enough to be useful, quiet enough that
  // it can never storm. The window is checked by TIME rather than by key so a
  // legacy product/day-keyed alert from the old scheme still suppresses a
  // duplicate in the month it was sent. A queued or failed attempt counts too --
  // automatic retries must not spam.
  if (input.templateName === "low_stock_alert") {
    if (!input.merchantId) return { ok: false, skipped: true, error: "Stock alerts require a store" };
    const monthKey = namibianMonthKey();
    const { startISO, endISO } = namibianMonthRange(monthKey);
    const { data: previous, error } = await supabase.from("whatsapp_messages")
      .select("id").eq("merchant_id", input.merchantId)
      .eq("template_name", "low_stock_alert")
      .gte("created_at", startISO).lt("created_at", endISO).limit(1);
    if (error) return { ok: false, skipped: true, error: "Stock alert history unavailable" };
    if (previous?.length) return { ok: true, skipped: true };
    // The unique event_key index arbitrates concurrent first sends in a month.
    input = { ...input, eventKey: `low_stock_alert:${input.merchantId}:${monthKey}` };
  }

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
