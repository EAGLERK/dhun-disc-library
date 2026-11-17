// Cursor (desktop) or touch indicator (phone). Travels on arcs, eases in and out,
// settles with a small overshoot, and presses on every click.
import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eioBack, eout, ein } from "./anim";
import { geometry, shelfAt, Y0, SPAN, H } from "./shelf";

const B = cfg.beats;
type P = { x: number; y: number };
type Stop = { f: number; p: (f: number) => P; hold?: number };

function arc(a: P, b: P, t: number): P {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / dist) * dist * 0.15, y: my + (dx / dist) * dist * 0.15 };
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}
function along(stops: Stop[], f: number): P {
  let pos: P = stops[0].p(f);
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i], holdEnd = s.hold ?? s.f;
    if (f <= s.f) {
      if (i === 0) return s.p(f);
      const prev = stops[i - 1], pEnd = prev.hold ?? prev.f;
      const f0 = Math.max(pEnd + 2, s.f - 26);
      return arc(prev.p(Math.min(f, pEnd)), s.p(s.f), eioBack(prog(f, f0, s.f), 0.55));
    }
    if (f <= holdEnd) return s.p(f);
    pos = s.p(holdEnd);
  }
  return pos;
}

export function cursorPlan(L: Layout) {
  const { S, floorY } = geometry(L);
  const tl = L.timeline, lang = L.lang;
  const pinX = (f: number) => tl.x + clamp((shelfAt(f, L).pinT - Y0) / SPAN, 0, 1) * tl.w;
  const menuTop = lang.y + lang.h + 8 + 8;
  const shelf: Stop[] = [
    { f: B.cursorIn, p: () => ({ x: L.app.w * 0.7, y: L.app.h * 0.6 }) },
    { f: B.yearGrab, p: (f) => ({ x: pinX(f), y: tl.y + 22 }), hold: B.yearSettle[1] },
    { f: B.genreClick, p: () => ({ x: L.stops[6].cx, y: L.stops[6].cy }) },
    { f: B.langClick, p: () => ({ x: lang.x + lang.w * 0.42, y: lang.y + lang.h / 2 }) },
    { f: B.tamilClick - 4, p: () => ({ x: lang.x + lang.w - L.menu.w * 0.62, y: menuTop + 3 * L.menu.item + L.menu.item / 2 }), hold: B.tamilClick + 4 },
    { f: B.caseClick, p: () => ({ x: L.stage.w / 2 + 10, y: L.stage.y + floorY - (H / 2) * S + 20 }) },
    { f: B.cursorOut[1], p: () => ({ x: L.app.w * 0.86, y: L.app.h * 0.94 }) },
  ];
  // "Your music": desktop drags a folder in from outside the window; phone taps the + button
  const own: Stop[] = L.kind === "desk"
    ? [{ f: B.ownCursorIn, p: () => ({ x: L.app.w + 80, y: L.app.h * 0.62 }) },
       { f: B.drop, p: () => ({ x: L.app.w * 0.6, y: L.app.h * 0.6 }) },
       { f: B.ownCursorOut[1], p: () => ({ x: L.app.w * 0.66, y: L.app.h * 0.7 }) }]
    : [{ f: B.ownCursorIn, p: () => ({ x: L.app.w * 0.72, y: L.app.h * 0.5 }) },
       { f: B.drop - 10, p: () => ({ x: L.add.x + L.add.w / 2, y: L.add.y + L.add.h / 2 }) },
       { f: B.ownCursorOut[1], p: () => ({ x: L.app.w * 0.62, y: L.app.h * 0.3 }) }];
  const presses = [B.genreClick, B.langClick, B.tamilClick, B.caseClick, ...(L.kind === "mob" ? [B.drop - 10] : [])];
  return { shelf, own, presses };
}

export const Cursor: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const inShelf = f >= B.cursorIn - 2 && f <= B.cursorOut[1] + 2;
  const inOwn = f >= B.ownCursorIn - 2 && f <= B.ownCursorOut[1] + 2;
  if (!inShelf && !inOwn) return null;
  const { shelf, own, presses } = cursorPlan(L);
  const pos = along(inShelf ? shelf : own, f);
  const dragging = f >= B.yearGrab && f < B.yearRelease;
  let pr = dragging ? 0.9 : 1, ripple = -1;
  for (const at of [...presses, B.yearGrab]) {
    const t = f - at;
    if (t >= 0 && t <= 8) pr = Math.min(pr, t < 3 ? lerp(1, 0.86, eout(t / 3)) : lerp(0.86, at === B.yearGrab ? 0.9 : 1, eout((t - 3) / 5)));
    if (t >= 0 && t < 14) ripple = t / 14;
  }
  const op = inShelf
    ? eout(prog(f, B.cursorIn - 2, B.cursorIn + 8)) * (1 - ein(prog(f, B.cursorOut[0], B.cursorOut[1])))
    : eout(prog(f, B.ownCursorIn - 2, B.ownCursorIn + 6)) * (1 - ein(prog(f, B.ownCursorOut[0], B.ownCursorOut[1])));

  // folder being dragged in (desktop only), dropped and absorbed at B.drop
  const carry = L.kind === "desk" && inOwn && f < B.drop + 8;
  const dropT = prog(f, B.drop, B.drop + 8);
  const folder = carry && (
    <div style={{ position: "absolute", left: 16, top: 20, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 10px 12px", borderRadius: 12, background: "#fbfbfa",
      boxShadow: "0 14px 30px -10px rgba(20,22,26,.35), 0 0 0 1px rgba(20,22,26,.08)", transform: `rotate(-4deg) scale(${(1 - 0.6 * eout(dropT)).toFixed(3)})`, transformOrigin: "0 0",
      opacity: 1 - dropT, whiteSpace: "nowrap", font: "500 14px var(--font-body)", color: "#14161a" }}>
      <svg width="26" height="22" viewBox="0 0 26 22"><path d="M1 4.5A2.5 2.5 0 0 1 3.5 2h6l2.5 3h10.5A2.5 2.5 0 0 1 25 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 1 18.5z" fill="#ef4423" /></svg>
      <span style={{ display: "grid", gap: 1 }}><b style={{ fontWeight: 600 }}>My Music</b><span style={{ font: "400 11px var(--font-mono)", color: "#73777e", letterSpacing: ".06em" }}>16 FILES</span></span>
    </div>
  );

  if (L.kind === "desk") {
    return (
      <div style={{ position: "absolute", left: pos.x, top: pos.y, zIndex: 80, opacity: op, pointerEvents: "none" }}>
        {folder}
        {ripple >= 0 && <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(20,22,26,.35)", transform: `scale(${0.4 + ripple * 0.9})`, opacity: 1 - ripple }} />}
        <svg width="28" height="34" viewBox="0 0 28 34" style={{ position: "absolute", left: -3, top: -2, transform: `scale(${pr})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.28))" }}>
          <path d="M3 2 L3 26 L9.2 20.4 L13.4 30.2 L17.6 28.4 L13.5 18.8 L22 18.8 Z" fill="#14161a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: pos.x, top: pos.y, zIndex: 80, opacity: op, pointerEvents: "none" }}>
      {ripple >= 0 && <div style={{ position: "absolute", left: -24, top: -24, width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(20,22,26,.4)", transform: `scale(${0.6 + ripple * 1.1})`, opacity: 1 - ripple }} />}
      <div style={{ position: "absolute", left: -19, top: -19, width: 38, height: 38, borderRadius: "50%", background: `rgba(20,22,26,${pr < 0.98 || dragging ? 0.42 : 0.24})`, border: "2px solid rgba(255,255,255,.85)", boxShadow: "0 4px 10px rgba(0,0,0,.18)", transform: `scale(${pr})` }} />
    </div>
  );
};
