import type { NextConfig } from "next";

const retailerImageDomains = [
  "lowes.com", "target.com", "dollargeneral.com", "walgreens.com", "cvs.com",
  "costco.com", "samsclub.com", "bestbuy.com", "tractorsupply.com", "officedepot.com",
];
const nextConfig: NextConfig = {
  images: {
    // Match the providers accepted by discovery normalization. Query strings
    // carry thumbnail IDs and sizing parameters, so they must remain allowed.
    remotePatterns: [
      "images.thdstatic.com", "i5.walmartimages.com", "*.gstatic.com", "serpapi.com",
      ...retailerImageDomains.flatMap(domain => [domain, `**.${domain}`]),
    ].map(hostname => ({protocol: "https" as const, hostname, port: "", pathname: "/**"})),
  },
  transpilePackages: [
    "@flipscout/types",
    "@flipscout/core",
    "@flipscout/i18n",
    "@flipscout/api-client",
  ],
};

export default nextConfig;
