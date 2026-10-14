import { Allowlist } from "@/components/site/landing/allowlist";
import { Benefits } from "@/components/site/landing/benefits";
import { DailyShift } from "@/components/site/landing/daily-shift";
import { Faq } from "@/components/site/landing/faq";
import { Hero } from "@/components/site/landing/hero";
import { Collection, Lore } from "@/components/site/landing/lore";
import { Roadmap } from "@/components/site/landing/roadmap";
import { SeasonOne } from "@/components/site/landing/season";
import { SeasonTwo } from "@/components/site/landing/season-two";
import { Tokenomics } from "@/components/site/landing/tokenomics";

/** The valley from the surface down to bedrock: one long scroll, one stratum per section. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Lore />
      <Collection />
      <DailyShift />
      <SeasonOne />
      <Benefits />
      <Tokenomics />
      <SeasonTwo />
      <Roadmap />
      <Allowlist />
      <Faq />
    </>
  );
}
