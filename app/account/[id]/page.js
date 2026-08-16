"use client";
// The account view IS the desktop's account card now — one component, one methodology,
// one dataset. The old mobile scorecard / working-watch / $-per-week view is retired.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AcctCard from "../../../components/AcctCard";
import { getLabel } from "../../../lib/scope";

export default function AccountPage() {
  const { id } = useParams();
  const router = useRouter();
  const [label, setLabel] = useState(null);
  useEffect(() => { setLabel(getLabel() || ""); }, []);
  if (label === null) return null;
  return (
    <main style={{ height: "100dvh", background: "var(--bg)", maxWidth: "var(--maxw)", margin: "0 auto", padding: "10px 12px 0", fontFamily: "var(--font-sans)", boxSizing: "border-box" }}>
      <AcctCard accountId={id} onBack={() => router.back()} parents={label ? [label] : null} />
    </main>
  );
}
