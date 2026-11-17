// Logo + CTA. The Dhun mark builds: the note-D swings in, then h-u-n rise one by one.
import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { prog, back, eout, ein, lerp } from "./anim";
import logo from "./site/logo.json";

const B = cfg.beats;
const src: string = logo.logo;
const D_PATH = src.match(/<path d="(M0\.00994566[^"]+)"/)![1];
const LETTERS = ["stroke0_115_5", "stroke2_115_5", "stroke4_115_5"].map((id) => src.match(new RegExp(`<path id="${id}" d="([^"]+)"`))![1]);

export const EndCard: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  if (f < B.logoD - 2) return null;
  const { logoH, tagSize, ctaSize, logoY } = L.end;
  const cx = L.out.w / 2, cy = L.out.h / 2 + logoY;
  const drift = 1 + 0.03 * prog(f, B.logoD, 900);
  const dT = prog(f, B.logoD, B.logoD + 18);
  const dS = lerp(0.55, 1, back(dT, 1.4));
  const dR = lerp(-14, 0, eout(dT));
  const ring = (f - B.logoD) * 0.35;
  const letter = (i: number) => {
    const t = prog(f, B.logoLetters + i * 3, B.logoLetters + i * 3 + 15);
    return { opacity: Math.min(1, eout(t) * 1.5), transform: `translateY(${((1 - back(t)) * 34).toFixed(2)}px)` };
  };
  const words = cfg.tagline.split(" ");
  const ctaT = prog(f, B.cta, B.cta + 15);
  const w = (logoH * 283) / 97;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${drift})`, transformOrigin: `${cx}px ${cy}px` }}>
      {/* faint disc rings turning behind the mark */}
      <svg width={L.out.w} height={L.out.h} style={{ position: "absolute", inset: 0, opacity: 0.09 * eout(prog(f, B.logoD, B.logoD + 24)) }}>
        <g transform={`translate(${cx} ${cy}) rotate(${ring})`}>
          {[0.36, 0.52, 0.7].map((k, i) => <circle key={i} r={L.out.w * k * (L.kind === "desk" ? 0.5 : 0.62)} fill="none" stroke="#14161a" strokeWidth={i === 1 ? 1.5 : 1} />)}
          <circle cx={L.out.w * 0.52 * (L.kind === "desk" ? 0.5 : 0.62)} cy={0} r={6} fill="#14161a" />
        </g>
      </svg>
      <svg width={w} height={logoH} viewBox="0 0 283 97" style={{ position: "absolute", left: cx - w / 2, top: cy - logoH / 2, overflow: "visible" }}>
        <defs>
          <linearGradient id="endInk" x1="0" y1="0" x2="283" y2="97" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4a4d53" /><stop offset=".45" stopColor="#1b1d21" /><stop offset="1" stopColor="#000" />
          </linearGradient>
          {LETTERS.map((d, i) => <mask key={i} id={`endM${i}`}><path d={d} fill="white" /></mask>)}
        </defs>
        <g style={{ transform: `rotate(${dR}deg) scale(${dS})`, transformOrigin: "45px 50px", opacity: eout(Math.min(1, dT * 2)) }}>
          <path d={D_PATH} fill="url(#endInk)" />
        </g>
        {LETTERS.map((d, i) => (
          <g key={i} style={letter(i)}>
            <path d={d} fill="url(#endInk)" />
            <path d={d} fill="none" stroke="url(#endInk)" strokeWidth={4} mask={`url(#endM${i})`} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + logoH / 2 + tagSize * 1.1, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 .26em",
        padding: "0 8%", font: `600 ${tagSize}px/1.15 var(--font-display)`, letterSpacing: "-.02em", color: "#14161a" }}>
        {words.map((wd, i) => {
          const t = prog(f, B.tagline + i * 3, B.tagline + i * 3 + 15);
          return <span key={i} style={{ display: "inline-block", opacity: Math.min(1, eout(t) * 1.4), transform: `translateY(${((1 - back(t)) * 0.5).toFixed(3)}em)` }}>{wd}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + logoH / 2 + tagSize * (L.kind === "desk" ? 3.0 : 4.3), display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ctaSize * 0.7, padding: `${ctaSize * 0.8}px ${ctaSize * 1.3}px`, borderRadius: 999, background: "#14161a", color: "#f3f3f1",
          font: `500 ${ctaSize}px var(--font-mono)`, letterSpacing: ".18em", textTransform: "uppercase", opacity: eout(ctaT), transform: `scale(${lerp(0.85, 1, back(ctaT))})` }}>
          <i style={{ width: ctaSize * 0.42, height: ctaSize * 0.42, borderRadius: "50%", background: "#ef4423" }} />
          {cfg.cta}
          <span style={{ letterSpacing: 0 }}>→</span>
        </div>
      </div>
    </div>
  );
};
