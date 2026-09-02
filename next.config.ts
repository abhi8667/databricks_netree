import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The reference reader falls back to the Delta CSV export when no warehouse
   * is configured. Next only traces imports, not runtime `fs` reads, so the
   * data has to be named explicitly or a deployed build would come up empty.
   */
  outputFileTracingIncludes: {
    "/**": ["./Data/delta/*.csv"],
  },
};

export default nextConfig;
