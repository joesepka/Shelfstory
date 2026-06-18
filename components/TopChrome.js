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
          width: 46, height: 46, borderRadius: 23, border: "none", cursor: "pointer",
          background: "#fff", color: "#5C584E",
          boxShadow: "0 3px 12px rgba(0,0,0,.22)", fontSize: 24, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit", paddingBottom: 3,
        }}>
        ‹
      </button>
    </div>
  );
}