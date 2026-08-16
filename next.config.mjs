/** @type {import('next').NextConfig} */
const nextConfig = {
  // phone-on-wifi dev preview: Next blocks cross-origin dev resources by default,
  // which left the app stuck on the loading screen when opened via the LAN IP
  allowedDevOrigins: ["192.168.4.21", "localhost", "127.0.0.1"],
  // Lives at shelfstory.io/blindcorner/mobile (proxied through the desktop project,
  // which owns the domain). Old root links bounce to the new home.
  basePath: "/blindcorner/mobile",
  async redirects() {
    return [
      { source: "/", destination: "/blindcorner/mobile", basePath: false, permanent: false },
      { source: "/blindcorner", destination: "/blindcorner/mobile", basePath: false, permanent: false },
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
