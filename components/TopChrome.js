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
      <button onClick={() => router.back()} aria-label="Back"
        style={{
          position: "absolute", left: 14, bottom: 18, pointerEvents: "auto",
          height: 42, borderRadius: 21, border: "none", cursor: "pointer",
          background: "#fff", color: "#5C584E",
          boxShadow: "0 3px 12px rgba(0,0,0,.22)", fontSize: 15, fontWeight: 700, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
          fontFamily: "inherit", padding: "0 18px 0 13px",
        }}>
        <span style={{ fontSize: 22, marginTop: -2 }}>‹</span> back
      </button>
    </div>
  );
}