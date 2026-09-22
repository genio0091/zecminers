import { route } from "@/lib/api";
import { publicTokenFacts } from "@/lib/public-data";

/** Token and pass collection facts from chain_registry (blueprint §9.1). */
export const GET = route({ access: "public" }, async () => publicTokenFacts());
