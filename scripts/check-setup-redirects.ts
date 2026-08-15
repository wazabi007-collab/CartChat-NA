/**
 * A failed merchant query must never be mistaken for "this user has no store".
 *
 * Every dashboard route fetches the caller's merchant row and sends them to
 * the setup wizard when it comes back empty. That is right for a genuinely
 * new user — but the routes read `{ data: merchant }` and ignored the error,
 * so ANY failure looked identical to "not configured yet".
 *
 * It has bitten twice. A merchant logging in was pushed back through setup
 * they had already completed, and later the Orders page became unreachable
 * for every merchant on the platform because it selected a column migration
 * 055's allow-list had never granted: PostgREST answered 42501, the page
 * called that "no merchant", and nothing logged an error. The busiest screen
 * in the product was dead and the failure was silent.
 *
 * So a route that redirects to setup must also distinguish a real error from
 * an empty result. PGRST116 is PostgREST's "no rows" for .single() and is the
 * only one that means "not configured".
 *
 * Routes reading through the service client are exempt: it bypasses RLS and
 * column grants, so the failure this guards against cannot occur there.
 *
 *   npx tsx scripts/check-setup-redirects.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src/app/(dashboard)";

let failures = 0;
let checked = 0;

function scan(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scan(full);
      continue;
    }
    if (!full.endsWith(".tsx")) continue;

    const body = readFileSync(full, "utf8");
    if (!body.includes('redirect("/dashboard/setup")')) continue;

    const rel = relative(process.cwd(), full).replace(/\\/g, "/");
    checked++;

    // Which client issues the merchant read decides whether this can fail.
    const serviceVars = new Set(
      [...body.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?createServiceClient\(/g)].map(
        (m) => m[1]
      )
    );
    const fetchMatch = body.match(
      /const \{[^}]*\} = await (\w+)\s*\r?\n?\s*\.from\("merchants"\)/
    );
    if (fetchMatch && serviceVars.has(fetchMatch[1])) continue;

    if (!/error:\s*merchantError/.test(body)) {
      failures++;
      console.log(
        `FAIL ${rel}\n` +
        `  redirects to setup but never reads the query error, so a denied\n` +
        `  column or a transient failure will bounce a configured merchant.\n` +
        `  Destructure { data: merchant, error: merchantError } and throw when\n` +
        `  merchantError.code !== "PGRST116".`
      );
      continue;
    }
    if (!body.includes('merchantError.code !== "PGRST116"')) {
      failures++;
      console.log(
        `FAIL ${rel}\n  reads the error but does not let the no-rows case (PGRST116) through.`
      );
    }
  }
}

scan(join(process.cwd(), ROOT));

if (checked === 0) {
  failures++;
  console.log("FAIL found no setup redirects at all — the pattern has moved");
} else {
  console.log(`ok   ${checked} route(s) redirecting to setup all distinguish errors from no-row`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
