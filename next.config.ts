import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → produces an `out/` folder of static files for Firebase
  // Hosting. The app is fully client-side (IndexedDB local + Firestore cloud),
  // so no server/API routes are needed.
  output: "export",
  images: {
    // next/image optimization needs a server; not used for static export.
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
