import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getPaymentMethodLabel } from "@/lib/constants";

interface Props {
  /** Methods the merchant switched on but cannot actually be paid through. */
  methods: string[];
  /** True when nothing they offer is usable — no order can be paid at all. */
  blocking: boolean;
}

/**
 * Warns a merchant that a payment method they offer cannot receive money.
 *
 * Nine of twelve live stores were in this state, including one accepting only
 * bank transfer with an empty account number — every order it took was
 * unpayable, and nothing in the dashboard said so.
 */
export function PaymentSetupWarning({ methods, blocking }: Props) {
  if (methods.length === 0) return null;

  const labels = methods.map((m) => getPaymentMethodLabel(m)).join(", ");

  return (
    <div
      className={`mb-6 rounded-2xl border p-5 ${
        blocking ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className={blocking ? "mt-0.5 shrink-0 text-red-600" : "mt-0.5 shrink-0 text-amber-600"}
        />
        <div>
          <p className={`font-black ${blocking ? "text-red-900" : "text-amber-900"}`}>
            {blocking
              ? "Customers cannot pay you yet"
              : "A payment method is missing its details"}
          </p>
          <p
            className={`mt-1 text-sm leading-6 ${
              blocking ? "text-red-800" : "text-amber-800"
            }`}
          >
            You accept <strong>{labels}</strong>, but haven&apos;t entered the
            account or number customers need to pay it.{" "}
            {blocking
              ? "Until you add it, your checkout is closed and buyers are asked to message you instead."
              : "That option is hidden at checkout until you add it."}
          </p>
          <Link
            href="/dashboard/settings#payments"
            className={`mt-3 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-black text-white ${
              blocking ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            Add payment details
          </Link>
        </div>
      </div>
    </div>
  );
}
