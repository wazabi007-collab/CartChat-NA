import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { formatNamibianDate } from "@/lib/date";
import { SITE_NAME, getPaymentMethodLabel } from "@/lib/constants";
import { PrintButton } from "../../invoice/[orderId]/print-button";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ refundId: string }>;
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

/**
 * Load a refund with its order and merchant, plus this refund's sequence
 * number among the order's refunds — CN-<order>-<seq> must be stable, so the
 * sequence is position by recorded_at, voided rows included (a voided credit
 * note keeps its number; numbers are never reused).
 */
async function loadRefund(refundId: string) {
  const supabase = createServiceClient();

  const { data: refund } = await supabase
    .from("order_refunds")
    .select(
      `id, order_id, amount_nad, refunded_at, method, reference, note, voided_at, recorded_at,
       orders (
         order_number, customer_name, created_at,
         vat_rate_bps, vat_inclusive, vat_number,
         merchants ( store_name, whatsapp_number, town, region, vat_number )
       )`
    )
    .eq("id", refundId)
    .single();

  if (!refund) return null;

  const { data: siblings } = await supabase
    .from("order_refunds")
    .select("id")
    .eq("order_id", refund.order_id)
    .order("recorded_at", { ascending: true });

  const seq = (siblings ?? []).findIndex((r) => r.id === refund.id) + 1;
  return { refund, seq: seq || 1 };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { refundId } = await params;
  const loaded = await loadRefund(refundId);
  if (!loaded) return { title: "Credit Note" };
  const order = loaded.refund.orders as unknown as { order_number: number } | null;
  return { title: `Credit Note CN-${order?.order_number}-${loaded.seq}` };
}

/**
 * A credit note: the document that reverses (part of) a tax invoice.
 *
 * Every order issues a numbered tax invoice, and under VAT rules an issued
 * invoice is reversed with a credit note, not deleted. One refund row = one
 * credit note, numbered CN-<order>-<seq> against the original invoice.
 *
 * VAT is backed out of the refund amount at the ORDER's rate: the money
 * handed back is gross, so the note shows the net and VAT portions the
 * merchant's return must reverse. Reached only via the refund's UUID, same
 * privacy model as the invoice.
 */
export default async function CreditNotePage({ params }: Props) {
  const { refundId } = await params;
  const loaded = await loadRefund(refundId);
  if (!loaded) notFound();

  const { refund, seq } = loaded;
  const order = refund.orders as unknown as {
    order_number: number;
    customer_name: string | null;
    created_at: string;
    vat_rate_bps: number | null;
    vat_inclusive: boolean | null;
    vat_number: string | null;
    merchants: {
      store_name: string;
      whatsapp_number: string;
      town: string | null;
      region: string | null;
      vat_number: string | null;
    } | null;
  } | null;

  if (!order || !order.merchants) notFound();
  const merchant = order.merchants;

  // Back VAT out of the gross amount at the order's rate. An order with no
  // VAT number carried no VAT, so the whole refund is net.
  const rate = order.vat_number ? order.vat_rate_bps ?? 0 : 0;
  const vatPortion =
    rate > 0 ? Math.round((refund.amount_nad * rate) / (10000 + rate)) : 0;
  const netPortion = refund.amount_nad - vatPortion;

  const number = `CN-${order.order_number}-${seq}`;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <p className="text-sm font-bold text-slate-500">
            Credit note {number}
          </p>
          <PrintButton />
        </div>

        <article className="rounded border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {refund.voided_at && (
            <p className="mb-6 rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-black uppercase tracking-wide text-slate-500">
              Voided — this credit note no longer applies
            </p>
          )}

          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950">
                {merchant.store_name}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {merchant.town && <>{merchant.town}, Namibia<br /></>}
                WhatsApp {merchant.whatsapp_number}
                {merchant.vat_number && (
                  <>
                    <br />
                    VAT No. {merchant.vat_number}
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black uppercase tracking-wide text-red-700">
                Credit Note
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">{number}</p>
              <p className="text-sm text-slate-500">
                {formatNamibianDate(`${refund.refunded_at}T12:00:00+02:00`, LONG_DATE)}
              </p>
            </div>
          </header>

          <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Credited to
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                {order.customer_name ?? "Customer"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Against tax invoice
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                Invoice #{order.order_number}
              </p>
              <p className="text-xs text-slate-500">
                dated {formatNamibianDate(order.created_at, LONG_DATE)}
              </p>
            </div>
          </section>

          <section className="border-b border-slate-200 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 text-slate-950">
                    Refund against invoice #{order.order_number}
                    {refund.method && (
                      <span className="text-slate-500">
                        {" "}
                        — returned by {getPaymentMethodLabel(refund.method)}
                      </span>
                    )}
                    {refund.reference && (
                      <span className="block text-xs text-slate-400">
                        Ref: {refund.reference}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums text-red-700">
                    − {formatPrice(refund.amount_nad)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="ml-auto max-w-xs space-y-1.5 py-6 text-sm">
            {rate > 0 ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Net credited</span>
                  <span className="tabular-nums">− {formatPrice(netPortion)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT reversed ({(rate / 100).toFixed(0)}%)</span>
                  <span className="tabular-nums">− {formatPrice(vatPortion)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>No VAT on the original invoice</span>
                <span />
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-black text-slate-950">
              <span>Total credited</span>
              <span className="tabular-nums text-red-700">
                − {formatPrice(refund.amount_nad)}
              </span>
            </div>
          </section>

          {refund.note && (
            <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">
              {refund.note}
            </p>
          )}

          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
            Powered by {SITE_NAME}. This credit note reverses the stated amount
            of tax invoice #{order.order_number}; keep both documents together.
          </footer>
        </article>
      </div>
    </div>
  );
}
