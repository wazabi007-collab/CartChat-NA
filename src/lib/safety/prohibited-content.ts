export const SAFETY_POLICY_VERSION = "2026-05-08";

export type SafetySeverity = "clear" | "review" | "block";

export interface SafetyScanResult {
  severity: SafetySeverity;
  categories: string[];
  reasons: string[];
}

interface Rule {
  category: string;
  reason: string;
  severity: Exclude<SafetySeverity, "clear">;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    category: "adult_content",
    reason: "Adult or pornographic products and services are not allowed on OshiCart.",
    severity: "block",
    patterns: [
      /\bporn(?:ographic)?\b/i,
      /\bxxx\b/i,
      /\bnude(?:s|ity)?\b/i,
      /\bescort(?:s| service)?\b/i,
      /\bprostitut(?:e|ion)\b/i,
      /\bsexual\s+(?:service|services|content)\b/i,
      /\bsex\s+(?:service|services|worker|workers|toy|toys)\b/i,
    ],
  },
  {
    category: "illegal_drugs",
    reason: "Illegal drugs and drug-related products are not allowed on OshiCart.",
    severity: "block",
    patterns: [
      /\bcocaine\b/i,
      /\bheroin\b/i,
      /\bmeth(?:amphetamine)?\b/i,
      /\bmandrax\b/i,
      /\becstasy\b/i,
      /\bmdma\b/i,
      /\bmarijuana\b/i,
      /\bcannabis\b/i,
      /\bdagga\b/i,
      /\billegal\s+drugs?\b/i,
      /\bdrug\s+(?:dealer|delivery|sales?)\b/i,
    ],
  },
  {
    category: "weapons",
    reason: "Weapons and controlled dangerous items require manual review.",
    severity: "review",
    patterns: [
      /\bfirearm(?:s)?\b/i,
      /\bammunition\b/i,
      /\bgun(?:s)?\b/i,
      /\bknife|knives\b/i,
    ],
  },
  {
    category: "counterfeit_or_fraud",
    reason: "Counterfeit goods and fraudulent offers require manual review.",
    severity: "review",
    patterns: [
      /\bcounterfeit\b/i,
      /\bfake\s+(?:id|passport|certificate|brand|designer)\b/i,
      /\breplica\s+(?:brand|designer|iphone|samsung|nike|adidas)\b/i,
      /\bstolen\b/i,
    ],
  },
];

export function scanTextForProhibitedContent(parts: Array<string | null | undefined>): SafetyScanResult {
  const content = parts.filter(Boolean).join(" ").trim();
  if (!content) {
    return { severity: "clear", categories: [], reasons: [] };
  }

  const matches = RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(content)));

  if (matches.length === 0) {
    return { severity: "clear", categories: [], reasons: [] };
  }

  const shouldBlock = matches.some((match) => match.severity === "block");

  return {
    severity: shouldBlock ? "block" : "review",
    categories: [...new Set(matches.map((match) => match.category))],
    reasons: [...new Set(matches.map((match) => match.reason))],
  };
}

export function safetyMessage(result: SafetyScanResult) {
  if (result.severity === "clear") return "";
  return result.reasons[0] || "This item may violate the OshiCart prohibited products policy.";
}
