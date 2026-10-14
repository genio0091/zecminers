import { COLLECTION_POINTS } from "@/lib/content";
import type { Clip } from "@/lib/media";
import { LazyVideo } from "../../lazy-video";
import { Kicker, PixelEdge, SectionTitle, Wrap } from "./strata";

/** Valley floor: the lore and Zandy. */
export function Lore() {
  return (
    <>
      <section id="lore" aria-labelledby="lore-title" className="bg-valley pb-[104px] pt-[88px]">
        <Wrap className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-14">
          <div>
            <Kicker label="01 · The lore" depth="Depth −10 m · Valley floor" color="#FFD77A" />
            <SectionTitle id="lore-title" className="mt-[18px]">
              STAKE A CLAIM.
              <br />
              DIG DEEP.
            </SectionTitle>
            <p className="mt-[26px] mb-0 max-w-[640px] text-[clamp(19px,1.6vw,23px)] leading-[1.55] text-cream text-pretty">
              Beneath the rugged expanses of Hood Valley lies an untapped grid of high-value resource deposits. Guided by explorer{" "}
              <strong className="text-gold-hi">Zandy</strong>, a crew of 3,333 Miners sets out to stake claims, dig deep, and extract wealth from the frontier.
            </p>
            <p className="mt-5 mb-0 max-w-[600px] text-base leading-[1.65] text-sand text-pretty">
              Hood Valley is an on-chain mining simulation and strategy game on Robinhood Chain. Players deploy their Miners into daily resource expeditions, extract
              $VALLEY directly from the ecosystem&apos;s gameplay pool, and unlock holder-exclusive economic perks across dynamic gaming seasons.
            </p>
          </div>
          <figure className="m-0 w-full max-w-[440px] animate-bob justify-self-center">
            <div className="aspect-square overflow-hidden border-6 border-night bg-gold shadow-[14px_14px_0_#163A29]">
              <LazyVideo clip="zandy" label="Zandy, the base character, in pixel art" className="h-full scale-[1.9]" />
            </div>
            <figcaption className="-mt-1.5 flex flex-wrap items-center justify-between gap-3 border-6 border-t-0 border-night bg-night px-4 py-3 shadow-[14px_14px_0_#163A29]">
              <span className="font-pixel text-[32px] leading-none text-gold">ZANDY</span>
              <span className="font-mono text-[11.5px] tracking-[1.5px] text-sand">EXPLORER · LEADS THE CREW OF 3,333</span>
            </figcaption>
          </figure>
        </Wrap>
      </section>
      <PixelEdge from="#235A40" to="#4E3219" />
    </>
  );
}

function LicenseCard({ clip, bg, label, transform, barcode }: { clip: Clip; bg: string; label: string; transform: string; barcode: string }) {
  return (
    <article
      aria-label={`Sample worker license, ${label}`}
      className="w-[min(290px,72vw)] border-4 border-night bg-cream text-night shadow-[12px_12px_0_#1A1208] [grid-area:1/1]"
      style={{ transform }}
    >
      <div className="flex justify-between gap-2 bg-night px-3 py-2 font-mono text-[10.5px] tracking-[1.5px] text-gold">
        <span>HOOD VALLEY</span>
        <span>WORKER LICENSE</span>
      </div>
      <div className="aspect-square overflow-hidden border-b-4 border-night" style={{ background: bg }}>
        <LazyVideo clip={clip} label={label === "surface miner" ? "Miner with wide-brim hat and pack at the surface camp" : "Miner in a red helmet swinging a pickaxe in a deep cave"} className="h-full" />
      </div>
      <div className="grid gap-[5px] px-3.5 py-3 font-mono text-[11.5px]">
        {[
          ["MINER", "No. ____ of 3,333"],
          ["NETWORK", "ROBINHOOD CHAIN"],
          ["SHIFT RIGHTS", "DAILY · 12 H"],
          ["SEASON", "1 · GENESIS"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2.5">
            <span className="text-umber">{k}</span>
            <span className="font-bold">{v}</span>
          </div>
        ))}
      </div>
      <div aria-hidden className="mx-3.5 mb-3.5 h-5" style={{ background: barcode }} />
    </article>
  );
}

/** Topsoil: the 3,333 worker licenses and the trait sheet. */
export function Collection() {
  return (
    <>
      <section id="miners" aria-labelledby="miners-title" className="bg-topsoil pb-[104px] pt-[88px]">
        <Wrap>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-14">
            <div>
              <Kicker label="02 · The collection" depth="Depth −60 m · Topsoil" />
              <SectionTitle id="miners-title" className="mt-[18px]">
                3,333 MINERS.
                <br />
                3,333 WORKER LICENSES.
              </SectionTitle>
              <p className="mt-[26px] mb-0 max-w-[600px] text-lg leading-[1.6] text-cream text-pretty">
                The Hood Valley collection is 3,333 unique digital Miners operating on Robinhood Chain. Beyond the art and collectible traits, each NFT is an active
                worker license. You need one to take part in the daily game loop, extract seasonal rewards and access project benefits.
              </p>
              <ul className="mt-7 mb-0 grid max-w-[600px] list-none gap-3 p-0">
                {COLLECTION_POINTS.map((pt) => (
                  <li key={pt.n} className="flex items-start gap-3.5 border-3 border-night bg-topsoil-2 px-4 py-3.5">
                    <span aria-hidden className="font-pixel text-[26px] leading-none text-gold">
                      {pt.n}
                    </span>
                    <span>
                      <strong className="text-cream">{pt.title}</strong> <span className="text-dust">{pt.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid place-items-center pb-14 pt-6">
              <LicenseCard
                clip="miner-sun"
                bg="#F5C01C"
                label="surface miner"
                transform="rotate(-6deg) translate(clamp(-84px,-6vw,-14px),-6px)"
                barcode="repeating-linear-gradient(90deg,#1A1208 0 3px,transparent 3px 5px,#1A1208 5px 6px,transparent 6px 9px,#1A1208 9px 13px,transparent 13px 15px)"
              />
              <LicenseCard
                clip="miner-cave"
                bg="#2D2409"
                label="deep cave miner"
                transform="rotate(5deg) translate(clamp(14px,6.4vw,92px),clamp(18px,3.4vw,46px))"
                barcode="repeating-linear-gradient(90deg,#1A1208 0 2px,transparent 2px 5px,#1A1208 5px 8px,transparent 8px 10px,#1A1208 10px 11px,transparent 11px 15px)"
              />
            </div>
          </div>

          <figure className="mx-0 mb-0 mt-16 border-5 border-night bg-[#DDA02A] shadow-[12px_12px_0_#1A1208]">
            <LazyVideo clip="traits" label="Trait sheet showing helmets, tools, gems, ores, characters and backgrounds" className="aspect-video" />
            <figcaption className="flex flex-wrap justify-between gap-3 bg-night px-4 py-3 font-mono text-xs tracking-[1px] text-sand">
              <span className="text-gold">TRAIT SHEET · IN DEVELOPMENT</span>
              <span>Helmets · Tools · Gems · Ores · Characters · Backgrounds. Final traits and their mining effects are confirmed before mint.</span>
            </figcaption>
          </figure>
        </Wrap>
      </section>
      <PixelEdge from="#4E3219" to="#3A2614" />
    </>
  );
}
