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

interface TemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: "body";
      parameters: Array<{ type: "text"; text: string }>;
    }>;
  };
}

function buildTemplateMessage(
  recipientPhone: string,
  templateName: string,
  variables: string[]
): TemplateMessage {
  const normalized = normalizeNamibianPhone(recipientPhone);
  const cleanPhone = normalized.replace(/\D/g, "");

  const msg: TemplateMessage = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
    },
  };

  if (variables.length > 0) {
    msg.template.components = [
      {
        type: "body",
        parameters: variables.map((v) => ({ type: "text" as const, text: v })),
      },
    ];
  }

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
  variables: string[]
): Promise<SendResult> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, error: "WhatsApp is disabled" };
  }

  const message = buildTemplateMessage(recipientPhone, templateName, variables);

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

// ---------- Webhook signature verification ----------

export async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;

  const config = getConfig();
  const expectedSig = signature.replace("sha256=", "");

  // Use Web Crypto API (available in Edge and Node.js 18+)
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
