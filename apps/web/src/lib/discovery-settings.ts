import type { DiscoveryCategory, DiscoveryKind } from "@flipscout/types";

export interface DiscoverySettings {
  zip: string;
  radiusMiles: number;
  category: DiscoveryCategory;
  kind: DiscoveryKind;
  sort: "default" | "discount" | "price";
}
export const defaultDiscoverySettings: DiscoverySettings = {
  zip: "33511", radiusMiles: 25, category: "all", kind: "all", sort: "default",
};
export const discoveryStorageKey = "flipscout.discovery.settings.v1";
const keys = ["zip", "radiusMiles", "category", "kind", "sort"] as const;
export function normalizeSettings(value: unknown): DiscoverySettings {
  const v = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  return {
    zip: typeof v.zip === "string" && /^\d{5}$/.test(v.zip) ? v.zip : "33511",
    radiusMiles: typeof v.radiusMiles === "number" && [5,10,15,20,25].includes(v.radiusMiles) ? v.radiusMiles : 25,
    category: "all",
    kind: ["all","sale","clearance","penny"].includes(String(v.kind)) ? v.kind as DiscoveryKind : "all",
    sort: ["default","discount","price"].includes(String(v.sort)) ? v.sort as DiscoverySettings["sort"] : "default",
  };
}
/** An explicit search link overrides device preferences; neither triggers a request. */
export function restoreSettings(search: string, saved: string | null): DiscoverySettings {
  const params = new URLSearchParams(search);
  if (keys.some(key => params.has(key))) {
    const values: Record<string, unknown> = {};
    for (const key of keys) {
      if (params.getAll(key).length !== 1) continue;
      const value = params.get(key);
      values[key] = key === "radiusMiles" ? Number(value) : value;
    }
    return normalizeSettings(values);
  }
  try { return normalizeSettings(saved ? JSON.parse(saved) : null); }
  catch { return { ...defaultDiscoverySettings }; }
}
export function searchSettingsParams(settings: DiscoverySettings): string {
  const safe = normalizeSettings(settings);
  return new URLSearchParams({
    zip: safe.zip, radiusMiles: String(safe.radiusMiles),
    kind: safe.kind, sort: safe.sort,
  }).toString();
}
