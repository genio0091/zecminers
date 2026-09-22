import Link from "next/link";
import { signInAdmin, signInDev, signInDiscord, signInWallet } from "@/app/(game)/play/actions";
import { Logo } from "../site/header";
import { Button, FinePrint, Panel } from "../ui";

const ERRORS: Record<string, string> = {
  missing: "Paste your t1 address and your claim code.",
  invalid_address: "That is not a valid transparent t1 address. Copy it again from your ZRC-20 wallet.",
  no_pass: "No Whitelist Pass was airdropped to this address yet. Join the waitlist on the home page.",
  invalid_code: "Address or claim code not recognised.",
  frozen: "This account is frozen. Contact the team.",
  rate_limited: "Too many attempts. Wait 10 minutes and try again.",
  invalid_key: "Admin key not recognised.",
  account_too_new: "Your Discord account is too new to play yet. This keeps bot accounts out — try again later.",
  AccessDenied: "Sign-in was cancelled or denied.",
  credentials: "Sign-in failed. Check your details and try again.",
  CredentialsSignin: "Sign-in failed. Check your details and try again.",
};

const field = "border-3 border-black bg-ink px-3 py-2.5 text-sm normal-case tracking-normal text-cream";
const label = "grid gap-1.5 text-[11px] uppercase tracking-[1.5px] text-khaki";

export function SignIn({ discord, dev, admin, error, team }: { discord: boolean; dev: boolean; admin: boolean; error?: string; team?: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(100%_70%_at_50%_0%,#1C150D_0%,#0E0B08_65%)] px-4 py-16">
      <Panel depth={8} className="grid w-full max-w-[480px] gap-5 p-7">
        <Link href="/" className="hover:text-cream">
          <Logo />
        </Link>
        <div>
          <h1 className="m-0 font-pixel text-[34px] leading-tight">Enter the mine</h1>
          <p className="mb-0 mt-2 text-[13.5px] text-dust">
            Paste the t1 address your Whitelist Pass was airdropped to, and the claim code from your airdrop message. The first sign-in opens your mining slot.
          </p>
        </div>

        {error ? <p className="m-0 border-3 border-black bg-ink p-3 text-[13px] text-ember">{ERRORS[error] ?? ERRORS.credentials}</p> : null}

        <form action={signInWallet} className="grid gap-3">
          <label className={label}>
            Transparent address (t1…)
            <input name="address" required placeholder="t1…" spellCheck={false} autoComplete="username" className={field} />
          </label>
          <label className={label}>
            Claim code
            <input name="code" required type="password" placeholder="ZM-XXXX-XXXX" autoComplete="current-password" className={field} />
          </label>
          <Button type="submit" size="lg" className="w-full">
            Sign in with wallet
          </Button>
          <FinePrint>
            Your claim code works as your password — keep it private. Payouts always go to your pass address, and we never ask for your seed phrase.
          </FinePrint>
        </form>

        {discord ? (
          <form action={signInDiscord} className="border-t-3 border-ink pt-4">
            <Button type="submit" variant="dark" className="w-full">
              Sign in with Discord
            </Button>
          </form>
        ) : null}

        {admin ? (
          <details className="border-t-3 border-ink pt-4" open={team}>
            <summary className="cursor-pointer text-[11px] uppercase tracking-[1.5px] text-khaki">Team login</summary>
            <form action={signInAdmin} className="mt-3 grid gap-2">
              <label className={label}>
                Admin key
                <input name="key" type="password" required autoComplete="off" className={field} />
              </label>
              <Button type="submit" variant="dark">
                Open admin panel
              </Button>
            </form>
          </details>
        ) : null}

        {dev ? (
          <form action={signInDev} className="grid gap-2 border-t-3 border-ink pt-4">
            <label className={label}>
              Local dev login (never enabled in production)
              <input name="username" defaultValue="miner" className={field} />
            </label>
            <Button type="submit" variant="dark">
              Dev sign-in
            </Button>
            <FinePrint>Use the name &quot;admin&quot; to get the admin panel locally.</FinePrint>
          </form>
        ) : null}

        <FinePrint>Use a ZRC-20 wallet such as Zatoshi Wallet for your pass and payouts.</FinePrint>
      </Panel>
    </div>
  );
}
