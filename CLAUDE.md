# CLAUDE.md — ShelfStory

This file is auto-loaded every session. It holds durable rules and facts. For deep detail see `docs/SHELFSTORY_HANDOFF.md` and `docs/DATA_MODEL.md`.

## What this is
ShelfStory is a mobile-first field-sales account-intelligence PWA for CPG/beverage-alcohol (built for the Wynk book). It turns syndicated/distributor data into a glanceable "book": account health, item performance, territory drill-downs, and exportable distributor/territory review decks.

**The differentiated asset is the analyst reasoning encoded in code** — `buildVerdict` (velocity-vs-distribution decomposition) and the scope-aware territory report. Not the UI. Protect and sharpen that logic.

**Runtime is AI-free by design.** The app makes no AI calls; all "intelligence" is deterministic JS over Supabase data. Keep it that way unless explicitly asked to add a runtime-AI feature.

> ⚠️ Currently runs on DUMMY DATA. Insights are about made-up numbers until a real book is loaded. Treat real-data ingestion + validation as the highest-value work. (NOTE: the `shelftest/` sibling folder holds a working ingest pipeline — `ingest.py`, `gen_snapshot.py`, numbered `.sql` rollups. Verify whether it's wired to the live Supabase the app reads before assuming data is still dummy.)

## Working preferences (follow these)
- **Plain JavaScript (`.js`), never `.tsx`/TypeScript.**
- **ALL imports RELATIVE** — `../../lib/supabase`, `../../../lib/supabase`. NEVER `@/` path aliases.
- Edit one file at a time; confirm before moving to the next.
- No full-file dumps needed in Code (you edit in place) — but keep changes surgical and explain what changed and why.
- Don't stray from agreed scope. Mock/describe visual changes before building when they're non-trivial.
- Joe is director-and-judge: he validates with deep domain expertise (15 yrs CPG/bev-alc, ex-PepsiCo, built 3 Tier Beverages). Generate the code; he judges the logic. He wants committed answers, not hedging, and will push back when something's off.

## Stack & deploy
- Next.js 16 (App Router, JS, Turbopack), PWA · Supabase/Postgres · Vercel (`shelfstory.vercel.app`)
- PDF export: `jspdf` + `html2canvas` (installed)
- Deploy from repo root: `git add . && git commit -m "..." && git push` → Vercel auto-builds. Confirm `package.json` + lockfile committed.
- Before pushing, run the build locally to catch errors.

## Aesthetic — "Harbor Green" (locked)
Design tokens live in `app/theme.css` (`:root`). Use the CSS vars, not hardcoded hex, in screen UI. (Print/PDF code uses a hardcoded `PT` hex object on purpose — html2canvas needs explicit colors.)
Core vars: `--bg #fff` `--surface #fff` `--surface-2 #E4E8DC` · `--text #2A332A` `--text-2 #54604F` `--text-3 #9AA593` · `--border #E7EBDF` `--border-strong #DCE2D2` · `--accent #5E9277` `--accent-deep #3F6E4A` `--accent-soft #E1EFE2` · `--pop-warm #C56A4A`/-deep `#B0573A`/-soft `#F6E2D8` · `--pop-cool #5E8FC0`/-deep `#3D6E93`/-soft `#E2EBF4` · `--up #3E8A5E` `--down #C0533A` · `--watch-bg #F5EBD3`/-ink `#8A6310`.
Fonts: `--font-sans` (DM Sans), `--font-serif` (Fraunces). **Corner-bracket motif** throughout.

## Data rules (locked — consistent across all pages)
- **Independent** = blank/null `chain`.
- **ROS** = 90D cases ÷ accounts ÷ 3 (MONTHLY). Display `.toFixed(1)`.
- **Health = 4 buckets**: New / Healthy / At-risk / Lapsed via `healthBucket()` (new→new, lapsed→lapsed, decelerating/at-risk→atrisk, else→healthy). `goodPct` = New+Healthy vol share; `badPct` = At-risk+Lapsed.
- **vol(a)** = isNew ? cur90*3 : account_weight.
- **Channel**: `account_list.channel` on/off via `startsWith("ON")`; `channel_type` (grocery/liquor/etc) shown individually if ≥5% L52W else bucketed to "All other on/off".
- **spark** = ~12 monthly values; drop trailing partial month (→ 11).
- `kfmt` abbreviates (52k/810).

## Pages (see handoff doc for full detail)
- `app/page.js` — Home. Reactive weather background driven by `s.curPct` (Sunny/Fair/Overcast/Gloomy). Splash lives in this file.
- `app/book/page.js` — Accounts: list / grid matrix / tree views. Grid scroll recently fixed (no scroll-snap; `touch-action` axis hints).
- `app/dist/page.js` — Distributor Review: 5 screen sections + 7-slide PDF deck (jsPDF/html2canvas).
- `app/perf/page.js` — Performance explorer; links into the overview via `ovURL()` → `/perf/overview`.
- `app/perf/overview/page.js` — Market/Territory overview: scope-aware (`?st ?city ?channel ?chain`) drill-down + matching 7-slide "Territory Business Review" deck. (Verified present; `router.push("/perf/overview")` from the explorer is correct.)
- `app/account/[id]/page.js` + `app/account/[id]/item/[code]/page.js` — account detail + item detail.
- `app/actions/page.js` — Actions to take.
- `app/treemap/page.js` — standalone treemap view.

## First things to verify against the repo
1. Full Supabase schema for `account_list` and `item_grid` (I only know columns from `.select()` calls — see `docs/DATA_MODEL.md`).
2. Whether `shelftest/` ingest output is the live data the app reads (dummy-vs-real status).
3. Actual folder structure / any files not yet seen.

@AGENTS.md
