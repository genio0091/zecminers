import { BENEFITS } from "@/lib/content";
import { Kicker, PixelEdge, SectionTitle, Wrap } from "./strata";

const ICONS: Record<(typeof BENEFITS)[number]["icon"], React.ReactNode> = {
  pick: (
    <>
      <path d="M3 9c5-5 13-5 18 0" />
      <path d="M12 5v16" />
      <path d="M9 21h6" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 7h18v3.5a2 2 0 0 0 0 3V17H3v-3.5a2 2 0 0 0 0-3z" />
      <path d="M15 7v10" />
    </>
  ),
  chevrons: (
    <>
      <path d="M5 13l7-7 7 7" />
      <path d="M5 19l7-7 7 7" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
      <path d="M9 15a3 3 0 0 0 3 3" />
    </>
  ),
};

/** Hard rock: what a Valley Miner unlocks. */
export function Benefits() {
  return (
    <>
      <section id="benefits" aria-labelledby="benefits-title" className="bg-hardrock pb-[104px] pt-[88px]">
        <Wrap>
          <Kicker label="05 · Holder benefits" depth="Depth −420 m · Hard rock" />
          <SectionTitle id="benefits-title" className="mt-[18px]">
            WHAT A VALLEY MINER UNLOCKS
          </SectionTitle>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] gap-5">
            {BENEFITS.map((b, i) => {
              const parts = "strong" in b ? b.body.split(b.strong) : [b.body];
              return (
                <article key={b.title} className="flex flex-wrap items-start gap-[18px] border-3 border-black bg-night p-[26px] shadow-[8px_8px_0_#120C06]">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#F2B949" strokeWidth="2" strokeLinecap="square" aria-hidden className="flex-none">
                    {ICONS[b.icon]}
                  </svg>
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className="font-mono text-[11px] tracking-[2px] text-khaki">BENEFIT 0{i + 1}</div>
                    <h3 className="mt-1 mb-0 font-pixel text-4xl font-normal leading-none text-cream">{b.title}</h3>
                    <p className="mt-2.5 mb-0 text-dust text-pretty">
                      {parts[0]}
                      {"strong" in b ? (
                        <>
                          <strong className="text-cream">{b.strong}</strong>
                          {parts[1]}
                        </>
                      ) : null}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </Wrap>
      </section>
      <PixelEdge from="#221709" to="#1E150B" />
    </>
  );
}
