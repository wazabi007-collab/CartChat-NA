/**
 * DPO (Direct Pay Online) API v6 client.
 * Handles createToken, verifyToken via XML over HTTPS.
 * No XML library needed — DPO responses are flat XML.
 */

import { SITE_URL } from "./constants";

const DPO_API_URL = "https://secure.3gdirectpay.com/API/v6/";
const DPO_PAYMENT_URL = "https://secure.3gdirectpay.com/payv2.php";

function getConfig() {
  return {
    companyToken: process.env.DPO_COMPANY_TOKEN!,
    serviceType: process.env.DPO_SERVICE_TYPE || "3854",
    enabled: process.env.DPO_ENABLED === "true",
  };
}

export function isDpoEnabled(): boolean {
  return getConfig().enabled;
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function xmlTag(tag: string, value: string | number): string {
  return `<${tag}>${String(value)}</${tag}>`;
}

function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

/** Convert cents to NAD decimal string (e.g. 4999 → "49.99") */
function centsToNad(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── createToken ─────────────────────────────────────────────────────────────

export interface DpoCreateTokenParams {
  orderId: string;
  orderNumber: number;
  amountCents: number;
  storeName: string;
  storeSlug: string;
  customerFirstName: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface DpoCreateTokenResult {
  success: boolean;
  transToken: string;
  transRef: string;
  paymentUrl: string;
  error?: string;
}

export async function createToken(
  params: DpoCreateTokenParams
): Promise<DpoCreateTokenResult> {
  const config = getConfig();

  const redirectUrl = `${SITE_URL}/api/payments/dpo/callback`;
  const backUrl = `${SITE_URL}/api/payments/dpo/callback?cancelled=1&slug=${params.storeSlug}`;
  const serviceDescription = `Order #${params.orderNumber} - ${params.storeName}`;
  const serviceDate = new Date().toISOString().slice(0, 16).replace("T", " ");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  ${xmlTag("CompanyToken", config.companyToken)}
  ${xmlTag("Request", "createToken")}
  <Transaction>
    ${xmlTag("PaymentAmount", centsToNad(params.amountCents))}
    ${xmlTag("PaymentCurrency", "NAD")}
    ${xmlTag("CompanyRef", params.orderId)}
    ${xmlTag("CompanyRefUnique", "1")}
    ${xmlTag("RedirectURL", redirectUrl)}
    ${xmlTag("BackURL", backUrl)}
    ${xmlTag("PTL", "30")}
    ${xmlTag("PTLtype", "minutes")}
    ${params.customerFirstName ? xmlTag("customerFirstName", params.customerFirstName) : ""}
    ${params.customerLastName ? xmlTag("customerLastName", params.customerLastName) : ""}
    ${params.customerEmail ? xmlTag("customerEmail", params.customerEmail) : ""}
    ${params.customerPhone ? xmlTag("customerPhone", params.customerPhone) : ""}
    ${xmlTag("DefaultPayment", "CC")}
    ${xmlTag("TransactionSource", "Website")}
  </Transaction>
  <Services>
    <Service>
      ${xmlTag("ServiceType", config.serviceType)}
      ${xmlTag("ServiceDescription", serviceDescription)}
      ${xmlTag("ServiceDate", serviceDate)}
    </Service>
  </Services>
</API3G>`;

  const response = await fetch(DPO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  });

  const responseText = await response.text();
  const resultCode = parseXmlValue(responseText, "Result");
  const resultExplanation = parseXmlValue(responseText, "ResultExplanation");
  const transToken = parseXmlValue(responseText, "TransToken");
  const transRef = parseXmlValue(responseText, "TransRef");

  if (resultCode !== "000" || !transToken) {
    console.error("[DPO createToken] Failed:", { resultCode, resultExplanation, responseText });
    return {
      success: false,
      transToken: "",
      transRef: "",
      paymentUrl: "",
      error: resultExplanation || `DPO error code ${resultCode}`,
    };
  }

  return {
    success: true,
    transToken,
    transRef,
    paymentUrl: `${DPO_PAYMENT_URL}?ID=${transToken}`,
  };
}

// ─── verifyToken ─────────────────────────────────────────────────────────────

export interface DpoVerifyResult {
  resultCode: string;
  resultExplanation: string;
  customerName: string;
  transactionApproval: string;
  transactionCurrency: string;
  transactionAmount: string;
  fraudAlert: string;
  fraudExplanation: string;
  isPaid: boolean;
  isDeclined: boolean;
  isCancelled: boolean;
  isPending: boolean;
}

export async function verifyToken(transactionToken: string): Promise<DpoVerifyResult> {
  const config = getConfig();

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  ${xmlTag("CompanyToken", config.companyToken)}
  ${xmlTag("Request", "verifyToken")}
  ${xmlTag("TransactionToken", transactionToken)}
</API3G>`;

  const response = await fetch(DPO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  });

  const responseText = await response.text();
  const resultCode = parseXmlValue(responseText, "Result");

  return {
    resultCode,
    resultExplanation: parseXmlValue(responseText, "ResultExplanation"),
    customerName: parseXmlValue(responseText, "CustomerName"),
    transactionApproval: parseXmlValue(responseText, "TransactionApproval"),
    transactionCurrency: parseXmlValue(responseText, "TransactionCurrency"),
    transactionAmount: parseXmlValue(responseText, "TransactionAmount"),
    fraudAlert: parseXmlValue(responseText, "FraudAlert"),
    fraudExplanation: parseXmlValue(responseText, "FraudExplnation"),
    isPaid: resultCode === "000",
    isDeclined: resultCode === "901",
    isCancelled: resultCode === "904",
    isPending: resultCode === "900",
  };
}
