"use client";
// Small segmented control to flip the app skin live. Lives on the home header.
import { useTheme, THEMES } from "../lib/theme";

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{
      display: "inline-flex", gap: 2, padding: 2, borderRadius: 11,
      background: "rgba(255,255,255,0.6)", border: "0.5px solid var(--border)",
      backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
    }}>
      {THEMES.map(t => {
        const on = theme === t.key;
        return (
          <button key={t.key} onClick={() => setTheme(t.key)} type="button"
            style={{
              border: 0, cursor: "pointer", borderRadius: 9, padding: "5px 9px",
              fontFamily: "inherit", fontSize: 11, fontWeight: 600, lineHeight: 1,
              background: on ? "var(--accent)" : "transparent",
              color: on ? "var(--accent-ink, #fff)" : "var(--text-3)",
              transition: "background .15s, color .15s",
            }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
