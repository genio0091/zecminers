import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* The three faces from the Hood Valley design files, self-hosted (latin subsets). */
const geologica = localFont({
  src: "./fonts/geologica-latin.woff2",
  weight: "300 800",
  variable: "--font-geologica",
  display: "swap",
});

const jersey = localFont({
  src: "./fonts/jersey10-latin.woff2",
  weight: "400",
  variable: "--font-jersey",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hood Valley — Mine the Frontier",
    template: "%s · Hood Valley",
  },
  description:
    "Hood Valley is an on-chain mining game on Robinhood Chain. 3,333 Valley Miners clock into one 12-hour shift a day and split a daily pool of $VALLEY from the 7,000,000,000 Season 1 mining pool.",
  openGraph: {
    type: "website",
    siteName: "Hood Valley",
    images: [{ url: "/media/posters/valley-map.webp", width: 960, height: 960 }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1a1208",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geologica.variable} ${jersey.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
