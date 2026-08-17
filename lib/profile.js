// Active data + setup profile — the "which world" switch.
// Flip worlds by setting NEXT_PUBLIC_PROFILE in .env.local:
//   demo    = current dummy data (Datum)      [default]
//   brewery = Blind Corner (real single-state)
// Restart the dev server after changing it (NEXT_PUBLIC_* vars load at start).
// `setup` seeds the future feature tiers (BLOOM = small brand, CANOPY = large).
//
// `rules` is the per-company override block: every judgement call that is true for THIS
// company's data and would be wrong for the next one. A new tenant starts from DEFAULT_RULES
// (nothing excluded) and adds only what its own book needs, so nothing carries over silently.
// Read them through `rules` at the bottom of this file, never by reaching into PROFILES.
// Kept identical to the desktop's lib/profile.js — the two apps must exclude the same things.
const PROFILES = {
  demo: {
    label: "Datum (demo)",
    setup: "CANOPY",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  brewery: {
    label: "Blind Corner",
    setup: "BLOOM",
    // No territory exclusions: House (the brewery's own taproom accounts) rides the rail
    // alongside North / Central / South — Joe, 2026-08-17.
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_BREWERY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BREWERY,
  },
};

// A brand-new company excludes nothing until someone decides otherwise.
export const DEFAULT_RULES = {
  hideTerritories: [],   // sales-rep territories hidden from the territory rail
};

const name = process.env.NEXT_PUBLIC_PROFILE || "demo";
const active = PROFILES[name] || PROFILES.demo;
export const profile = { name, ...active };
export const rules = { ...DEFAULT_RULES, ...(active.rules || {}) };
