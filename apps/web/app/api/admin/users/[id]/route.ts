import { userDetail } from "@zecminers/db";
import { route } from "@/lib/api";

export const GET = route({ access: "admin" }, async ({ db, params }) => userDetail(db, params.id!));
