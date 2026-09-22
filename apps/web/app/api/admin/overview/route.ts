import { adminOverview, currentTipHeight } from "@zecminers/db";
import { route } from "@/lib/api";
import { chain } from "@/lib/chain";
import { serverEnv } from "@/lib/env";

export const GET = route({ access: "admin" }, async ({ db, now }) => ({
  ...(await adminOverview(db, now)),
  chain: { mode: serverEnv.chainMode, network: serverEnv.network, tipHeight: await currentTipHeight(chain()).catch(() => null) },
}));
