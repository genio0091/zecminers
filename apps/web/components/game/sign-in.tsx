import { signInAdmin, signInDev, signInDiscord, signInWallet } from "@/app/(game)/play/actions";
import { LazyVideo } from "../lazy-video";
import { HqTopBar } from "./hq-header";

const ERRORS: Record<string, string> = {
  missing: "Paste your pass address and your claim code.",
  invalid_address: "That is not a valid pass address. Copy it again exactly as you received it (it starts with t1).",
  no_pass: "No Valley Miner pass is registered to this address. Join the allowlist on the home page.",
  invalid_code: "Address or claim code not recognised.",
  frozen: "This account is frozen. Contact the team.",
  rate_limited: "Too many attempts. Wait 10 minutes and try again.",
  invalid_key: "Admin key not recognised.",
  account_too_new: "Your Discord account is too new to play yet. This keeps bot accounts out — try again later.",
  AccessDenied: "Sign-in was cancelled or denied.",
  credentials: "Sign-in failed. Check your details and try again.",
  CredentialsSignin: "Sign-in failed. Check your details and try again.",
};

const field = "border-3 border-clay bg-bedrock p-3 font-mono text-[15px] tracking-normal text-cream placeholder:text-stone";
const label = "grid gap-1.5 font-mono text-[11px] tracking-[1.5px] text-khaki";
const darkButton = "cursor-pointer border-3 border-black bg-rock px-3 py-2.5 font-mono text-xs tracking-[1px] text-cream shadow-px-3 hover:bg-clay";

/** "Connect to clock in": players sign in with their pass address and claim code. */
export function SignIn({ discord, dev, admin, error, team }: { discord: boolean; dev: boolean; admin: boolean; error?: string; team?: boolean }) {
  return (
    <div className="min-h-screen bg-bedrock text-[15px] leading-[1.55] text-cream">
      <HqTopBar
        chip="SIGN IN"
        right={
          <a
            href="#connect"
            className="border-3 border-black bg-gold px-4 py-[9px] font-pixel text-2xl leading-none text-night shadow-px-4 hover:bg-gold-hi hover:text-night"
          >
            CONNECT WALLET
          </a>
        }
      />
      <main className="mx-auto max-w-[1320px] px-5 pb-[72px] pt-6">
        <section
          aria-labelledby="connect-h"
          className="mx-auto mt-10 grid max-w-[760px] grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] border-3 border-black bg-card shadow-px-10"
        >
          <div className="relative min-h-[300px] overflow-hidden bg-gold min-[600px]:border-r-3 min-[600px]:border-black">
            <LazyVideo clip="zandy" eager label="Zandy, the base character" className="absolute inset-0 h-full scale-[1.9]" />
          </div>
          <div id="connect" className="grid content-center gap-3.5 p-7">
            <h1 id="connect-h" className="m-0 font-pixel text-[46px] font-normal leading-[.95]">
              CONNECT TO CLOCK IN
            </h1>
            <p className="m-0 text-dust">
              Valley HQ reads the Valley Miners linked to your pass. Each Miner is a worker license for the daily 12-hour shift.
            </p>
            {error ? <p className="m-0 border-2 border-ember px-3 py-2 text-[13.5px] text-ember">{ERRORS[error] ?? ERRORS.credentials}</p> : null}
            <form action={signInWallet} className="grid gap-3">
              <label className={label}>
                PASS ADDRESS
                <input name="address" required placeholder="t1…" spellCheck={false} autoComplete="username" className={field} />
              </label>
              <label className={label}>
                CLAIM CODE
                <input name="code" required type="password" placeholder="ZM-XXXX-XXXX" autoComplete="current-password" className={field} />
              </label>
              <button
                type="submit"
                className="cursor-pointer justify-self-start border-3 border-black bg-gold px-5 py-3 font-pixel text-[28px] leading-none text-night shadow-[5px_5px_0_#000] hover:bg-gold-hi"
              >
                CONNECT WALLET
              </button>
            </form>
            <p className="m-0 text-[12.5px] text-khaki">
              Your claim code works as your password: keep it private. Payouts only ever go to your pass address, and Hood Valley will never ask for your seed phrase
              or private key.
            </p>

            {discord ? (
              <form action={signInDiscord} className="border-t-2 border-rock pt-3.5">
                <button type="submit" className={darkButton}>
                  SIGN IN WITH DISCORD
                </button>
              </form>
            ) : null}

            {admin ? (
              <details className="border-t-2 border-rock pt-3.5" open={team}>
                <summary className="cursor-pointer font-mono text-[11px] tracking-[1.5px] text-khaki">TEAM LOGIN</summary>
                <form action={signInAdmin} className="mt-3 grid gap-2">
                  <label className={label}>
                    ADMIN KEY
                    <input name="key" type="password" required autoComplete="off" className={field} />
                  </label>
                  <button type="submit" className={`${darkButton} justify-self-start`}>
                    OPEN ADMIN PANEL
                  </button>
                </form>
              </details>
            ) : null}

            {dev ? (
              <form action={signInDev} className="grid gap-2 border-t-2 border-rock pt-3.5">
                <label className={label}>
                  LOCAL DEV LOGIN (NEVER ENABLED IN PRODUCTION)
                  <input name="username" defaultValue="miner" className={field} />
                </label>
                <button type="submit" className={`${darkButton} justify-self-start`}>
                  DEV SIGN-IN
                </button>
                <p className="m-0 text-xs text-stone">Use the name &quot;admin&quot; to get the admin panel locally.</p>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
