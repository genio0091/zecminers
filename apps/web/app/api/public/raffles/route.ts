import { listRaffles } from "@hoodvalley/db";
import { route } from "@/lib/api";

export const GET = route({ access: "public" }, async ({ db }) => listRaffles(db, 30));
