"use client";

import { useState } from "react";
import { FAQ } from "@/lib/content";

/** Questions from the camp. One answer open at a time; the first starts open. */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-bedrock pb-[104px] pt-6">
      <div className="mx-auto max-w-[960px] px-6">
        <div className="font-mono text-xs uppercase tracking-[2px] text-gold">10 · FAQ</div>
        <h2 id="faq-title" className="mt-3.5 mb-9 font-pixel text-[clamp(54px,6.6vw,100px)] font-normal leading-[.88] tracking-[.5px] text-cream">
          QUESTIONS FROM THE CAMP
        </h2>
        <div className="grid gap-2.5">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-3 border-rock bg-card">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen((o) => (o === i ? -1 : i))}
                  className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-5 py-[18px] text-left font-sans text-lg font-semibold text-cream hover:text-gold"
                >
                  <span className="flex-1">{item.q}</span>
                  <span aria-hidden className="w-5 text-center font-pixel text-[34px] leading-none text-gold">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p id={`faq-${i}`} className="m-0 max-w-[780px] px-5 pb-5 text-base leading-[1.65] text-dust">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
