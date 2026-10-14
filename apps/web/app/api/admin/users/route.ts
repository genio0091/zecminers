import { searchUsers } from "@hoodvalley/db";
import { route } from "@/lib/api";

export const GET = route({ access: "admin" }, async ({ db, req }) => searchUsers(db, req.nextUrl.searchParams.get("q") ?? "", 30));
