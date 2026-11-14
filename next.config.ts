import type { NextConfig } from "next";

// Headers de endurecimento. CSP fica de fora de propósito: o checkout
// carrega o SDK e os campos seguros (iframes) do Mercado Pago e há
// scripts/estilos inline do Next; uma CSP sem teste em produção arriscaria
// quebrar a compra. X-Frame-Options trata de quem embute a loja, não dos
// iframes que a loja embute.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
