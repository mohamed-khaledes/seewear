/**
 * Structured data for search engines. `<` is escaped so a product name or a
 * review that happens to contain "</script>" cannot close the tag and inject
 * markup — the classic hole in hand-written JSON-LD.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
