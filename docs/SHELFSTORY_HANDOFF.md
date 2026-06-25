# ShelfStory — Deep Handoff Reference
_For Claude Code. Loaded on demand; `CLAUDE.md` (root) has the always-on rules._

This captures the full state of the project as handed off from the build sessions, including detail that doesn't fit in `CLAUDE.md`. Where it says **VERIFY**, read the actual repo to confirm — this was assembled from chat context and has gaps.

---

## ORIENTATION
- **Product:** mobile-first field-sales account-intelligence PWA, beverage-alcohol (Wynk book).
- **Differentiated asset:** encoded analyst judgment — `buildVerdict` (velocity-vs-distribution decomposition) + scope-aware territory reporting. The UI is polished but commoditizable; the reasoning is the moat.
- **Runtime is AI-free.** All intelligence is deterministic JS over Supabase. Don't add runtime AI unless asked.
- **State of data:** Was DUMMY at handoff. The `shelftest/` sibling folder now holds a working ingest pipeline (`ingest.py`, `gen_snapshot.py`, six numbered `.sql` rollups, `shelf_snapshot.csv`). VERIFY whether its output is the live Supabase the app reads before assuming dummy.

---

## ARCHITECTURE / ROUTES (verified against repo 2026-06-25)
```
app/
  page.js                      Home — reactive weather, splash, brief, stat box, nav cards
  theme.css                    Harbor Green design tokens (:root) — hand-edited by Joe
  globals.css                  global styles
  layout.js                    root layout
  loading.js                   route-level loading UI
  book/page.js                 Accounts — list / grid matrix / tree; filters; health bar
  dist/page.js                 Distributor Review — 5 screen sections + 7-slide PDF deck
  perf/page.js                 Performance explorer — links into overview via ovURL() → /perf/overview
  perf/overview/page.js        Market/Territory overview — scope-aware + 7-slide deck
  account/[id]/page.js         Account detail
  account/[id]/item/[code]/page.js   Item detail
  actions/page.js              Actions to take
  treemap/page.js              Standalone treemap view
components/
  Splash.js                    Shared splash (book + climbing trendline) — note: home has its OWN inline splash
  LoadingScreen.js
  TopChrome.js
lib/
  supabase.js                  Supabase client
```
Imports are RELATIVE and depth-sensitive: `book/`, `dist/`, `perf/`, `treemap/`, `actions/` use `../../lib/supabase`; `perf/overview/` and `account/[id]/` use `../../../lib/supabase`; `account/[id]/item/[code]/` uses `../../../../../lib/supabase`.

---

## PAGE DETAIL

### `app/page.js` — HOME ✅
- Splash loader is **inline in this file** (not the shared component). Animated open-book + climbing trendline + progress bar, ~1.5s.
- **Reactive weather:** `weatherFor(pct)` maps `s.curPct` (book-wide 90d trend, same number the overview leads with) → `WEATHER` object:
  - ≥+6 Sunny (cream bg, rotating sun+rays, sparse warm clouds) · +6..−2 Fair (faint sun behind clouds, default) · −2..−8 Overcast (grey, no sun) · ≤−8 Gloomy (dark, rain).
  - `<main>` bg animates 0.8s between tints; weather chip under date; poof-on-nav fades the sky; splash stays neutral; reduced-motion kills sun-spin/rain.
  - Thresholds editable in `weatherFor()` / `WEATHER` at top of file.
- Also: time-of-day greeting, `DATA_UPDATED` hardcoded label, collapsible "brief" (`buildBrief`) above the stat box, 3-stat box (90D cases / active accts / ROS), nav cards (Performance Overview, Actions to Take, …) with poof-on-tap.

### `app/book/page.js` — ACCOUNTS ✅
- Three views toggled by `?view=`: **account** (rich rows w/ status label, volume, %, note via `buildNote`, sparkline), **grid** (`GridMatrix`), **tree** (`TreeMap`).
- Filters: search + state/city/chain/premise/distributor selects + a clickable health bar (New/Healthy/At-risk). Deep-link scope via `?ids ?city ?state ?chain ?distributor ?health`.
- Caps: account/grid 200 (`CAP`), tree 500 (`TREE_CAP`).
- **GridMatrix:** horizontally-scrolling SKU columns, frozen account column (left), frozen header row (top), frozen 90D-total column, tap-column-▾ filter menu (gaps / has-placement). Loads `item_grid` chunked 200.
- **Grid scroll FIX (most recent change):** removed scroll-snap entirely (was `scrollSnapType: x proximity` — caused sticky vertical scroll); added `touchAction: "pan-x pan-y"` + `contain: "layout paint"` + `willChange: "transform"` on the scroller. Tree got `touchAction: "pan-y"`. Frozen elements + filter menu intact. If scroll still strains on huge books, next step is row virtualization.

### `app/dist/page.js` — DISTRIBUTOR REVIEW ✅
- `?d=` distributor param + picker dropdown. Loads `account_list` once + chunked `item_grid`.
- **5 screen sections** (`.screen-only`): 01 Pulse (3 KPIs + verdict + 12mo volume bar + accounts/ROS chart + movers&shakers w/ why) · 02 Items (top-8 current-vs-prior) · 03 Account Health (4 weighted circles + good/bad brackets) · 04 Channel & Chain (two breakdown tables, Δ%, row tint, plc-ac+ROS) · 05 Executive Summary (headwinds/opportunities side by side).
- **7-slide PDF deck** via jsPDF + html2canvas: Cover → TOC → Pulse → Items → Account Health → Channel & Chain → Exec Summary. Hidden off-screen `<PrintDeck>` at `left:-20000px`; `exportPdf()` html2canvas-captures each `.pslide` @ scale 2 → 11×8.5in landscape pages → downloads `{Name}-Review.pdf`. Print code uses hardcoded `PT` hex object (NOT CSS vars — html2canvas needs explicit colors). `PRINT_CSS` pins `.pslide` to fixed 8.5in height, overflow hidden. Charts use fixed inch heights so they don't collapse.
- `DATA_THRU` and `PREPARED_BY` hardcoded constants.

### `app/perf/overview/page.js` — MARKET / TERRITORY OVERVIEW ✅ (route verified present)
- **Scope-aware** drill-down: reads `?st ?city ?channel ?chain`, filters `account_list`, auto-builds dynamic `title` ("All Territory" / "Illinois" / "Binny's · IL" / etc).
- Same 5 sections + 7-slide deck as dist, cover titled **"Territory Business Review · {title}"**, button "⤓ Generate territory report", file `{title}-Review.pdf`.
- **Scope-aware "Where It Sells"** (`dims` useMemo): picks the two meaningful breakdowns for the scope — chain-scope→[channel,city]; channel-scope→[chain,city]; city/state/all→[channel,chain]. Never a useless one-row table. `buildDim()` builds channel/chain/city aggregates.
- Health = 4 buckets here too (lapsed split out). Health circles are display-only in market scope (no health filter param).
- Drill-down rows call `router.push("/perf/overview?...")` (line ~852) and `back={() => router.push("/perf")}` — both paths verified correct.

---

## KEY FUNCTIONS (the product, not the chrome)
- **`buildVerdict(m, title)`** (dist + overview) — THE asset. Decomposes volume move into distribution vs velocity by comparing volume% vs accounts%, names the lever (rate-of-sale vs winning doors). Worth: extracting to a tested standalone module; pressure-testing against real data for confident-but-wrong verdicts. NOTE: currently duplicated in both `dist/page.js` and `perf/overview/page.js` — candidate for extraction to `lib/`.
- **`weatherFor(pct)` / `WEATHER`** (home) — outlook → sky.
- **`healthBucket(headline)`** — 4-bucket classifier (consistency-critical across pages).
- **`buildDim(dim)` + scope-aware `dims`** (overview) — meaningful breakdowns per scope.
- **`buildBrief(rows)`** (home) — narrative brief from state/city/chain/quiet-account aggregates.
- **`buildNote(r)`** (book) — per-account one-liner.
- **`PrintDeck`** (dist + overview) — off-screen 7-slide deck for html2canvas capture.
- **`aggBy` / channel+chain/city aggregation** — the breakdown-table builders.

---

## BACKLOG (priority order — see the strategic list for the full 15)
1. **Real data ingestion pipeline** (NielsenIQ/Circana/distributor files → clean Supabase tables, scheduled). Partially built in `shelftest/` — confirm wiring + schedule.
2. **Data-quality / validation layer** (stale feeds, implausible swings, missing channel_type, placement reconciliation).
3. **Automated rep email digests** (weekly personalized brief from existing logic; can stay AI-free with templates).
4. **Action-tracking loop** (rep marks visited/placed/lost → learn which recs convert → prove ROI).
5. **Historical time-series store** (retain every period vs current 2-snapshot model; powers real trends + the decomposition).
6. **Extract `buildVerdict` into a tested module** + pressure-test for false-confident verdicts.
- Smaller: wire `DATA_UPDATED`/`DATA_THRU` to a real as-of column; add `channel_type` filter param to book page for dist channel deep-links; link market health circles; consider grid row virtualization.

---

## CONVENTIONS TO PRESERVE
- Relative imports only. `.js` only. CSS vars in screen UI; hardcoded `PT` hex in print/PDF.
- `item_grid` always queried chunked-200 via `.in()`.
- 4-bucket health everywhere; ROS = cases/accts/3 monthly, `.toFixed(1)`.
- Corner-bracket motif + Harbor Green tokens.
- Keep runtime AI-free unless explicitly changing that.

---

## VERIFY-FIRST CHECKLIST (do this before big changes)
- [ ] Confirm full Supabase schema (`docs/DATA_MODEL.md` is reconstructed; reconcile against `shelftest/*.sql`).
- [x] Confirm all route folder names + the `perf/overview` push path. (Done 2026-06-25 — all correct.)
- [ ] Run a local build to baseline that the repo compiles clean.
- [x] Check `package.json` deps include `jspdf`, `html2canvas`. (Both present.)
