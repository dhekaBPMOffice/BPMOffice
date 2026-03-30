import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita bundling inconsistente de chunks vendor (ex.: erro ./vendor-chunks/@supabase.js após refresh)
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
