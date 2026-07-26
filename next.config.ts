import type { NextConfig } from "next";

const isDesktop = process.env.NEXT_PUBLIC_DESKTOP === "true";

const nextConfig: NextConfig = isDesktop
  ? {
      output: "export",
      distDir: ".next-desktop",
      trailingSlash: true,
      images: { unoptimized: true },
      poweredByHeader: false,
      reactStrictMode: true,
    }
  : {
      allowedDevOrigins: ["127.0.0.1", "localhost"],
      output: "standalone",
      poweredByHeader: false,
      reactStrictMode: true,
    };

export default nextConfig;
