// Edge gate for the deployed mobile app: HTTP Basic Auth against APP_PASSWORD.
// The real book never renders on an open URL, so on Vercel this FAILS CLOSED —
// no APP_PASSWORD configured means everything 401s until one is set.
// Local dev (no VERCEL env) stays open. Password works in either auth field.
import { NextResponse } from "next/server";

export const config = { matcher: ["/((?!_next/|favicon\.ico|brand/).*)"] };

const CHALLENGE = { "WWW-Authenticate": 'Basic realm="ShelfStory"' };

export function middleware(req) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) {
    if (!process.env.VERCEL) return NextResponse.next();   // local dev stays frictionless
    return new NextResponse("Locked — set APP_PASSWORD in the Vercel project's environment variables.", { status: 401, headers: CHALLENGE });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const [u, p] = atob(auth.slice(6)).split(":");
      if (p === pass || u === pass) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("This book is private.", { status: 401, headers: CHALLENGE });
}
