import { GateBanner } from "./banner";
import { GateFrame } from "./frame";
import { StepOneAction } from "./step-one";

const X_ERRORS: Record<string, string> = {
  cancelled: "X sign-in was cancelled. Connect again whenever you're ready.",
  expired: "That X sign-in took too long or came from another tab. Try once more.",
  error: "We couldn't reach X just now. Please try again in a moment.",
  unavailable: "X sign-in isn't switched on yet. Enter your handle below instead.",
};

/** What a visitor sees before the waitlist: one screen, one job — connect X. */
export function WaitlistGate({ xEnabled, steps, error }: { xEnabled: boolean; steps: number; error?: string }) {
  const message = error ? X_ERRORS[error] : undefined;
  return (
    <GateFrame>
      <div className="w-full animate-rise overflow-hidden border-6 border-night shadow-[10px_10px_0_#1A1208]">
        <GateBanner className="h-[150px] sm:h-[240px]" />
      </div>

      <h1 className="mb-2.5 mt-6 text-center font-pixel text-[clamp(46px,7.4vw,76px)] font-normal leading-[.9] [text-shadow:0_6px_0_rgba(26,18,8,.16)] sm:mt-8">
        THE VALLEY IS WAKING UP.
      </h1>
      <p className="mb-5 mt-0 max-w-[540px] text-center text-[15px] font-medium leading-[1.55] text-umber-3 sm:mb-7 sm:text-[17px]">
        Hood Valley is an on-chain mining game on Robinhood Chain. Connect your X account to join the waitlist and unlock the full site.
      </p>

      <section className="w-full border-3 border-night bg-cream p-5 text-center shadow-[8px_8px_0_#1A1208] sm:p-7">
        <h2 className="m-0 font-pixel text-[26px] font-normal leading-none tracking-[.5px] sm:text-[30px]">
          STEP 1 OF {steps} — VERIFY YOU&apos;RE A REAL MINER
        </h2>
        <p className="mx-auto mb-5 mt-2.5 max-w-[460px] text-[13.5px] leading-[1.5] text-umber">
          {xEnabled
            ? "We use your public X profile to confirm who you are and put your handle on the list. Hood Valley never posts on your behalf and never asks for write access."
            : "Tell us your X handle to start. We'll put it on the list next to the wallet you add. Hood Valley never posts on your behalf."}
        </p>
        {message ? <p className="mx-auto mb-4 mt-0 max-w-[460px] border-2 border-night bg-gold-pale px-3 py-2 text-[13px] font-semibold">{message}</p> : null}
        <StepOneAction xEnabled={xEnabled} />
      </section>
    </GateFrame>
  );
}
