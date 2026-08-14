import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // The /api/[...path] proxy forwards requests to FastAPI byte-for-byte,
  // trailing slash included. Without this, Next's own redirect strips the
  // slash before the proxy ever sees it, which then has to bounce off
  // FastAPI's trailing-slash redirect on every mismatched call.
  skipTrailingSlashRedirect: true,
};

export default withSerwist(nextConfig);
