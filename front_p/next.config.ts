import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignorer les erreurs ESLint pendant le build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignorer les erreurs TypeScript pendant le build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  
  // Configuration pour éviter les erreurs de build
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;