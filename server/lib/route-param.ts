/**
 * Express route param typing may be `string | string[]`; normalize to one string.
 */
export function routeParam(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
