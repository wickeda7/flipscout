import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@flipscout/types",
    "@flipscout/core",
    "@flipscout/i18n",
    "@flipscout/api-client",
  ],
};

export default nextConfig;
