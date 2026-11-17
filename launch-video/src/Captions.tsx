import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { prog, back, ein, eout } from "./anim";

export const Captions: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const c = cfg.captions.find((c: any) => {
    const start = c.wordIns ? c.wordIns[0] : c.in;
    return f >= start - 1 && f <= c.out + 10;
  }) as any;
  if (!c) return null;
  const start = c.wordIns ? c.wordIns[0] : c.in;
  const ex = prog(f, c.out, c.out + 9);
  const drift = 1 + 0.02 * prog(f, start, c.out);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: L.caption.y, transform: `translateY(-50%) scale(${drift})`, display: "flex", justifyContent: "center", gap: "0.26em",
      font: `700 ${L.caption.size}px/1 var(--font-display)`, letterSpacing: "-.02em", color: "#14161a", whiteSpace: "nowrap" }}>
      {c.words.map((w: string, i: number) => {
        const wi = c.wordIns ? c.wordIns[i] : c.in + i * 3;
        const t = prog(f, wi, wi + 15);
        const e = t > 0 ? back(t) : 0;
        const exi = prog(f, c.out + i, c.out + i + 9);
        const y = (1 - e) * 0.55 - ein(exi) * 0.35;
        return (
          <span key={i} style={{ display: "inline-block", opacity: Math.min(1, eout(t) * 1.4) * (1 - ein(exi)), transform: `translateY(${y.toFixed(3)}em)`,
            color: c.wordIns && i < c.words.length - 1 ? "#8b8e93" : undefined }}>{w}</span>
        );
      })}
    </div>
  );
};
