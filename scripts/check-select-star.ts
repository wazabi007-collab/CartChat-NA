/**
 * No user-facing page may select("*") from merchants.
 *
 * merchants has column-level grants and no table-level SELECT (migration 055),
 * so PostgREST rejects select("*") with "permission denied for table
 * merchants". The dashboard did exactly that, got null, and sent every
 * merchant back to the setup wizard on login — the first bug external testing
 * found. Service-role code is exempt because it bypasses grants.
 *
 *   npx tsx scripts/check-select-star.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/app/(dashboard)", "src/components", "src/app/s", "src/app/checkout"];

let failures = 0;

function scan(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scan(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const text = readFileSync(full, "utf8");
    // Service clients bypass grants, so a file that only uses the service
    // role for merchants is fine; the risky pattern is the user client.
    const pattern = /from\("merchants"\)[\s\S]{0,120}?select\("\*"\)/g;
    for (const match of text.matchAll(pattern)) {
      const before = text.slice(Math.max(0, match.index - 400), match.index);
      if (before.includes("createServiceClient()") || before.includes("service\n")) continue;
      failures++;
      console.log(`FAIL ${full}: select("*") from merchants with a user client`);
    }
  }
}

for (const root of ROOTS) scan(root);

if (failures === 0) console.log('ok   no user-client select("*") from merchants');
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
