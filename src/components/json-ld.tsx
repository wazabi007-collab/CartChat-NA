/**
 * Renders JSON-LD structured data for SEO.
 *
 * NOTE: merchant-controlled, database-sourced strings (store name,
 * description, product name/description) DO flow into this component on
 * storefront/product pages. JSON.stringify does NOT escape "<" or "/", so a
 * value containing "</script>" would break out of the <script> element and
 * execute arbitrary JS (stored XSS). Escaping "<", ">" and "&" to their
 * unicode escapes is valid inside a JSON string and makes a breakout
 * impossible while leaving the parsed JSON-LD identical.
 */
function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const jsonString = escapeJsonForScript(JSON.stringify(data));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
