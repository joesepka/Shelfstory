/** @type {import('next').NextConfig} */
const nextConfig = {
  // phone-on-wifi dev preview: Next blocks cross-origin dev resources by default,
  // which left the app stuck on the loading screen when opened via the LAN IP
  allowedDevOrigins: ["192.168.4.21", "localhost", "127.0.0.1"],
};

export default nextConfig;
