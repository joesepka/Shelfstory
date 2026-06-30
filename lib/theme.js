"use client";
// ShelfStory theming. One choice drives two things at once:
//   1. colors/texture  → we set <html data-theme="..."> and theme.css does the rest
//   2. tree ART        → components read useTheme() and draw the matching style
// The pick is remembered in localStorage so it survives reloads.
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { key: "default", label: "Classic" },
  { key: "cupertino", label: "Cupertino" },
  { key: "ink", label: "Pen & Ink" },
];

const KEY = "ssTheme";
const Ctx = createContext({ theme: "default", setTheme: () => {} });
export function useTheme() { return useContext(Ctx); }

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("default");

  // restore saved choice on first mount
  useEffect(() => {
    try { const t = localStorage.getItem(KEY); if (t) setThemeState(t); } catch {}
  }, []);

  // apply the choice to <html> so the CSS token blocks take over
  useEffect(() => {
    const el = document.documentElement;
    if (theme && theme !== "default") el.dataset.theme = theme;
    else delete el.dataset.theme;
  }, [theme]);

  function setTheme(t) {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
  }

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
