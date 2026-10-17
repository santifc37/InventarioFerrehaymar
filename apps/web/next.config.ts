import type { NextConfig } from 'next';

// Rewrites (P-001 opción a): el navegador solo habla con Next.js en /api/*,
// y el servidor de Next reenvía a la API. Así la cookie de sesión es de
// primeros sin problemas de SameSite entre dominios.
const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default config;
