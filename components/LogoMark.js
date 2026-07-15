// The ShelfStory mark: an open book with a line climbing out of it that sprouts a leaf.
// This is the single source of truth for the logo — the header, the app-open splash,
// and every loading screen all render THIS shape so they always match.
// Brand green by default; pass `grey` for the muted loader version.
const BOOK = "#3F6E4A";   // book strokes
const TREND = "#5E9277";  // climbing line + leaves

export default function LogoMark({ size = 30, grey = false }) {
  const book = grey ? "var(--text-3)" : BOOK;
  const trend = grey ? "var(--text-2)" : TREND;
  return (
    <svg viewBox="0 0 64 48" style={{ width: size, height: "auto" }} aria-hidden="true">
      <path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke={book} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke={book} strokeWidth="2.4" strokeLinejoin="round" />
      <polyline className="lm-line" points="16,31 24,28 31,23 39,16" fill="none" stroke={trend} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="lm-leaf" d="M39 16 q-2 -6 -8 -6 q1 6 8 6 z" fill={trend} />
      <path className="lm-leaf" d="M39 16 q5 -4 11 -3 q-3 6 -11 3 z" fill={trend} />
    </svg>
  );
}
