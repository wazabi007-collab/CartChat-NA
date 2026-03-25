import { normalizeNamibianPhone } from "./utils";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    appSecret: process.env.WHATSAPP_APP_SECRET!,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    enabled: process.env.WHATSAPP_ENABLED === "true",
  };
}

export function isWhatsAppEnabled(): boolean {
  return getConfig().enabled;
}

// ---------- Template message builder ----------

type TemplateComponent =
  | { type: "body"; parameters: Array<{ type: "text"; text: string }> }
  | { type: "button"; sub_type: "url"; index: string; parameters: Array<{ type: "text"; text: string }> };

interface TemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

function buildTemplateMessage(
  recipientPhone: string,
  templateName: string,
  variables: string[],
  buttonParams?: string[]
): TemplateMessage {
  const normalized = normalizeNamibianPhone(recipientPhone);
  const cleanPhone = normalized.replace(/\D/g, "");

  const components: TemplateComponent[] = [];

  if (variables.length > 0) {
    components.push({
      type: "body",
      parameters: variables.map((v) => ({ type: "text" as const, text: v })),
    });
  }

  if (buttonParams && buttonParams.length > 0) {
    buttonParams.forEach((param, index) => {
      components.push({
        type: "button",
        sub_type: "url",
        index: String(index),
        parameters: [{ type: "text", text: param }],
      });
    });
  }

  const msg: TemplateMessage = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: components.length > 0 ? components : undefined,
    },
  };

  return msg;
}

// ---------- Send message via Meta Cloud API ----------

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppTemplate(
  recipientPhone: string,
  templateName: string,
  variables: string[],
  buttonParams?: string[]
): Promise<SendResult> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, error: "WhatsApp is disabled" };
  }

  const message = buildTemplateMessage(recipientPhone, templateName, variables, buttonParams);

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg =
        data?.error?.message || `Meta API error: ${res.status}`;
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ---------- Authentication OTP via WhatsApp ----------

/**
 * Send a 6-digit OTP code via WhatsApp authentication template.
 * Requires an approved "authentication_otp" template in Meta Business Manager.
 *
 * Template format (authentication category):
 *   Body: "Your OshiCart verification code is {{1}}. It expires in 5 minutes."
 *   Button: Copy code (URL button with {{1}} parameter)
 */
export async function sendOtpMessage(
  recipientPhone: string,
  otpCode: string
): Promise<SendResult> {
  return sendWhatsAppTemplate(
    recipientPhone,
    "authentication_otp",
    [otpCode],          // body variable {{1}}
    [otpCode]           // button "copy code" parameter
  );
}

// ---------- Webhook signature verification ----------

export async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;

  const config = getConfig();
  const expectedSig = signature.replace("sha256=", "");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hexSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hexSig === expectedSig;
}
