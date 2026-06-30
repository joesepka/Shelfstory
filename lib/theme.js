"use client";
// ShelfStory theming. One choice drives two things at once:
//   1. colors/texture  → we set <html data-theme="..."> and theme.css does the rest
//   2. tree ART        → components read useTheme() and draw the matching style
// The pick is remembered in localStorage so it survives reloads.
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { key: "classic", label: "Classic", blurb: "Layered leaf clusters" },
  { key: "cupertino", label: "Cupertino", blurb: "Smooth single canopy" },
  { key: "rounded", label: "Rounded", blurb: "Gradient canopy, blossoms & fruit" },
  { key: "clusters", label: "Layered", blurb: "Detailed leaves, blooms & fruit" },
  { key: "bubble", label: "Bubble Pop", blurb: "Glossy 3D, sparkles when popping" },
];

const KEY = "ssTheme";
const Ctx = createContext({ theme: "classic", setTheme: () => {} });
export function useTheme() { return useContext(Ctx); }
const VALID = new Set(THEMES.map(t => t.key));

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("classic");

  // restore saved choice on first mount (ignore stale/removed keys)
  useEffect(() => {
    try { const t = localStorage.getItem(KEY); if (t && VALID.has(t)) setThemeState(t); } catch {}
  }, []);

  // apply the choice to <html>; only non-classic skins carry CSS token overrides
  useEffect(() => {
    const el = document.documentElement;
    if (theme && theme !== "classic") el.dataset.theme = theme;
    else delete el.dataset.theme;
  }, [theme]);

  function setTheme(t) {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
  }

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
