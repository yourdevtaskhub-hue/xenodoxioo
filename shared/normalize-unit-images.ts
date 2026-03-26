/**
 * Normalize `units.images` from DB (json/jsonb/string/array/legacy object map) to a string URL list.
 */
export function normalizeUnitImageList(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      })
      .map((k) => o[k])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  return [];
}
