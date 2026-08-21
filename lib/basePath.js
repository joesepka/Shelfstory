/* WHERE THIS BUILD LIVES (Joe, 2026-08-20 — the second environment).

   basePath is compiled in, so one build serves exactly one client path. Hand-built asset URLs
   used to hardcode it, which meant a second client could only exist by forking the code.

   This file exists on BOTH apps and must keep the same shape, because components/deckSlidesCast.js
   is byte-identical to shelfcast's components/deckSlides.js and imports it. Only the default
   differs: this app is the mobile half of the pair.

   Must match `basePath` in next.config.mjs, which reads the same variable. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/blindcorner/mobile";   // profile-literal-ok — this app's own default; other clients set the env var
