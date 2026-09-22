import Link from "next/link";
import { signInDev, signInDiscord } from "@/app/(game)/play/actions";
import { Logo } from "../site/header";
import { Button, FinePrint, Panel } from "../ui";

const ERRORS: Record<string, string> = {
  account_too_new: "Your Discord account is too new to play yet. This keeps bot accounts out — try again later.",
  AccessDenied: "Sign-in was cancelled or denied.",
  CredentialsSignin: "Dev login failed. Use 2–24 letters, digits, - or _.",
};

export function SignIn({ discord, dev, error }: { discord: boolean; dev: boolean; error?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(100%_70%_at_50%_0%,#1C150D_0%,#0E0B08_65%)] px-4 py-16">
      <Panel depth={8} className="grid w-full max-w-[460px] gap-5 p-7">
        <Link href="/" className="hover:text-cream">
          <Logo />
        </Link>
        <div>
          <h1 className="m-0 font-pixel text-[34px] leading-tight">Enter the mine</h1>
          <p className="mb-0 mt-2 text-[13.5px] text-dust">
            Sign in with Discord — one Discord account is one player. Then link the address your Whitelist Pass was airdropped to.
          </p>
        </div>
        {error ? <p className="m-0 border-3 border-black bg-ink p-3 text-[13px] text-ember">{ERRORS[error] ?? "Sign-in failed. Try again."}</p> : null}
        {discord ? (
          <form action={signInDiscord}>
            <Button type="submit" size="lg" className="w-full">
              Sign in with Discord
            </Button>
          </form>
        ) : (
          <p className="m-0 text-[13px] text-stone">Discord sign-in is not configured on this deployment (set AUTH_DISCORD_ID and AUTH_DISCORD_SECRET).</p>
        )}
        {dev ? (
          <form action={signInDev} className="grid gap-2 border-t-3 border-ink pt-4">
            <label className="grid gap-1.5 text-[11px] uppercase tracking-[1.5px] text-khaki">
              Local dev login (never enabled in production)
              <input name="username" defaultValue="miner" className="border-3 border-black bg-ink px-3 py-2.5 text-sm normal-case tracking-normal text-cream" />
            </label>
            <Button type="submit" variant="dark">
              Dev sign-in
            </Button>
            <FinePrint>Use the name &quot;admin&quot; to get the admin panel locally.</FinePrint>
          </form>
        ) : null}
        <FinePrint>Use a ZRC-20 wallet such as Zatoshi Wallet for your pass and payouts. We never ask for your seed phrase.</FinePrint>
      </Panel>
    </div>
  );
}
