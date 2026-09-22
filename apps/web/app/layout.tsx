import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ZecMiners — mine $ZGEMS in the browser, paid weekly on Zcash",
    template: "%s · ZecMiners",
  },
  description:
    "ZecMiners is a pixel mining game. Soulbound Whitelist Pass holders mine $ZGEMS, a ZRC-20 token on Zcash mainnet, and the balance is paid to their wallet every week. No liquidity pool at launch. Official trading starts after the NFT mint.",
  openGraph: {
    type: "website",
    siteName: "ZecMiners",
    images: [{ url: "/media/posters/mine-loop.jpg", width: 720, height: 720 }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0e0b08",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelify.variable} ${plex.variable}`}>
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
