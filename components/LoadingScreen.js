// Route-transition fallback (Next.js loading.js). Intentionally just the paper
// background — NO animated mark. Each page renders its own <Splash> while it
// fetches, and that one is the loader the user sees. Drawing a second, higher-
// centered mark here made the loader appear to "jet" downward as the page's own
// Splash took over at a lower position. A blank backdrop hands off seamlessly.
export default function LoadingScreen() {
  return <div role="status" aria-label="Loading" style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 40 }} />;
}
