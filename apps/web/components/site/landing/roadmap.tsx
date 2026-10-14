import { PENDING, ROADMAP } from "@/lib/content";
import { cx } from "../../ui";
import { Kicker, SectionTitle, Wrap } from "./strata";

/** Pending checklist, shared with the litepaper. */
export function PendingList({ light = false }: { light?: boolean }) {
  return (
    <ul className={cx("m-0 grid list-none gap-2.5 p-0", light && "mt-3")}>
      {PENDING.map((p) => (
        <li
          key={p}
          className={cx(
            "flex flex-wrap items-center justify-between gap-3.5",
            light ? "border-3 border-night bg-cream px-3.5 py-3" : "border-2 border-clay px-4 py-3.5",
          )}
        >
          <span className={cx("flex items-center gap-3", !light && "text-cream")}>
            <span aria-hidden className={cx("box-border block size-[18px] flex-none border-3", light ? "border-night" : "border-dust")} />
            {p}
          </span>
          <span className={cx("font-mono text-[11px] tracking-[1.5px]", light ? "font-bold text-ink-link" : "text-gold")}>PENDING</span>
        </li>
      ))}
    </ul>
  );
}

/** Bedrock: where the build stands. */
export function Roadmap() {
  return (
    <section id="roadmap" aria-labelledby="roadmap-title" className="bg-bedrock pb-24 pt-[88px]">
      <Wrap>
        <Kicker label="08 · Launch status & roadmap" depth="Depth −1,200 m · Bedrock" />
        <div className="mt-[18px] flex flex-wrap items-end justify-between gap-6">
          <SectionTitle id="roadmap-title">WHERE THE BUILD STANDS</SectionTitle>
          <p className="m-0 max-w-[440px] text-[17px] text-dust text-pretty">
            The Hood Valley web platform and dApp are in active development for Robinhood Chain. Here is what is done, what is next, and what is still unannounced.
          </p>
        </div>

        <ol className="mt-11 mb-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-4 p-0">
          {ROADMAP.map((r) => (
            <li
              key={r.title}
              className={cx("grid content-start gap-2.5 border-3 bg-card p-5 shadow-[6px_6px_0_#3A2614]", "now" in r && r.now ? "border-gold" : "border-clay")}
            >
              {"now" in r && r.now ? (
                <span className="inline-flex items-center gap-2 justify-self-start bg-gold px-[9px] py-1 font-mono text-[10.5px] font-bold tracking-[1.5px] text-night">
                  <span aria-hidden className="block size-2 animate-blink-fast bg-night" />
                  {r.tag}
                </span>
              ) : (
                <span
                  className={cx(
                    "justify-self-start border-2 px-2 py-[3px] font-mono text-[10.5px] tracking-[1.5px]",
                    "sky" in r && r.sky ? "border-sky text-sky" : "border-dust text-dust",
                  )}
                >
                  {r.tag}
                </span>
              )}
              <h3 className="m-0 font-pixel text-[30px] font-normal leading-none text-cream">{r.title}</h3>
              <p className="m-0 text-sm text-dust">{r.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-7 border-3 border-black bg-card p-[26px] shadow-[10px_10px_0_#2A1C10]">
          <div>
            <h3 className="m-0 font-pixel text-[38px] font-normal leading-none text-cream">CONFIRMED BEFORE PUBLIC RELEASE</h3>
            <p className="mt-2.5 mb-0 text-dust text-pretty">
              These parameters are published here, and in the litepaper, before the public launch. Until then, treat any contract address that claims to be Hood
              Valley as unofficial.
            </p>
          </div>
          <PendingList />
        </div>
      </Wrap>
    </section>
  );
}
