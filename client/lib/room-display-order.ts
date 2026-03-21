/**
 * Display order for rooms on home and /properties pages.
 * 1) Ogra house, 2) Lykoskufi 5, 3) Lykoskufi 2, 4) Lykoskufi 1,
 * 5) Big Bungalow, 6) Small Bungalow
 */
const ROOM_ORDER: Array<RegExp | string> = [
  /ogra/i,
  /lykoskufi\s*5|lykoskufi5/i,
  /lykoskufi\s*2|lykoskufi2/i,
  /lykoskufi\s*1|lykoskufi1/i,
  /big\s*bungalow|μεγάλο|megalo/i,
  /small\s*bungalow|μικρό|mikro/i,
];

function getSortIndex(name: string): number {
  const n = (name || "").trim();
  for (let i = 0; i < ROOM_ORDER.length; i++) {
    const pattern = ROOM_ORDER[i];
    if (typeof pattern === "string") {
      if (n.toLowerCase().includes(pattern.toLowerCase())) return i;
    } else if (pattern.test(n)) {
      return i;
    }
  }
  return ROOM_ORDER.length;
}

/** Sort items by room display order. Items without a match go at the end. */
export function sortByRoomOrder<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => getSortIndex(a.name) - getSortIndex(b.name));
}

/** Translation key for unit bed tags (property.bedTags.ograHouse, etc.). */
export function getUnitBedTagKey(propertyName: string, unitName: string): string | null {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const p = n(propertyName ?? "");
  const u = n(unitName ?? "");
  const check = (key: string) => p.includes(key) || u.includes(key);

  if (check("ogra") || check("ogia")) return "property.bedTags.ograHouse";
  if (check("small") && check("bungalow")) return "property.bedTags.smallBungalow";
  if ((check("big") || check("large") || check("μεγάλο") || check("megalo")) && check("bungalow")) return "property.bedTags.bigBungalow";
  if (check("lykoskufi 5") || check("lykoski 5") || ((check("lykoskufi") || check("lykoski")) && u.includes("5"))) return "property.bedTags.lykoskufi5";
  if (check("lykoskufi 2") || check("lykoski 2") || ((check("lykoskufi") || check("lykoski")) && (u.includes("2") || u.includes("ii")))) return "property.bedTags.lykoskufi2";
  if (check("lykoskufi 1") || check("lykoski 1") || ((check("lykoskufi") || check("lykoski")) && (u.includes("1") || u.includes("i")))) return "property.bedTags.lykoskufi1";
  if (check("lykoskufi") || check("lykoski")) return "property.bedTags.lykoskufi1";
  return null;
}

/** Max guests per unit override. Returns number or null to use API/DB value. */
export function getMaxGuestsForUnit(unitName: string): number | null {
  const u = (unitName || "").toLowerCase().trim().replace(/\s+/g, " ");
  if (/small\s*bungalow/i.test(u)) return 3;
  if ((/big\s*bungalow|μεγάλο|megalo/i.test(u)) && /bungalow/i.test(u)) return 3;
  if (/lykoskufi\s*1|lykoskufi1|lykoski\s*1/i.test(u)) return 3;
  if (/lykoskufi\s*2|lykoskufi2|lykoski\s*2/i.test(u)) return 5;
  return null;
}
