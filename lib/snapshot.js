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

// Trailing-12 month axis (hist[12..23] in the 24-window arrays): short names plus a year
// marker on the first column and on January — the deck's chart axis.
const _t12 = (() => {
  const months = [], yr = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(SNAPSHOT.getFullYear(), SNAPSHOT.getMonth() - k, 1);
    months.push(d.toLocaleString("en-US", { month: "short" }));
    yr.push(d.getMonth() === 0 ? "'" + String(d.getFullYear()).slice(2) : "");
  }
  if (!yr[0]) yr[0] = "'" + String(new Date(SNAPSHOT.getFullYear(), SNAPSHOT.getMonth() - 11, 1).getFullYear()).slice(2);
  return { months, yr };
})();
export const T12_MONTHS = _t12.months;
export const T12_YR = _t12.yr;

/* THE SAME AXIS FOR ANY TRAILING WINDOW (synced from shelfcast 2026-08-19). This app names the
   snapshot date SNAPSHOT rather than SNAP, which is the only difference from the desktop copy. */
export const monthAxis = (n) => {
  const N = Math.max(1, Math.min(24, n | 0)), months = [], yr = [];
  for (let k = N - 1; k >= 0; k--) {
    const d = new Date(SNAPSHOT.getFullYear(), SNAPSHOT.getMonth() - k, 1);
    months.push(d.toLocaleString("en-US", { month: "short" }));
    yr.push(d.getMonth() === 0 ? "'" + String(d.getFullYear()).slice(2) : "");
  }
  if (!yr[0]) yr[0] = "'" + String(new Date(SNAPSHOT.getFullYear(), SNAPSHOT.getMonth() - (N - 1), 1).getFullYear()).slice(2);
  return { months, yr };
};
