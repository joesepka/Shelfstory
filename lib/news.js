// ShelfStory — NEWS LAYER (product- & geography-aware talking points)
// ---------------------------------------------------------------------------
// PROOF OF CONCEPT: the STORIES array below is real, hand-seeded IPA/beer news.
// WIRING IT TO A SCRAPER (no Claude needed): a weekly job writes the SAME shape
// to a Supabase `news_stories` table, then you swap the bodies of getStories()/
// getBullets() to query Supabase (async) — every screen already calls only these
// two functions, so nothing else changes. Story shape (the scraper's contract):
//   { id, scope: "US" | "<STATE>", product, published: "YYYY-MM-DD",
//     source, headline, summary, angle, url }
//   scope = "US" (national) or a 2-letter state code · angle = the rep talking point.
// ---------------------------------------------------------------------------

// what the news is tuned toward — editable now, per-brand/company config later.
export const FOCUS = { product: "IPA", label: "IPA" };

export const STORIES = [
  // ---------- national (US) ----------
  { id: "reb-2026", scope: "US", product: "IPA", published: "2026-06-18", source: "BackBar Academy",
    headline: "Beyond the haze: the ‘Great Re-Balancing’ pulls IPA back to drinkability",
    summary: "After years of juicy, extreme hazy dominance, palate fatigue is sending drinkers back to clear, balanced West Coast and low-ABV session IPAs. 2026’s winning IPA is drinkable, not a gimmick.",
    angle: "Palate fatigue on extreme hazy — clear West Coast & session IPAs are back. Lead the set with drinkability.",
    url: "https://academy.getbackbar.com/2026-beer-trends" },
  { id: "ba-correction", scope: "US", product: "IPA", published: "2026-04-30", source: "Brewers Association",
    headline: "A year of correction for craft — with early signals of recovery",
    summary: "US craft production fell ~4% in 2025, but craft GAINED share (13.2%→13.4%) as total beer dropped 5.7% by volume. 39% of breweries grew; the segment is stabilizing into 2026.",
    angle: "Craft is the bright spot — it took share while total beer fell 5.7%. You’re selling the winning category.",
    url: "https://www.brewersassociation.org/association-news/a-year-of-correction-for-craft-beer-with-early-signals-of-recovery/" },
  { id: "bev-report", scope: "US", product: "IPA", published: "2026-03-05", source: "Beverage Industry",
    headline: "2026 Beer Market Report: IPA still anchors the craft set",
    summary: "IPAs hold 40–50% of craft segment sales even as overall craft softens. Value and convenience packs (12-packs, 19.2oz singles) are winning over 4-packs.",
    angle: "IPA is still ~half of craft — protect your facings, and get the right value pack on shelf.",
    url: "https://www.bevindustry.com/articles/98129-2026-beer-market-report-craft-beer-faces-continued-declines" },
  { id: "hazy-equilibrium", scope: "US", product: "IPA", published: "2026-05-12", source: "VinePair",
    headline: "Hazy IPAs aren’t over — they’ve found equilibrium",
    summary: "Hazy grew ~1% in 2025 and settled at about a quarter of all IPA sales. No longer explosive, but a steady, quality hazy still earns its slot.",
    angle: "Hazy isn’t dying — it’s ~1/4 of IPA sales and stabilized. A clean, quality hazy still holds its shelf.",
    url: "https://vinepair.com/articles/hazy-ipa-equilibrium/" },
  { id: "west-coast", scope: "US", product: "IPA", published: "2026-06-02", source: "The Beer Connoisseur",
    headline: "West Coast IPA is the comeback story of 2026",
    summary: "Clear, crisp, bitter West Coast IPA is back as the ‘extreme’ end (triple IPAs, milkshake, cloying fruited) shrinks. Balance and clarity define the 2026 category.",
    angle: "West Coast IPA is trending back — refresh the set toward crisp & clear, trim the extreme SKUs.",
    url: "https://beerconnoisseur.com/emerging-beer-style-trends-2026/" },
  { id: "kalsec-future", scope: "US", product: "IPA", published: "2026-02-20", source: "Kalsec",
    headline: "The future of the IPA: growth is at the extremes",
    summary: "Innovation is happening at both ends of the ABV spectrum — non-alcoholic IPAs and high-ABV imperials are the growth pockets as the middle matures.",
    angle: "Growth is at the edges — a no/low IPA opens new daytime & sober-curious occasions.",
    url: "https://www.kalsec.com/hop-products/insights/future-of-ipa" },
  { id: "ab-craft", scope: "US", product: "IPA", published: "2026-01-15", source: "Anheuser-Busch",
    headline: "Anheuser-Busch’s craft portfolio off to its best start yet in 2026",
    summary: "Big-beer’s craft brands are pressing hard early in 2026, adding shelf pressure on independents.",
    angle: "Big-craft is pressing — independents defend velocity with proof, not just placements.",
    url: "https://www.anheuser-busch.com/newsroom/anheuser-buschs-craft-beer-portfolio-is-off-to-best-start-yet" },

  // ---------- Illinois ----------
  { id: "il-closures", scope: "IL", product: "IPA", published: "2026-03-11", source: "WBEZ Chicago",
    headline: "5 breweries in 6 weeks: Chicago closures put brewers on guard",
    summary: "Rising costs, aluminum tariffs and an oversaturated market drove a wave of Chicago-area brewery closures. Illinois’ brewery count has plateaued near 300 after a decade-long boom.",
    angle: "Illinois is consolidating — shelf is opening up. Be the proven brand that fills the gap a closed local left.",
    url: "https://www.wbez.org/food-drink/2026/03/11/chicago-brewery-closures-craft-beer-alarmist-illuminated-whiner-flapjack-casa-humilde" },
  { id: "il-goldrush", scope: "IL", product: "IPA", published: "2026-04-21", source: "IL Licensed Beverage Assn.",
    headline: "After the craft beer gold rush",
    summary: "Illinois’ post-boom correction has buyers trimming sets to proven movers and rationalizing tail SKUs.",
    angle: "IL buyers are cutting to proven movers — bring the velocity data that you’re one of them.",
    url: "https://www.ilba.net/2026/04/21/after-the-craft-beer-gold-rush/" },
  { id: "il-icbw", scope: "IL", product: "IPA", published: "2026-05-08", source: "IL Craft Brewers Guild",
    headline: "Illinois Craft Beer Week returns May 8–15",
    summary: "The statewide celebration kicks off summer and drives local craft trial and features across Illinois accounts.",
    angle: "IL Craft Beer Week (May 8–15) is a ready-made hook for a feature, tasting, or display ask.",
    url: "https://www.illinoisbeer.org/icbw.html" },
];

const byDate = (a, b) => (a.published < b.published ? 1 : -1);

// ===== DATA SEAM #1 — the news list for a scope (state gets its state + national). =====
// scope: "US"/"ALL"/"" = national; a 2-letter code = that state's stories + national.
export function getStories({ scope = "US", limit = 40 } = {}) {
  const st = scope && scope !== "US" && scope !== "ALL" ? scope : null;
  return STORIES.filter(s => (st ? s.scope === st || s.scope === "US" : true)).slice().sort(byDate).slice(0, limit);
}

// ===== DATA SEAM #2 — up to `n` rep talking points for an account's STATE. =====
// State-first (down to state level for now); fills to `n` with national. Never empty.
export function getBullets(state, n = 3) {
  const local = STORIES.filter(s => s.scope === state).sort(byDate);
  const nat = STORIES.filter(s => s.scope === "US").sort(byDate);
  const out = [], seen = new Set();
  for (const s of [...local, ...nat]) { if (out.length >= n) break; if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } }
  return out;
}
