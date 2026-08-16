// THE data snapshot — the single place this app learns what date the data runs through.
// Bump these when a new export lands. Must agree with SNAP in
// shelftest-brewery/build_tables.py, which stamps the same date into the DB
// (ai_window_dense.snapshot_date / depletions_window.window_end for window 0).
export const SNAP_ISO = "2026-08-14";
export const SNAPSHOT = new Date(SNAP_ISO + "T00:00:00");   // window 0 = the 30 days ending here
export const SNAP_LABEL = "August 14th, 2026";                 // home header wording
export const SNAP_SHORT = (() => {                           // compact stamp (perf overview)
  const [y, m, d] = SNAP_ISO.split("-").map(Number);         // derived from SNAP_ISO so it can't go stale
  return `${m}/${d}/${y}`;
})();
