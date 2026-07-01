"use client";
import { usePathname, useRouter } from "next/navigation";

export default function TopChrome() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none",
      maxWidth: 520, margin: "0 auto",
    }}>
      <button onClick={() => router.back()} aria-label="Back" className="backbtn"
        style={{
          position: "absolute", left: 14, bottom: 18, pointerEvents: "auto",
          height: 40, borderRadius: 20, border: "0.5px solid var(--border-strong)", cursor: "pointer",
          background: "var(--surface)", color: "var(--text-2)",
          boxShadow: "var(--shadow)", fontSize: 13.5, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.2px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          fontFamily: "inherit", padding: "0 16px 0 11px",
        }}>
        <span style={{ fontSize: 19, marginTop: -1 }}>‹</span> Back
      </button>
    </div>
  );
}