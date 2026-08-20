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

/* THE AXIS TELLS THE TRUTH ABOUT ITS OWN PERIODS (Joe, 2026-08-20). These are NOT calendar
   months: every window is exactly 30 days and they drift back from the snapshot -- verified
   against depletions_window.window_end (8/14, 7/15, 6/15, 5/16, 4/16, 3/17, thirty days apart
   every time). A bar labelled "May" actually covered Apr 17 - May 16, so a tick is now the date
   its window ENDS, m/d. Same width as "Aug", and it cannot mislead.

   Synced from shelfcast; this app names the snapshot date SNAPSHOT rather than SNAP, which is
   the only difference from the desktop copy. */
const DAY = 86400000;
const winEnd = (k) => new Date(SNAPSHOT.getTime() - k * 30 * DAY);
const md = (d) => (d.getMonth() + 1) + "/" + d.getDate();

const _axis = (n) => {
  const N = Math.max(1, Math.min(24, n | 0)), months = [], yr = [];
  let prevYear = null;
  for (let k = N - 1; k >= 0; k--) {
    const d = winEnd(k);
    months.push(md(d));
    const y = d.getFullYear();
    yr.push(prevYear !== null && y !== prevYear ? "'" + String(y).slice(2) : "");
    prevYear = y;
  }
  if (!yr[0]) yr[0] = "'" + String(winEnd(N - 1).getFullYear()).slice(2);
  return { months, yr };
};
const _t12 = _axis(12);
export const T12_MONTHS = _t12.months;
export const T12_YR = _t12.yr;
export const monthAxis = (n) => _axis(n);
