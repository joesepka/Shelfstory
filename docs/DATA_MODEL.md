# ShelfStory — Data Model Reference

> ⚠️ **IMPORTANT:** This schema is RECONSTRUCTED from the `.select()` calls across the page files. It lists only columns the app *queries* — there may be more columns in Supabase, and types/nullability below are inferred from usage, not confirmed. **Claude Code: verify this against the actual Supabase schema** (Supabase dashboard → Table editor, or `select *` with a limit) and correct/expand this file. Treat it as a starting map, not ground truth. (The `shelftest/` numbered `.sql` files — `04_account_list.sql`, `05_item_grid.sql` — are the authoritative column source; reconcile against those.)

## Table: `account_list`
One row per account (retail/on-premise outlet). The core book.

Columns observed in queries (from `app/book/page.js`, `app/page.js`, `app/dist/page.js`, `app/perf/overview/page.js`):

| column | meaning / usage | notes |
|---|---|---|
| `account_id` | PK; joins to `item_grid.account_id` | |
| `account_name` | display name | |
| `channel` | premise — on/off via `startsWith("ON")` | string e.g. "ON-PREMISE" |
| `channel_type` | grocery / liquor / convenience / club / mass / etc | drives channel breakdowns |
| `chain` | chain name; blank/null = **Independent** | |
| `city` | | |
| `state` | 2-letter; mapped to full name via STNAME | |
| `zip` | | queried in book page |
| `distributor` | distributor name (dist review `?d=` matches this) | |
| `account_weight` | annualized/52-wk volume estimate (cases) | basis for `vol()` unless New |
| `cur90` | current 90-day cases | |
| `prev90` | prior 90-day cases | for Δ% |
| `prior90_pct` | precomputed 90d-vs-prior % (account level) | book/tree use this directly |
| `cases_per_month` | account ROS-ish display value | |
| `placements_delta` | change in placements | used in buildNote |
| `live_placements` | current placement count | |
| `live_prev` | prior placement count | |
| `headline` | health status string → healthBucket() | "new","healthy","accelerating","decelerating","at-risk","atrisk","lapsed" |
| `lost_sku` | name of a recently lost SKU | buildNote |
| `growing_count` | # SKUs growing in the account | |
| `active_count` | # active SKUs in the account | |
| `spark` | array (~12) monthly values for sparkline/charts | drop trailing partial → 11 |
| `last_invoice_date` | ISO date of last invoice | lapsed "last sold" |
| `last_order_w` | weeks since last order | staleness flag (≥2 = quiet) |

### Derived (computed in code, not columns)
- `healthBucket(headline)` → new | healthy | atrisk | lapsed
- `vol(a)` = isNew ? cur90*3 : account_weight
- `isOn(a)` = channel startsWith "ON"
- ROS = cur90 / activeAccts / 3 (monthly)

## Table: `item_grid`
One row per account × product (the SKU-level matrix). Joined by `account_id`.

| column | meaning / usage | notes |
|---|---|---|
| `account_id` | FK → account_list | chunk queries `.in('account_id', …)` 200 at a time |
| `product_key` | stable SKU id | used as column key in grid; preferred over name for grouping |
| `item_name` | display name | |
| `l90` | last-90-day cases for this account×SKU | grid cell value; placement = l90>0 |
| `l90_prev` | prior-90-day cases | item current-vs-prior bars |
| `l52` | last-52-week cases | used to rank/size SKUs, channel weighting |
| `cell_state` | grid cell tone: growth / decline / lost_recent / (steady) | drives cell color |

### Query pattern (important)
`item_grid` is large — always queried in **chunks of 200 account_ids** via `.in('account_id', ids.slice(i, i+200))`, looping and concatenating. Keep this pattern for any new item-level query.

## Open schema questions for Code to resolve
1. Are there columns in `account_list` / `item_grid` not listed here? (very likely — reconcile against `shelftest/04_account_list.sql` + `05_item_grid.sql`)
2. Exact types + nullability of each column.
3. Is there an as-of / data-loaded timestamp column anywhere? (Home + decks currently hardcode `DATA_UPDATED` / `DATA_THRU` — wiring these to a real column is on the backlog.)
4. Any other tables (e.g. for the actions page, distributor metadata, geo)?
5. Indexes — is `account_id` indexed on `item_grid` for the chunked `.in()` queries?
