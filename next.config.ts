import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vinahost.vn",
      },
    ],
  },
};

export default nextConfig;
