export type WhatsAppRecipientType = "customer" | "merchant" | "admin" | "staff";
export type WhatsAppTemplateCategory = "utility" | "authentication" | "marketing";

export interface WhatsAppTemplateDefinition {
  name: string;
  category: WhatsAppTemplateCategory;
  recipientType: WhatsAppRecipientType;
  bodyVariableCounts: number[];
  buttonParamCounts?: number[];
}

export const WHATSAPP_TEMPLATES = {
  authentication_otp: {
    name: "authentication_otp",
    category: "authentication",
    recipientType: "merchant",
    bodyVariableCounts: [1],
    buttonParamCounts: [1],
  },
  abandoned_cart_reminder: {
    name: "abandoned_cart_reminder",
    category: "marketing",
    recipientType: "customer",
    // {{1}} customer first name · {{2}} item count · {{3}} total (e.g. "N$250.00")
    // {{4}} store name.  Button param = store URL suffix back to the storefront.
    bodyVariableCounts: [4],
    buttonParamCounts: [1],
  },
  welcome_merchant: {
    name: "welcome_merchant",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [2],
    buttonParamCounts: [0],
  },
  new_order_merchant: {
    name: "new_order_merchant",
    category: "utility",
    recipientType: "merchant",
    // 6th variable = delivery line (e.g. "Yango - buyer pays courier"). The
    // live Meta template must carry a {{6}} placeholder before this ships.
    bodyVariableCounts: [6],
    buttonParamCounts: [0],
  },
  order_placed: {
    name: "order_placed",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [4],
    buttonParamCounts: [1],
  },
  order_confirmed: {
    name: "order_confirmed",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [3],
    buttonParamCounts: [1],
  },
  order_ready: {
    name: "order_ready",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [4],
    buttonParamCounts: [1],
  },
  order_completed: {
    name: "order_completed",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [3, 4],
    buttonParamCounts: [1],
  },
  order_cancelled: {
    name: "order_cancelled",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  payment_reminder: {
    name: "payment_reminder",
    category: "utility",
    recipientType: "customer",
    bodyVariableCounts: [4],
    buttonParamCounts: [0, 1],
  },
  subscription_activated: {
    name: "subscription_activated",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [5],
    buttonParamCounts: [0],
  },
  trial_ending_soon: {
    name: "trial_ending_soon",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  subscription_expiring_soon: {
    name: "subscription_expiring_soon",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  subscription_grace_started: {
    name: "subscription_grace_started",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  subscription_suspended: {
    name: "subscription_suspended",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [2],
    buttonParamCounts: [0],
  },
  proof_uploaded_merchant: {
    name: "proof_uploaded_merchant",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [4],
    buttonParamCounts: [0],
  },
  pending_order_reminder_merchant: {
    name: "pending_order_reminder_merchant",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [4],
    buttonParamCounts: [0],
  },
  low_stock_alert: {
    name: "low_stock_alert",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  store_activation_nudge: {
    name: "store_activation_nudge",
    category: "utility",
    recipientType: "merchant",
    // {{1}} store name. Guide link is a fixed button URL, house style.
    bodyVariableCounts: [1],
    buttonParamCounts: [0],
  },
  store_win_back: {
    name: "store_win_back",
    category: "utility",
    recipientType: "merchant",
    // {{1}} store name. Login link is a fixed button URL.
    bodyVariableCounts: [1],
    buttonParamCounts: [0],
  },
  booking_reminder: {
    name: "booking_reminder",
    category: "utility",
    recipientType: "customer",
    // {{1}} customer name · {{2}} store name · {{3}} date · {{4}} time.
    // Button param = store slug, so "let the store know" opens THEIR store,
    // not the OshiCart number nobody attends.
    bodyVariableCounts: [4],
    buttonParamCounts: [1],
  },
  inbound_message_alert: {
    name: "inbound_message_alert",
    category: "utility",
    recipientType: "admin",
    // {{1}} sender name · {{2}} sender number · {{3}} message text.
    // Forwards replies to the business number to the admins' own phones —
    // the business number is not attended.
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  admin_new_merchant_signup: {
    name: "admin_new_merchant_signup",
    category: "utility",
    recipientType: "admin",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  admin_subscription_payment_received: {
    name: "admin_subscription_payment_received",
    category: "utility",
    recipientType: "admin",
    bodyVariableCounts: [5],
    buttonParamCounts: [0],
  },
  admin_safety_review_alert: {
    name: "admin_safety_review_alert",
    category: "utility",
    recipientType: "admin",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  merchant_platform_update: {
    name: "merchant_platform_update",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
  merchant_maintenance_notice: {
    name: "merchant_maintenance_notice",
    category: "utility",
    recipientType: "merchant",
    bodyVariableCounts: [3],
    buttonParamCounts: [0],
  },
} as const satisfies Record<string, WhatsAppTemplateDefinition>;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

export function getWhatsAppTemplate(name: string): WhatsAppTemplateDefinition | null {
  return WHATSAPP_TEMPLATES[name as WhatsAppTemplateName] ?? null;
}

export function validateWhatsAppTemplatePayload(
  templateName: string,
  variables: string[],
  buttonParams?: string[]
): string | null {
  const template = getWhatsAppTemplate(templateName);
  if (!template) return `Unknown WhatsApp template: ${templateName}`;

  if (!template.bodyVariableCounts.includes(variables.length)) {
    return `${templateName} expects ${template.bodyVariableCounts.join(" or ")} body variables, got ${variables.length}`;
  }

  const buttonCount = buttonParams?.length ?? 0;
  const allowedButtonCounts = template.buttonParamCounts ?? [0];
  if (!allowedButtonCounts.includes(buttonCount)) {
    return `${templateName} expects ${allowedButtonCounts.join(" or ")} button params, got ${buttonCount}`;
  }

  return null;
}
