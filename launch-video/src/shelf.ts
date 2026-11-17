// Shelf state as a pure function of the frame. Geometry is the site's render() math.
import { ALL, Y0, SPAN } from "./site/catalogue";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eio, eout, smooth } from "./anim";

const B = cfg.beats;
export const W = 300, H = 300, R = 1150, STEP = 50, PUSH = W / 2 + 40, FAN = 24, PULL = 72,
  PERSP = 1500, CAMH = 430, OUT = 112, OPEN_PUSH = 215;
const RAD = Math.PI / 180, DEG = 180 / Math.PI;

type Al = any;
const L0: Al[] = ALL;
const L1: Al[] = ALL.filter((a: Al) => a.genre === "Jazz");
const L2: Al[] = L1.filter((a: Al) => a.lang === "ta");

export function idxAt(arr: Al[], t: number) {
  const n = arr.length;
  if (t <= arr[0].t) return Math.max(-0.8, (t - arr[0].t) * 0.5);
  if (t >= arr[n - 1].t) return n - 1 + Math.min(0.8, (t - arr[n - 1].t) * 0.5);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m].t <= t) lo = m; else hi = m; }
  return lo + (t - arr[lo].t) / (arr[hi].t - arr[lo].t);
}
export function timeAt(arr: Al[], i: number) {
  const n = arr.length; i = clamp(i, 0, n - 1);
  const a = Math.floor(i), b = Math.min(n - 1, a + 1);
  return lerp(arr[a].t, arr[b].t, i - a);
}
const nearest = (from: Al[], i: number, to: Al[]) => {
  const keep = from[Math.round(i)];
  const k = to.indexOf(keep);
  return k >= 0 ? k : clamp(Math.round(idxAt(to, keep.t)), 0, to.length - 1);
};

export function geometry(L: Layout) {
  const { w, h } = L.stage;
  const S = clamp(Math.min(h / 452, (w * 0.84) / 330), 0.28, 1.6);
  const floorY = h - 66 * S - Math.max(0, h - 452 * S) * 0.5;
  const visN = Math.min(Math.ceil((w / 2 / S + 320) / STEP), Math.floor((72 * RAD * R - PUSH) / STEP));
  return { S, floorY, visN };
}

/** rows the list scrolls past, and which album sits in the middle of the shelf when it appears */
export function listGeom(L: Layout) {
  const nv = Math.ceil((L.app.h - L.list.hH) / L.list.rH);
  const k0 = 24;
  return { nv, k0, cur0: k0 + Math.floor(nv / 2), endRows: 240 + k0 };
}

export type ShelfItem = { al: Al; d: number; alpha: number };
export type ShelfState = {
  items: ShelfItem[]; cur: number; list: Al[]; listB: Al[]; p: number; pinT: number; scrub: boolean;
  genre: number; lang: string; focus: Al; openAmt: number; count: string;
};

export function shelfAt(f: number, L: Layout): ShelfState {
  const { cur0 } = listGeom(L);
  // year scrub on the full list
  const tA = L0[cur0].t, tB = B.yearTarget;
  const curDragEnd = idxAt(L0, tB + 0.02);
  const curY = Math.round(curDragEnd);
  const curG = nearest(L0, curY, L1);
  const curL = nearest(L1, curG, L2);

  let A = L0, Bl = L0, p = 0, curA = cur0, curB = cur0, scrub = false, pinT = 0;
  if (f < B.yearDrag[0]) { curA = curB = cur0; }
  else if (f < B.yearSettle[0]) {
    const s = eio(prog(f, B.yearDrag[0], B.yearDrag[1]));
    const t = lerp(tA, tB, s);
    curA = curB = idxAt(L0, t + 0.02); scrub = f < B.yearRelease; pinT = t;
  } else if (f < B.genreFilter[0]) {
    curA = curB = lerp(curDragEnd, curY, eout(prog(f, B.yearSettle[0], B.yearSettle[1])));
  } else if (f < B.langFilter[0]) {
    A = L0; Bl = L1; p = eio(prog(f, B.genreFilter[0], B.genreFilter[1])); curA = curY; curB = curG;
  } else {
    A = L1; Bl = L2; p = eio(prog(f, B.langFilter[0], B.langFilter[1])); curA = curG; curB = curL;
  }
  const genre = f < B.genreClick + 4 ? 0 : lerp(0, 2, eout(prog(f, B.genreClick + 4, B.genreClick + 14)));
  const lang = f < B.tamilClick + 2 ? "" : "ta";

  const inA = new Set(A), inB = new Set(Bl);
  const union = A === Bl ? A : Array.from(new Set([...A, ...Bl]));
  const items: ShelfItem[] = [];
  for (const al of union) {
    const pa = inA.has(al) ? A.indexOf(al) : idxAt(A, al.t);
    const pb = inB.has(al) ? Bl.indexOf(al) : idxAt(Bl, al.t);
    const d = lerp(pa - curA, pb - curB, p);
    let alpha = 1;
    if (!inB.has(al)) alpha = 1 - clamp(p / 0.6, 0, 1);
    else if (!inA.has(al)) alpha = clamp((p - 0.3) / 0.7, 0, 1);
    items.push({ al, d, alpha });
  }
  const list = p < 0.5 ? A : Bl;
  const cur = lerp(curA, curB, p);
  const focusIdx = p < 0.5 ? Math.round(curA) : Math.round(curB);
  const focus = list[clamp(focusIdx, 0, list.length - 1)];
  if (!scrub) pinT = lerp(timeAt(A, curA), timeAt(Bl, curB), p);
  const openAmt = eio(prog(f, B.discOut[0], B.discOut[1]));
  const n = list.length;
  const count = n === ALL.length ? `${ALL.length} discs` : `${n} of ${ALL.length} discs`;
  return { items, cur, list, listB: Bl, p, pinT, scrub, genre, lang, focus, openAmt, count };
}

export function caseTransform(d: number, alpha: number, openAmt: number) {
  const ad = Math.abs(d), sg = d < 0 ? -1 : 1, fe = smooth(clamp(1 - ad, 0, 1)), near = smooth(Math.min(ad, 1));
  let s = d * STEP + sg * PUSH * near;
  if (d > 0) s += openAmt * OPEN_PUSH * near;
  const th = (s / R) * DEG;
  if (Math.abs(th) > 76) return null;
  const fk = d > 0 ? 1 - openAmt * 0.9 : 1, fan = FAN * fk * smooth(clamp((3.4 - ad) / 2.4, 0, 1));
  const a = ad < 1 ? (90 + sg * FAN * fk) * (1 - fe) : 90 + sg * fan;
  const transform = `rotateY(${th.toFixed(3)}deg) translateZ(${(R + PULL * fe).toFixed(1)}px) translateY(${-H / 2}px) rotateY(${a.toFixed(2)}deg) translateX(${((W / 2) * (1 - fe)).toFixed(1)}px)` +
    (alpha < 1 ? ` scale3d(1,1,${Math.max(0.02, smooth(alpha)).toFixed(3)})` : "");
  const wa = (a + th) * RAD, far = Math.abs(th) / 76;
  return {
    transform, s,
    shF: clamp(0.46 * (1 - Math.cos(wa)), 0, 0.6),
    shS: clamp(0.3 * (1 - Math.sin(wa)) + 0.16 * far, 0, 0.6),
    shB: clamp(0.1 + 0.32 * (1 + Math.cos(wa)), 0, 0.6),
    o: clamp(alpha * 3, 0, 1),
  };
}

export { L0, L1, L2, Y0, SPAN };
