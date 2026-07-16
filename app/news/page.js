// News page — server-rendered, scope comes from the URL (?scope=IL). Deterministic:
// no client hooks, so it renders correctly whether or not JS has hydrated. The home
// newspaper icon links here with the current scope; a bare /news is national.
import { getStories, FOCUS } from "../../lib/news";

const STN = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(d) { const p = String(d || "").split("-"); return p.length === 3 ? `${MON[+p[1] - 1]} ${+p[2]}` : d; }

export default async function NewsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const scope = (sp.scope ? String(sp.scope) : "US").toUpperCase();
  const scopeName = scope === "US" || scope === "ALL" ? "National" : (STN[scope] || scope);
  const stories = getStories({ scope });

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", maxWidth: 520, margin: "0 auto", padding: "18px 18px 90px" }}>
      {/* masthead */}
      <div style={{ textAlign: "center", borderBottom: "2px solid var(--text)", paddingBottom: 12, marginBottom: 4 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent-deep)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h13v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2" /><path d="M7 8h7M7 11h7M7 14h4" /></svg>
          The {FOCUS.label} Wire
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, letterSpacing: "-0.5px", margin: "6px 0 3px", lineHeight: 1.05 }}>{FOCUS.label} on the shelf</h1>
        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Tuned to <b style={{ color: "var(--text-2)" }}>{scopeName}</b> · {stories.length} recent stories · refreshes weekly</div>
      </div>

      {/* stories */}
      <div>
        {stories.map((s) => (
          <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textDecoration: "none", color: "inherit", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 5 }}>
              <span style={{ color: "var(--accent-deep)" }}>{s.source}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>{fmt(s.published)}</span>
              {s.scope !== "US" && <span style={{ marginLeft: "auto", color: "var(--pop-cool-deep)", background: "var(--pop-cool-soft)", padding: "1px 7px", borderRadius: 10, letterSpacing: "0.06em" }}>{s.scope}</span>}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 17.5, fontWeight: 600, lineHeight: 1.24, letterSpacing: "-0.2px", color: "var(--text)" }}>{s.headline}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-2)", marginTop: 5 }}>{s.summary}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "var(--accent)", marginTop: 7 }}>Read the story
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </div>
          </a>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 10, color: "var(--text-3)", marginTop: 18, lineHeight: 1.5 }}>
        Headlines are pulled from public sources, tuned to {FOCUS.label}.<br />A weekly scraper will refresh this automatically.
      </div>
    </main>
  );
}
