/**
 * Renders JSON-LD structured data for SEO.
 * Only accepts static data objects — no user input passes through.
 * This is the standard Next.js pattern for JSON-LD as recommended in the docs.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const jsonString = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      // SECURITY NOTE: This is safe because `data` is always a hardcoded
      // static object defined at build time in page source files. No user
      // input or database content ever flows into this component.
      // JSON.stringify also escapes any special characters.
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
