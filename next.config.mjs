const BP = process.env.NEXT_PUBLIC_BASE_PATH || "/blindcorner/mobile";   // profile-literal-ok — this app's own default; other clients set the env var

/** @type {import('next').NextConfig} */
const nextConfig = {
  // phone-on-wifi dev preview: Next blocks cross-origin dev resources by default,
  // which left the app stuck on the loading screen when opened via the LAN IP
  allowedDevOrigins: ["192.168.4.21", "localhost", "127.0.0.1"],
  // Lives at shelfstory.io/blindcorner/mobile (proxied through the desktop project,
  // which owns the domain). Old root links bounce to the new home.
  // ONE BUILD = ONE CLIENT PATH (Joe, 2026-08-20). A second client is a second Vercel project
  // with its own env vars, not a fork. lib/basePath.js reads the same variable.
  basePath: BP,
  async redirects() {
    return [
      // The bare root goes to wherever THIS build lives. It was hardcoded to
      // /blindcorner/mobile, so a second client's mobile root 404'd (Joe, 2026-08-20).
      { source: "/", destination: BP, basePath: false, permanent: false },
      { source: "/blindcorner", destination: "/blindcorner/mobile", basePath: false, permanent: false },   // profile-literal-ok — this app's own default; other clients set the env var
    ];
  },
  // Reasonably-secret mode: open-by-link, invisible to search engines. No robots.txt
  // Disallow on purpose — engines must be able to crawl to see the noindex header.
  async headers() {
    return [
      { source: "/:path*", basePath: false, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
