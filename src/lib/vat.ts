export const VAT_RATE_BPS = 1500;
export const VAT_RATE_LABEL = "15%";

type VatInput = {
  amountNad: number;
  vatNumber?: string | null;
  vatInclusive?: boolean | null;
  vatRateBps?: number | null;
};

export function hasVatRegistration(vatNumber?: string | null) {
  return Boolean(vatNumber?.trim());
}

export function calculateVatBreakdown({
  amountNad,
  vatNumber,
  vatInclusive,
  vatRateBps = VAT_RATE_BPS,
}: VatInput) {
  const normalizedAmount = Math.max(0, Math.round(amountNad || 0));
  const registered = hasVatRegistration(vatNumber);
  const rateBps = registered ? (vatRateBps || VAT_RATE_BPS) : 0;

  if (!registered || rateBps <= 0) {
    return {
      hasVat: false,
      vatInclusive: false,
      vatRateBps: 0,
      subtotalExclVat: normalizedAmount,
      vatAmount: 0,
      payableTotal: normalizedAmount,
    };
  }

  if (vatInclusive) {
    const vatAmount = Math.round((normalizedAmount * rateBps) / (10000 + rateBps));
    return {
      hasVat: true,
      vatInclusive: true,
      vatRateBps: rateBps,
      subtotalExclVat: normalizedAmount - vatAmount,
      vatAmount,
      payableTotal: normalizedAmount,
    };
  }

  const vatAmount = Math.round((normalizedAmount * rateBps) / 10000);
  return {
    hasVat: true,
    vatInclusive: false,
    vatRateBps: rateBps,
    subtotalExclVat: normalizedAmount,
    vatAmount,
    payableTotal: normalizedAmount + vatAmount,
  };
}

export function getOrderBaseTotal(order: {
  subtotal_nad?: number | null;
  delivery_fee_nad?: number | null;
  discount_nad?: number | null;
}) {
  return Math.max(
    0,
    (order.subtotal_nad || 0) + (order.delivery_fee_nad || 0) - (order.discount_nad || 0)
  );
}

export function getOrderPayableTotal(order: {
  subtotal_nad?: number | null;
  delivery_fee_nad?: number | null;
  discount_nad?: number | null;
  vat_nad?: number | null;
  vat_inclusive?: boolean | null;
}) {
  const baseTotal = getOrderBaseTotal(order);
  return baseTotal + (!order.vat_inclusive ? (order.vat_nad || 0) : 0);
}
