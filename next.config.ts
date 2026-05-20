import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests when you open http://<this-machine-LAN-IP>:3000
  // from another device (e.g. phone). Restart `next dev` after editing. Add more IPs if needed.
  allowedDevOrigins: ["192.168.2.39"],
};

export default nextConfig;
