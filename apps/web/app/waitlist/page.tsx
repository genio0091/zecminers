import { getDb } from "@hoodvalley/db";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GateFrame } from "@/components/site/gate/frame";
import { GateTasks } from "@/components/site/gate/tasks";
import { gateTasks, loadGateConfig, siteAccess } from "@/lib/waitlist";

export const metadata: Metadata = { title: "Waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Step 2+: the task list. Done (or never started) visitors are sent back to the home page. */
export default async function WaitlistPage() {
  const db = getDb();
  const { entry } = await siteAccess(db);
  if (!entry || entry.unlockedAt) redirect("/");
  const tasks = gateTasks(entry, await loadGateConfig(db));
  const done = tasks.filter((t) => t.done).length;
  return (
    <GateFrame wide>
      <h1 className="mb-2.5 mt-2 text-center font-pixel text-[clamp(46px,7.4vw,76px)] font-normal leading-[.9] [text-shadow:0_6px_0_rgba(26,18,8,.16)]">
        ALMOST IN THE VALLEY.
      </h1>
      <p className="mb-6 mt-0 max-w-[540px] text-center text-[15px] font-medium leading-[1.55] text-umber-3 sm:text-[17px]">
        Complete the tasks below to join the waitlist and unlock the full site.
      </p>
      <GateTasks tasks={tasks} consent={!!entry.consentAt} done={done} total={tasks.length} />
    </GateFrame>
  );
}
