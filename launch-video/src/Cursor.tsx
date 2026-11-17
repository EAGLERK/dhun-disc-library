// Cursor (desktop) or touch indicator (phone). Travels on arcs, eases in and out,
// settles with a small overshoot, and presses on every click.
import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eioBack, eout, ein } from "./anim";
import { geometry, shelfAt, Y0, SPAN, H } from "./shelf";

const B = cfg.beats;
type P = { x: number; y: number };

export function cursorPlan(L: Layout) {
  const { S, floorY } = geometry(L);
  const tl = L.timeline;
  const pinX = (f: number) => tl.x + clamp((shelfAt(f, L).pinT - Y0) / SPAN, 0, 1) * tl.w;
  const lang = L.lang;
  const menuTop = lang.y + lang.h + 8 + 8;
  const stops: { f: number; p: (f: number) => P; hold?: number }[] = [
    { f: B.cursorIn, p: () => ({ x: L.app.w * 0.7, y: L.app.h * 0.6 }) },
    { f: B.yearGrab, p: (f) => ({ x: pinX(f), y: tl.y + 22 }), hold: B.yearSettle[1] },
    { f: B.genreClick, p: () => ({ x: L.stops[2].cx, y: L.stops[2].cy }) },
    { f: B.langClick, p: () => ({ x: lang.x + lang.w * 0.42, y: lang.y + lang.h / 2 }) },
    { f: B.tamilClick - 4, p: () => ({ x: lang.x + lang.w - L.menu.w * 0.62, y: menuTop + 3 * L.menu.item + L.menu.item / 2 }), hold: B.tamilClick + 4 },
    { f: B.caseClick, p: () => ({ x: L.stage.w / 2 + 10, y: L.stage.y + floorY - (H / 2) * S + 20 }) },
    { f: B.cursorOut[1], p: () => ({ x: L.app.w * 0.86, y: L.app.h * 0.94 }) },
  ];
  const presses = [B.genreClick, B.langClick, B.tamilClick, B.caseClick];
  return { stops, presses };
}

function arc(a: P, b: P, t: number): P {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / dist) * dist * 0.15, y: my + (dx / dist) * dist * 0.15 };
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

export const Cursor: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  if (f < B.cursorIn - 2 || f > B.cursorOut[1] + 2) return null;
  const { stops, presses } = cursorPlan(L);
  let pos: P = stops[0].p(f);
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const holdEnd = s.hold ?? s.f;
    if (f <= s.f) {
      if (i === 0) { pos = s.p(f); break; }
      const prev = stops[i - 1], pEnd = prev.hold ?? prev.f;
      const f0 = Math.max(pEnd + 2, s.f - 26);
      const t = eioBack(prog(f, f0, s.f), 0.55);
      pos = arc(prev.p(Math.min(f, pEnd)), s.p(s.f), t);
      break;
    }
    if (f <= holdEnd) { pos = s.p(f); break; }
    pos = s.p(holdEnd);
  }
  const dragging = f >= B.yearGrab && f < B.yearRelease;
  let pr = dragging ? 0.9 : 1, ripple = -1;
  for (const at of [...presses, B.yearGrab]) {
    const t = f - at;
    if (t >= 0 && t <= 8) pr = Math.min(pr, t < 3 ? lerp(1, 0.86, eout(t / 3)) : lerp(0.86, at === B.yearGrab ? 0.9 : 1, eout((t - 3) / 5)));
    if (t >= 0 && t < 14) ripple = t / 14;
  }
  const op = eout(prog(f, B.cursorIn - 2, B.cursorIn + 8)) * (1 - ein(prog(f, B.cursorOut[0], B.cursorOut[1])));

  if (L.kind === "desk") {
    return (
      <div style={{ position: "absolute", left: pos.x, top: pos.y, zIndex: 60, opacity: op, pointerEvents: "none" }}>
        {ripple >= 0 && <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(20,22,26,.35)", transform: `scale(${0.4 + ripple * 0.9})`, opacity: 1 - ripple }} />}
        <svg width="28" height="34" viewBox="0 0 28 34" style={{ position: "absolute", left: -3, top: -2, transform: `scale(${pr})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.28))" }}>
          <path d="M3 2 L3 26 L9.2 20.4 L13.4 30.2 L17.6 28.4 L13.5 18.8 L22 18.8 Z" fill="#14161a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: pos.x, top: pos.y, zIndex: 60, opacity: op, pointerEvents: "none" }}>
      {ripple >= 0 && <div style={{ position: "absolute", left: -24, top: -24, width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(20,22,26,.4)", transform: `scale(${0.6 + ripple * 1.1})`, opacity: 1 - ripple }} />}
      <div style={{ position: "absolute", left: -19, top: -19, width: 38, height: 38, borderRadius: "50%", background: `rgba(20,22,26,${pr < 0.98 || dragging ? 0.42 : 0.24})`, border: "2px solid rgba(255,255,255,.85)", boxShadow: "0 4px 10px rgba(0,0,0,.18)", transform: `scale(${pr})` }} />
    </div>
  );
};
