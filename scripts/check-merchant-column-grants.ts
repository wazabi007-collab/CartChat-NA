/**
 * Every merchant column read with an RLS client must actually be granted.
 *
 * Migration 055 locked `merchants` down to an explicit column allow-list so
 * bank details and API keys could not be selected by a logged-in user. That
 * is right — but it made the grant list a thing you must remember to update.
 * Nobody did when `uses_ready_step` was added, and the failure was silent in
 * the worst way: PostgREST returned 42501, the Orders page read ANY error as
 * "this user has no store", and every configured merchant was redirected to
 * Setup. The dashboard's busiest screen was unreachable in production and
 * nothing logged an error.
 *
 * So: this check parses every `.from("merchants").select(...)` issued with an
 * RLS client and fails if it names a column outside the grant. Adding a column
 * to the SELECT without a matching `grant select (col)` migration now breaks
 * the build instead of breaking the dashboard.
 *
 *   npx tsx scripts/check-merchant-column-grants.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Mirrors the live grant: migration 055's allow-list plus every column
 * granted since. Verified against information_schema.column_privileges on
 * 15 Aug 2026. Deliberately EXCLUDED (credentials, PII, internal flags):
 * api_key, bank_account_*, bank_branch_code, callout_fee_nad, ewallet_number,
 * momo_number, pay2cell_number, paytoday_number,
 * prohibited_policy_accepted_ip, referred_by_code, safety_notes.
 * Those reach the owner through get_my_merchant(), which filters on auth.uid().
 */
const GRANTED = new Set([
  "accepted_payment_methods", "bank_name", "cart_recovery_enabled", "created_at",
  "delivery_estimate", "delivery_fee_nad", "delivery_slots", "description",
  "enabled_delivery_providers", "ewallet_provider", "getting_started_dismissed",
  "id", "industry", "is_active", "logo_url", "pickup_address", "pop_required",
  "prohibited_policy_accepted_at", "prohibited_policy_version", "region",
  "is_demo", "store_link_shared", "store_name", "store_slug", "store_status",
  "suspended_reason", "tos_accepted_at", "town", "updated_at", "user_id",
  "uses_ready_step", "vat_inclusive", "vat_number", "whatsapp_number",
]);

/**
 * Whole files whose every merchant read is service-client (admin surfaces and
 * server-only helpers). Everywhere else the client is resolved per call site,
 * because pages legitimately mix both: the storefront reads its public columns
 * with the visitor client and payment credentials with the service client, and
 * a file-level skip would blind the check to exactly the bug it exists for.
 */
const SERVICE_CLIENT_FILES = [
  "src/app/(admin)",
  "src/app/api/admin",
  "src/app/sitemap.ts",
  "src/lib/api-auth.ts",
  "src/components/landing/storefront-gallery.tsx",
  "src/app/page.tsx",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

let failures = 0;
let checked = 0;

for (const file of walk(join(process.cwd(), "src"))) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  if (SERVICE_CLIENT_FILES.some((p) => rel.startsWith(p))) continue;

  const body = readFileSync(file, "utf8");
  if (!body.includes('from("merchants")')) continue;

  // Variables holding a service client in this file — those reads bypass grants.
  const serviceVars = new Set(
    [...body.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?createServiceClient\(/g)]
      .map((m) => m[1])
  );

  // Capture the receiver so each call site is judged by ITS client.
  const pattern =
    /(createServiceClient\(\)|\w+)\s*\r?\n?\s*\.from\("merchants"\)\s*\r?\n?\s*\.select\(\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const receiver = match[1];
    if (receiver === "createServiceClient()" || serviceVars.has(receiver)) continue;
    checked++;
    const columns = match[2]
      // Drop embedded resource selects like `subscriptions(tier, status)`.
      .replace(/\w+\s*\([^)]*\)/g, "")
      .split(",")
      .map((c) => c.trim().split(":").pop()!.trim())
      .filter(Boolean);

    for (const column of columns) {
      if (column === "*") {
        failures++;
        console.log(`FAIL ${rel}\n  selects * from merchants — name the columns so the grant is checkable`);
        continue;
      }
      if (!GRANTED.has(column)) {
        failures++;
        console.log(
          `FAIL ${rel}\n  selects "${column}", which authenticated cannot read.\n` +
          `  Either add "grant select (${column}) on merchants to authenticated;" in a migration\n` +
          `  (only if it is not a credential), or read it through get_my_merchant().`
        );
      }
    }
  }
}

if (checked === 0) {
  failures++;
  console.log("FAIL parsed no merchant selects at all — the pattern has drifted");
} else {
  console.log(`ok   ${checked} merchant select(s) all within the grant`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
