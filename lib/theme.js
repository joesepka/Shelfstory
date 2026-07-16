"use client";
// ShelfStory theming. One choice drives two things at once:
//   1. colors/texture  → we set <html data-theme="..."> and theme.css does the rest
//   2. tree ART        → components read useTheme() and draw the matching style
// The pick is remembered in localStorage so it survives reloads.
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { key: "classic", label: "Classic", blurb: "Layered leaf clusters" },
  { key: "cupertino", label: "Cupertino", blurb: "Smooth single canopy" },
  { key: "pixel", label: "Pixel", blurb: "8-bit pixel plant" },
  { key: "watercolor", label: "Watercolor", blurb: "Soft painted canopy" },
  { key: "lowpoly", label: "Low-poly", blurb: "Faceted geometric tree" },
  { key: "bonsai", label: "Bonsai", blurb: "Sculpted pads, curved trunk" },
];

const KEY = "ssTheme";
const MODE = "ssMode"; // "night" | "day" — high-contrast dark mode, independent of skin
const Ctx = createContext({ theme: "classic", setTheme: () => {}, night: false, setNight: () => {} });
export function useTheme() { return useContext(Ctx); }
const VALID = new Set(THEMES.map(t => t.key));

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("classic");
  const [night, setNightState] = useState(false);

  // restore saved choices on first mount (ignore stale/removed keys)
  useEffect(() => {
    try { const t = localStorage.getItem(KEY); if (t && VALID.has(t)) setThemeState(t); } catch {}
    try { if (localStorage.getItem(MODE) === "night") setNightState(true); } catch {}
  }, []);

  // apply the skin to <html>; only non-classic skins carry CSS token overrides
  useEffect(() => {
    const el = document.documentElement;
    if (theme && theme !== "classic") el.dataset.theme = theme;
    else delete el.dataset.theme;
  }, [theme]);

  // apply nighttime mode to <html> — theme.css flips every token under [data-mode="night"]
  useEffect(() => {
    const el = document.documentElement;
    if (night) el.dataset.mode = "night"; else delete el.dataset.mode;
  }, [night]);

  function setTheme(t) {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
  }
  function setNight(v) {
    setNightState(v);
    try { localStorage.setItem(MODE, v ? "night" : "day"); } catch {}
  }

  return <Ctx.Provider value={{ theme, setTheme, night, setNight }}>{children}</Ctx.Provider>;
}
