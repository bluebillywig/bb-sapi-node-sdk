/**
 * Builds a query parameter record, omitting entries with `null` or `undefined` values.
 * Boolean values are converted to `'true'`/`'false'` strings.
 * Numbers are converted via `String()`.
 */
export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (typeof value === 'boolean') {
      query[key] = value ? 'true' : 'false';
    } else {
      query[key] = String(value);
    }
  }
  return query;
}
