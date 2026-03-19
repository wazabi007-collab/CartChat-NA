/**
 * Shared UI class presets for visual consistency across forms, cards, and feedback.
 * Import these constants instead of writing raw Tailwind strings to keep the design unified.
 *
 * Color contexts:
 *   - Auth pages (signup/login): brand blue (#2B5EA7)
 *   - Dashboard/merchant pages: green-600
 *   - Customer-facing (checkout/storefront): green-600
 */

// ─── Inputs ──────────────────────────────────────────────────────────────────

/** Standard text input / tel / email / number */
export const inputBase =
  "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors";

/** Focus ring color per context — append to inputBase */
export const focusGreen = "focus:ring-green-600/30 focus:border-green-600";
export const focusBrand = "focus:ring-[#2B5EA7]/30 focus:border-[#2B5EA7]";

/** Textarea — same as input + resize-none */
export const textareaBase = `${inputBase} resize-none`;

/** Select dropdown */
export const selectBase = inputBase;

// ─── Labels & helpers ────────────────────────────────────────────────────────

export const label = "block text-sm font-medium text-gray-700 mb-1.5";
export const helperText = "text-xs text-gray-500 mt-1";
export const requiredMark = "text-red-500 ml-0.5";

// ─── Cards & sections ────────────────────────────────────────────────────────

export const card = "bg-white rounded-xl border border-gray-200 p-5";
export const sectionHeading = "font-semibold text-gray-900";

// ─── Buttons ─────────────────────────────────────────────────────────────────

/** Primary action — full width, 44px+ tap target */
export const btnPrimaryGreen =
  "w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const btnPrimaryBrand =
  "w-full py-2.5 bg-[#2B5EA7] text-white rounded-lg font-medium hover:bg-[#234B86] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

/** Secondary / outline button */
export const btnSecondary =
  "px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors";

/** Small inline action (e.g., Apply coupon) */
export const btnSmallGreen =
  "px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors";

/** Ghost / text button */
export const btnGhost =
  "w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2";

// ─── Feedback: alerts ────────────────────────────────────────────────────────

export const alertError =
  "bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-red-700";

export const alertSuccess =
  "bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-green-700";

export const alertWarning =
  "bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-amber-800";

export const alertInfo =
  "bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-blue-800";

export const alertIcon = "w-4 h-4 flex-shrink-0 mt-0.5";

// ─── Radio cards (delivery/payment toggles) ─────────────────────────────────

export const radioCardSelected =
  "border-green-600 bg-green-50 text-green-700";
export const radioCardUnselected =
  "border-gray-300 text-gray-600 hover:border-gray-400";
export const radioCardBase =
  "border rounded-lg p-3 cursor-pointer text-center transition-colors font-medium text-sm";

// ─── Status pills ────────────────────────────────────────────────────────────

export const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  ready: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const statusPill = "text-xs px-2 py-0.5 rounded-full font-medium";
