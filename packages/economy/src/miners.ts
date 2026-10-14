import { BP } from "./constants";

/**
 * Valley Miner traits (litepaper §03). Until the collection is minted, every pass gets a
 * deterministic pre-mint Miner derived from its number, so the same pass always shows the
 * same Miner on every device. Final traits and their mining effects are confirmed before mint.
 */
export type MinerKind = "surface" | "cave" | "valley";

export interface MinerTraits {
  kind: MinerKind;
  /** Short role name shown next to the Miner number. */
  role: string;
  helmet: string;
  tool: string;
  gem: string;
  background: string;
  /** Trait power in basis points: 10_000 = 1.00×. */
  powerBp: number;
}

const KINDS: { kind: MinerKind; role: string; background: string }[] = [
  { kind: "surface", role: "Surface scout", background: "Surface camp" },
  { kind: "cave", role: "Deep digger", background: "Deep cave" },
  { kind: "valley", role: "Valley walker", background: "Valley floor" },
];
const HELMETS = ["Wide-brim hat", "Hard hat", "Red helmet", "Green helmet"];
/** Tool material sets the power: 1.00× for iron up to 1.25× for amethyst. */
const MATERIALS = ["Iron", "Steel", "Gold", "Emerald", "Sapphire", "Amethyst"];
const TOOLS = ["pickaxe", "hammer", "shovel"];
const GEMS = ["Red gem", "Green gem", "Blue gem", "Violet gem", "Pink gem", "Cyan gem"];

/** xorshift32 over the pass number: tiny, deterministic, identical on server and client. */
function rng(seed: number) {
  let x = (seed ^ 0x9e3779b9) >>> 0 || 1;
  return (n: number) => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x % n;
  };
}

export function minerTraits(passNumber: number): MinerTraits {
  const next = rng(Math.trunc(passNumber) * 2_654_435_761);
  const k = KINDS[next(KINDS.length)]!;
  const tier = next(MATERIALS.length);
  return {
    kind: k.kind,
    role: k.role,
    background: k.background,
    helmet: HELMETS[next(HELMETS.length)]!,
    tool: `${MATERIALS[tier]} ${TOOLS[next(TOOLS.length)]}`,
    gem: GEMS[next(GEMS.length)]!,
    powerBp: BP + tier * 500,
  };
}

/** "#0412" — Miner numbers are padded to four digits like the collection. */
export function minerLabel(passNumber: number): string {
  return `#${String(passNumber).padStart(4, "0")}`;
}

export function formatPower(powerBp: number): string {
  return `${(powerBp / BP).toFixed(2)}×`;
}
