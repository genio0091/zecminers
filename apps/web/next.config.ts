import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Where the gameplay clips are served from: /media locally, or a Vercel Blob store. */
function mediaOrigin(): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) return "";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

const media = mediaOrigin();

// Blueprint §11.5: CSP + HSTS. Next.js inlines small bootstrap scripts, so 'unsafe-inline'
// stays for scripts until nonce-based CSP is wired in; nothing else is allowed off-site.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://cdn.discordapp.com ${media}`.trim(),
  `media-src 'self' blob: ${media}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://discord.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@zecminers/db", "@zecminers/economy", "@zecminers/zcash", "@zecminers/zord-client"],
  serverExternalPackages: ["pg", "ioredis"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
