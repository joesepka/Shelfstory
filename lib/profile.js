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
const PROFILES = {
  datum: {
    label: "Datum (demo)",
    setup: "CANOPY",
    shape: "wide",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  /* THE SECOND ENVIRONMENT (Joe, 2026-08-20). Its own Supabase project, so it cannot see a
     word of Blind Corner's book -- isolation is the database, and the credentials that reach
     it live only in this build's env. Seeded from a Blind Corner export as placeholder data
     that Joe will rename in the item matrix; the point is that renaming it can never touch
     the real client.

     Adding a client is this block plus two env vars. If it ever needs more than that, the
     thing it needs belongs in `rules` -- see the note at the top of this file. */
  demo: {
    label: "Demo",
    setup: "BLOOM",
    shape: "brewery",
    parents: [["NORTHWIND", "Northwind", "northwind"], ["DRIFT", "Drift", "drift"]],
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_DEMO,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEMO,
  },
  brewery: {
    label: "Blind Corner",
    setup: "BLOOM",
    shape: "brewery",
    parents: [["BLIND CORNER", "Blind Corner", "blindcorner"], ["TORCH", "Torch", "torch"]],
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

/* SHAPE IS NOT NAME (Joe, 2026-08-20 — the second environment).

   Twelve places asked `profile.name === "brewery"` to mean "this client's data has the brewery
   shape": an account_parent table, parent + sales_rep columns, cities on the home rail rather
   than states. That worked while brewery was the only client of its kind. The moment a SECOND
   brewery-shaped client exists it takes the wrong branch everywhere — wrong table, wrong
   columns, wrong home dimension — for no reason other than being called something else.

   So the question moved off the name and onto a declared capability. A new client says which
   shape its data is and the code follows that. Same principle as `rules` below: what a client
   IS should be data, never a name the code recognises. */
const name = process.env.NEXT_PUBLIC_PROFILE || "datum";
const active = PROFILES[name] || PROFILES.demo;
export const profile = { name, ...active };
/* THE LABEL PAIR IS A CLIENT FACT (Joe, 2026-08-20). app/page.js hardcoded
   [["BLIND CORNER",...],["TORCH",...]] and used it to FILTER the account query. The demo's data
   says NORTHWIND / DRIFT, so the filter matched nothing and the whole board came up empty --
   413 accounts in the database, zero on screen. Renaming a client's labels is the most ordinary
   thing a second client will ever need, and it should never have been a code edit. */
export const parents = active.parents || [["BLIND CORNER", "Blind Corner", "blindcorner"], ["TORCH", "Torch", "torch"]];
/* AND WHICH LOGO EACH LABEL WEARS. This was `parentSel[0] === "TORCH" ? "torch" : "blindcorner"`
   written out in three places, so a second client wore the first client's marks no matter what
   its data said. The brand key rides on the label itself now. */
export const brandKeyOf = (dbValue) => {
  const hit = parents.find(p => String(p[0]).toUpperCase() === String(dbValue || "").toUpperCase());
  return (hit && hit[2]) || parents[0][2];
};
export const defaultBrandKey = parents[0][2];
/* The DB values of this client's first and second labels. Every default and every
   "is this the other one?" test reads these instead of the strings "BLIND CORNER" / "TORCH",
   which is what left the demo booting into a label its own data does not contain. */
export const parentLabelOf = (dbValue) => {
  const hit = parents.find(p => String(p[0]).toUpperCase() === String(dbValue || "").toUpperCase());
  return (hit && hit[1]) || parents[0][1];
};
export const HOUSE_PARENT = parents[0][0];
export const ALT_PARENT = (parents[1] && parents[1][0]) || parents[0][0];
export const isBreweryShape = (active.shape || "wide") === "brewery";
export const rules = { ...DEFAULT_RULES, ...(active.rules || {}) };
