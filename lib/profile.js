// Active data + setup profile — the "which world" switch.
// Flip worlds by setting NEXT_PUBLIC_PROFILE in .env.local:
//   demo    = current dummy data (Datum)      [default]
//   brewery = Blind Corner (real single-state)
// Restart the dev server after changing it (NEXT_PUBLIC_* vars load at start).
// `setup` seeds the future feature tiers (BLOOM = small brand, CANOPY = large).
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
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_BREWERY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BREWERY,
  },
};

const name = process.env.NEXT_PUBLIC_PROFILE || "demo";
export const profile = { name, ...(PROFILES[name] || PROFILES.demo) };
