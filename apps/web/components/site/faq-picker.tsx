"use client";

import { useState } from "react";
import { cx } from "../ui";

/** FAQ as options: pick a question, read the answer — no long accordion to scroll. */
export function FaqPicker({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  const item = items[open] ?? items[0]!;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-5">
      {/* phones: one native picker instead of a wall of buttons */}
      <label className="grid gap-1.5 text-[11px] uppercase tracking-[1.5px] text-khaki sm:hidden">
        Pick a question ({items.length})
        <select
          value={open}
          onChange={(e) => setOpen(Number(e.target.value))}
          className="border-3 border-black bg-coal px-3 py-2.5 text-[13px] normal-case tracking-normal text-cream shadow-px-3"
        >
          {items.map((f, i) => (
            <option key={f.q} value={i}>
              {i + 1}. {f.q}
            </option>
          ))}
        </select>
      </label>
      <div className="hidden flex-wrap content-start gap-2 sm:flex" role="tablist" aria-label="Questions">
        {items.map((f, i) => (
          <button
            key={f.q}
            type="button"
            role="tab"
            aria-selected={i === open}
            onClick={() => setOpen(i)}
            className={cx(
              "cursor-pointer border-3 border-black px-2.5 py-1.5 text-left text-[12px] leading-snug shadow-px-2 sm:text-[12.5px]",
              i === open ? "bg-gold text-ink" : "bg-coal text-cream hover:bg-coal-hover",
            )}
          >
            {f.q}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="border-3 border-black bg-coal p-4 shadow-px-5 sm:p-5">
        <div className="font-pixel text-[20px] leading-tight text-gold-hi sm:text-[24px]">{item.q}</div>
        <p className="mb-0 mt-2.5 text-[13.5px] text-dust sm:text-sm">{item.a}</p>
        <div className="mt-4 flex items-center justify-between text-[11px] text-stone">
          <span>
            {open + 1} / {items.length}
          </span>
          <span className="flex gap-2">
            <button type="button" className="cursor-pointer text-khaki hover:text-cream" onClick={() => setOpen((open - 1 + items.length) % items.length)}>
              ◂ prev
            </button>
            <button type="button" className="cursor-pointer text-khaki hover:text-cream" onClick={() => setOpen((open + 1) % items.length)}>
              next ▸
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
