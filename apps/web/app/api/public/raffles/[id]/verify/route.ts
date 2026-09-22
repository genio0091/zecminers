import { GameError, raffleVerification } from "@zecminers/db";
import { route } from "@/lib/api";

/** Seed, block hash, ticket ranges and winners — everything needed to recompute the draw. */
export const GET = route({ access: "public" }, async ({ db, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new GameError("NOT_FOUND", "Raffle not found.");
  return raffleVerification(db, id);
});
