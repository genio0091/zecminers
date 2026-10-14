import { StepOneAction } from "../gate/step-one";
import { Wrap } from "./strata";

export interface AllowlistStatus {
  memberNo: number | null;
  handle: string | null;
  wallet: string | null;
}

/** Claim your spot: visitors who came through the gate see their place in line. */
export function Allowlist({ status, xEnabled }: { status: AllowlistStatus | null; xEnabled: boolean }) {
  return (
    <section id="allowlist" aria-labelledby="allow-title" className="bg-bedrock pb-24 pt-10">
      <Wrap>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-10 border-4 border-black bg-gold p-[clamp(24px,4vw,48px)] text-night shadow-[14px_14px_0_#3A2614]">
          <div>
            <div className="font-mono text-xs font-bold tracking-[2px]">09 · ALLOWLIST</div>
            <h2 id="allow-title" className="mt-3.5 mb-0 font-pixel text-[clamp(54px,6.6vw,100px)] font-normal leading-[.88] tracking-[.5px]">
              CLAIM YOUR SPOT IN THE VALLEY
            </h2>
            <p className="mt-5 mb-0 max-w-[520px] text-[17px] text-umber-3 text-pretty">
              Whitelist and public mint dates, and the pricing tiers, are announced before public release. Everyone on the list hears first.
            </p>
            <p className="mt-4 mb-0 max-w-[520px] text-sm font-semibold text-umber-3">Hood Valley will never ask for your seed phrase or private key.</p>
          </div>
          <div className="border-3 border-black bg-night p-6 text-cream">
            {status ? (
              <div role="status">
                <div className="font-pixel text-[44px] leading-none text-moss">YOU&apos;RE ON THE LIST</div>
                {status.memberNo ? (
                  <div className="mt-3 font-pixel text-[64px] leading-none text-gold">#{String(status.memberNo).padStart(4, "0")}</div>
                ) : null}
                <div className="mt-1 font-mono text-[11px] tracking-[2px] text-khaki">YOUR PLACE IN LINE</div>
                <div className="mt-5 grid gap-2 text-sm">
                  {status.handle ? (
                    <div className="flex flex-wrap justify-between gap-3 border-2 border-clay px-3 py-2.5">
                      <span className="text-khaki">X</span>
                      <span className="font-bold">@{status.handle}</span>
                    </div>
                  ) : null}
                  {status.wallet ? (
                    <div className="flex flex-wrap justify-between gap-3 border-2 border-clay px-3 py-2.5">
                      <span className="text-khaki">Wallet</span>
                      <span className="font-mono font-bold">
                        {status.wallet.slice(0, 6)}…{status.wallet.slice(-4)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <p className="mt-4 mb-0 text-[13.5px] text-dust">
                  We&apos;ll reach you when mint details are confirmed. Keep the wallet you entered: it&apos;s the one we&apos;ll check.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 text-center">
                <div className="font-mono text-[11px] tracking-[2px] text-khaki">NOT ON THE LIST YET</div>
                <p className="m-0 text-dust">Connect X, finish the tasks and add your Robinhood Chain wallet to get your place in line.</p>
                <StepOneAction xEnabled={xEnabled} label="JOIN THE WAITLIST" dark />
              </div>
            )}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
