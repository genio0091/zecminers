"use client";

import { useState } from "react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-3 border-black bg-coal shadow-px-5">
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full cursor-pointer items-center gap-4 bg-transparent px-[18px] py-4 text-left font-pixel text-[21px] text-cream hover:text-gold-hi"
              >
                <span className="flex-1">{item.q}</span>
                <span className="text-2xl text-gold" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div id={`faq-${i}`} hidden={!isOpen} className="px-[18px] pb-[18px] text-sm text-dust">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
