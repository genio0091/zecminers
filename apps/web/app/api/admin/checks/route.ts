import { jobInvariants } from "@zecminers/db";
import { route } from "@/lib/api";
import { chain } from "@/lib/chain";

/** Run the reserve checks now and store a snapshot. */
export const POST = route({ access: "admin", mutation: true, allowDuringMaintenance: true }, async () => jobInvariants(chain()));
