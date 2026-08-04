// Datum price list — mirrors shelftest/datum_snapshot_pricing.csv (uniform across
// states): WHOLESALE = brand revenue, RETAIL = price to the retailer (wholesale ×
// 1.27). Single source of truth for all $ math in the app. If pricing ever varies
// by state, swap this for a Supabase lookup keyed by (state, item).
export const MARKUP = 1.27;

export function wholesaleOf(name) {
  const s = String(name || "").toUpperCase();
  if (s.includes("IPA")) return 42;     // IPA Series
  if (s.includes("LAGER")) return 35;   // Lager Series
  return 42;                            // default (book is IPA / Lager only)
}
export function retailOf(name) { return wholesaleOf(name) * MARKUP; }   // what the retailer buys at
export function distProfitCase(name) { return retailOf(name) - wholesaleOf(name); }

// retailer profit per case = sell − buy, where sell = retail ÷ (1 − margin)
export function profitPerCase(name, margin = 0.30) {
  return retailOf(name) * (margin / (1 - margin));
}
