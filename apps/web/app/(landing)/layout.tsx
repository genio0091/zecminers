import { SiteHeader } from "@/components/site/header";

/** The landing page is one screen tall: header + a deck of sheets (no long scroll). */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader />
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
