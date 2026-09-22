import { listPasses } from "@zecminers/db";
import { route } from "@/lib/api";

export const GET = route({ access: "admin" }, async ({ db }) => listPasses(db, 200));
