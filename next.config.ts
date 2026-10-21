import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phaser ships untranspiled ESM/CJS; compile it so turbopack/webpack can bundle it.
  transpilePackages: ["phaser"],
};

export default nextConfig;
