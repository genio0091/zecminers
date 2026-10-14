import { SEASON_TWO } from "@/lib/content";
import { Kicker, PixelEdge, SectionTitle } from "./strata";

/** Deep seam: Season 2, after the Season 1 mine-out. */
export function SeasonTwo() {
  return (
    <>
      <section id="season2" aria-labelledby="s2-title" className="relative overflow-hidden bg-seam pb-[104px] pt-[88px]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-12 px-6">
          <div>
            <Kicker label="07 · Looking ahead" depth="Depth −900 m · Unexplored seam" color="#6FD6F2" />
            <SectionTitle id="s2-title" className="mt-[18px]">
              SEASON 2:
              <br />
              THE FRONTIER EXPANDS
            </SectionTitle>
            <p className="mt-6 mb-0 max-w-[600px] text-[17px] text-dust text-pretty">
              When the final Season 1 block is mined and all 7 billion $VALLEY are in circulation, the valley opens its next seam.
            </p>
            <div className="mt-[22px] inline-flex items-center gap-2.5 border-2 border-sky px-3 py-2 font-mono text-xs tracking-[1.5px] text-sky">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6FD6F2" strokeWidth="2.5" aria-hidden>
                <rect x="5" y="11" width="14" height="10" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              OPENS AFTER SEASON 1 IS MINED OUT
            </div>
          </div>
          <div aria-hidden className="relative w-[min(340px,80vw)] justify-self-center">
            <svg viewBox="0 0 17 13" shapeRendering="crispEdges" className="block h-auto w-full animate-glow">
              <rect x="8" y="0" width="1" height="1" fill="#B9F1FF" />
              <rect x="7" y="1" width="3" height="1" fill="#6FD6F2" />
              <rect x="6" y="2" width="5" height="7" fill="#2F9BC4" />
              <rect x="7" y="2" width="2" height="7" fill="#6FD6F2" />
              <rect x="7" y="2" width="1" height="3" fill="#B9F1FF" />
              <rect x="2" y="3" width="2" height="1" fill="#6FD6F2" />
              <rect x="1" y="4" width="4" height="5" fill="#2F9BC4" />
              <rect x="2" y="4" width="1" height="5" fill="#6FD6F2" />
              <rect x="13" y="2" width="2" height="1" fill="#6FD6F2" />
              <rect x="12" y="3" width="4" height="6" fill="#2F9BC4" />
              <rect x="13" y="3" width="1" height="6" fill="#6FD6F2" />
              <rect x="4" y="1" width="1" height="1" fill="#B9F1FF" />
              <rect x="15" y="0" width="1" height="1" fill="#B9F1FF" />
              <rect x="0" y="9" width="17" height="1" fill="#3A2614" />
              <rect x="0" y="10" width="17" height="1" fill="#2A1C10" />
              <rect x="1" y="11" width="15" height="1" fill="#20150B" />
              <rect x="3" y="12" width="11" height="1" fill="#1A1208" />
            </svg>
          </div>
        </div>
        <div className="mx-auto mt-12 grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5 px-6">
          {SEASON_TWO.map((c) => (
            <article key={c.kicker} className="border-3 border-teal bg-teal-deep p-6">
              <div className="font-mono text-[11px] tracking-[2px] text-sky">{c.kicker}</div>
              <h3 className="mt-1.5 mb-0 font-pixel text-[34px] font-normal leading-none text-cream">{c.title}</h3>
              {"points" in c && c.points ? (
                <ul className="mt-3 mb-0 grid list-none gap-2 p-0 text-cream">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5">
                      <span aria-hidden className="block size-2 flex-none bg-sky" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 mb-0 text-dust text-pretty">{c.body}</p>
              )}
            </article>
          ))}
        </div>
      </section>
      <PixelEdge from="#150F08" to="#0F0B07" />
    </>
  );
}
