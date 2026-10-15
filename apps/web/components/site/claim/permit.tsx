import { LazyVideo } from "../../lazy-video";
import { cx } from "../../ui";
import { monoLabel } from "./bits";

export interface PermitStamp {
  short: string;
  verified: boolean;
  done: boolean;
}

export interface PermitData {
  no: string;
  handle: string | null;
  discord: { text: string; tone: "ink" | "faded" | "warn" } | null;
  wallet: string | null;
  walletHint: string;
  status: string;
  statusOk: boolean;
  stamps: PermitStamp[];
  filed: boolean;
}

const ROTATIONS = ["-7deg", "5deg", "-4deg", "8deg", "-6deg", "3deg", "-5deg"];

function Line({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3 py-[7px]", !last && "border-b-2 border-dashed border-paper-line")}>
      <dt className={monoLabel}>{label}</dt>
      <dd className="m-0 min-w-0 text-right font-bold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** The claim permit: fills in as the visitor collects stamps, and gets a number and a FILED stamp at the end. */
export function Permit({ permit }: { permit: PermitData }) {
  const count = permit.stamps.filter((s) => s.done).length;
  return (
    <aside aria-label="Your claim permit" className="sticky top-6 mx-auto w-full min-w-0 max-w-[440px] flex-[1_1_360px] max-[900px]:static [@media(max-height:760px)]:static">
      <div className="relative rotate-[-1.5deg] border-4 border-night bg-permit shadow-[12px_12px_0_#1A1208] max-[720px]:rotate-0 max-[720px]:shadow-[8px_8px_0_#1A1208]">
        <div className="flex items-center justify-between gap-2.5 bg-night px-3.5 py-2.5 font-mono text-[11px] tracking-[1.5px] text-gold">
          <span>HOOD VALLEY · CLAIM PERMIT</span>
          <span className="whitespace-nowrap text-cream">No. {permit.no}</span>
        </div>
        <div className="relative aspect-[16/8] overflow-hidden border-b-4 border-night bg-valley-lit">
          <LazyVideo clip="valley-map" eager label="" className="absolute inset-0 h-full" />
          <span className="absolute left-2.5 top-2.5 border-2 border-black bg-night px-2 py-1 font-mono text-[10px] tracking-[1.5px] text-cream">
            CLAIM SITE · HOOD VALLEY
          </span>
        </div>
        <dl className="m-0 grid px-4 pb-1 pt-3.5 text-sm">
          <Line label="PROSPECTOR">{permit.handle ? permit.handle : <span className="text-faded">Not connected</span>}</Line>
          {permit.discord ? (
            <Line label="DISCORD">
              <span className={cx(permit.discord.tone === "faded" && "text-faded", permit.discord.tone === "warn" && "text-seal")}>{permit.discord.text}</span>
            </Line>
          ) : null}
          <Line label="WALLET">
            {permit.wallet ? <span className="font-mono text-[13px]">{permit.wallet}</span> : <span className="text-faded">{permit.walletHint}</span>}
          </Line>
          <Line label="NETWORK">Robinhood Chain</Line>
          <Line label="STATUS" last>
            <span className={cx("font-extrabold", permit.statusOk && "text-ok")}>{permit.status}</span>
          </Line>
        </dl>
        <div className="px-4 pb-4 pt-1.5">
          <div className={cx(monoLabel, "mb-2 flex justify-between gap-2.5")}>
            <span>STAMPS</span>
            <span>
              {count} / {permit.stamps.length}
            </span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${permit.stamps.length}, minmax(0, 1fr))` }}>
            {permit.stamps.map((s, i) => {
              const rot = ROTATIONS[i % ROTATIONS.length];
              return (
                <div key={s.short + i} className="relative grid aspect-square min-w-0 place-items-center border-2 border-dashed border-rule">
                  {s.done ? (
                    <div
                      className={cx(
                        "grid h-[90%] w-[90%] animate-pop place-items-center content-center gap-0.5 border-[3px] border-double bg-permit/60",
                        s.verified ? "border-ok text-ok" : "border-ink-link text-ink-link",
                      )}
                      style={{ "--r": rot, transform: `rotate(${rot})` } as React.CSSProperties}
                    >
                      <span className="font-pixel text-xs leading-none tracking-[.2px]">{s.short}</span>
                      <span className="font-mono text-[6px] font-bold leading-none tracking-[.3px]">{s.verified ? "VERIFIED" : "MARKED"}</span>
                    </div>
                  ) : (
                    <span className="font-pixel text-[22px] text-rule">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div aria-hidden className="flex items-center justify-between gap-3 border-t-[3px] border-dashed border-night bg-office px-4 py-3">
          <span className="whitespace-nowrap font-mono text-[10px] tracking-[1.5px] text-ink-soft">KEEP THIS STUB · SEASON 1</span>
          <span className="block h-[22px] min-w-12 flex-[0_1_120px] bg-[repeating-linear-gradient(90deg,#1A1208_0_2px,transparent_2px_4px,#1A1208_4px_7px,transparent_7px_9px,#1A1208_9px_10px,transparent_10px_13px)]" />
        </div>
        {permit.filed ? (
          <div
            aria-hidden
            className="absolute right-[18px] top-24 animate-stamp border-[5px] border-double border-seal bg-permit/75 px-3.5 py-1.5 font-pixel text-[44px] leading-none tracking-[2px] text-seal"
          >
            FILED
          </div>
        ) : null}
      </div>
      <p className="mx-1 mb-0 mt-6 text-center text-[12.5px] leading-[1.55] text-ink-soft">
        Your permit fills in as you go. Hood Valley will never ask for your seed phrase or private key.
      </p>
    </aside>
  );
}
