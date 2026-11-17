// Shelf state as a pure function of the frame. Geometry is the site's render() math.
// The video uses invented albums (no label artwork in an ad) laid out exactly like the real shelf:
// six genres with Film, five languages, 1959–2023, plus four "My music" albums added from files.
import { DEMO, finalize, PALS, MOTIFS, coverSVG, hashStr, yr } from "./site/catalogue";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eio, eout, smooth } from "./anim";

const B = cfg.beats;
export const W = 300, H = 300, R = 1150, STEP = 50, PUSH = W / 2 + 40, FAN = 24, PULL = 72,
  PERSP = 1500, CAMH = 430, OUT = 112, OPEN_PUSH = 215;
const RAD = Math.PI / 180, DEG = 180 / Math.PI;

type Al = any;
export const GENRE_LIST = ["Pop", "Rock", "Electronic", "Jazz", "Folk", "Film"];
export const FILM = GENRE_LIST.indexOf("Film") + 1; // slider stop (0 = All)

/** the video catalogue: the demo albums re-dated across 1959–2023, ambient records filed as film scores */
export const CAT: Al[] = finalize(DEMO.map((a: Al, i: number) => ({
  ...a, kind: "itunes", genre: a.genre === "Ambient" ? "Film" : a.genre,
  year: 1959 + Math.floor((i * 65) / DEMO.length),
})));
export const { Y0, Y1, SPAN } = yr();

const OWN_SPEC: [string, string, number, string, string[]][] = [
  ["Night Train", "Kabir Trio", 2016, "Jazz", ["Platform One", "Sleeper Car", "Junction at 3 AM", "Last Whistle"]],
  ["Monsoon Tapes", "Riya & The Ferns", 2019, "Folk", ["First Rain", "Tin Roof Lullaby", "Puddle Song", "Petrichor"]],
  ["Terrace Sessions", "Aditi Rao", 2021, "Pop", ["Kites", "Water Tank Views", "Golden Hour", "Neighbours"]],
  ["Signal Lost", "Vihaan K.", 2023, "Electronic", ["No Bars", "Airplane Mode", "Buffering", "Reconnect"]],
];
export const OWN: Al[] = OWN_SPEC.map(([title, artist, year, genre, names], k) => {
  const seed = hashStr(artist + title);
  const al: Al = { kind: "file", id: "u" + (k + 1), title, artist, year, genre, lang: "me", langName: "My music", seed,
    cat: "YOU-" + String(k + 1).padStart(3, "0"), t: year + 0.5,
    tracks: names.map((name, i) => ({ name, sec: 168 + ((seed >> (i * 3)) % 140) })) };
  al.pal = PALS[(seed + 3) % PALS.length];
  al.motif = (seed >>> 3) % MOTIFS.length;
  al.coverUrl = `url('data:image/svg+xml,${encodeURIComponent(coverSVG(al)).replace(/'/g, "%27")}')`;
  const { bg, art } = al.pal;
  al.accent = [art[1], art[2], art[3]].find((c: string) => c.toLowerCase() !== bg.toLowerCase());
  return al;
});

const L0: Al[] = CAT;
const L1: Al[] = CAT.filter((a: Al) => a.genre === "Film");
const L2: Al[] = L1.filter((a: Al) => a.lang === "ta");
const L3: Al[] = OWN;

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
  const k0 = 2; // the shelf opens on the early 1960s so the year drag can cover sixty years
  return { nv, k0, cur0: k0 + Math.floor(nv / 2), endRows: 240 + k0 };
}

export type ShelfItem = { al: Al; d: number; alpha: number };
export type ShelfState = {
  items: ShelfItem[]; cur: number; list: Al[]; p: number; pinT: number; scrub: boolean;
  genre: number; lang: string; focus: Al; openAmt: number; count: string; total: number;
};

export function shelfAt(f: number, L: Layout): ShelfState {
  const { cur0 } = listGeom(L);
  const tA = L0[cur0].t, tB = B.yearTarget;
  const curDragEnd = idxAt(L0, tB + 0.02);
  const curY = Math.round(curDragEnd);
  const curG = nearest(L0, curY, L1);
  const curL = nearest(L1, curG, L2);
  const curO = nearest(L2, curL, L3);

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
  } else if (f < B.ownFilter[0]) {
    A = L1; Bl = L2; p = eio(prog(f, B.langFilter[0], B.langFilter[1])); curA = curG; curB = curL;
  } else {
    A = L2; Bl = L3; p = eio(prog(f, B.ownFilter[0], B.ownFilter[1])); curA = curL; curB = curO;
  }
  let genre = f < B.genreClick + 4 ? 0 : lerp(0, FILM, eout(prog(f, B.genreClick + 4, B.genreClick + 14)));
  if (f >= B.ownFilter[0]) genre = lerp(FILM, 0, eout(prog(f, B.ownFilter[0], B.ownFilter[0] + 10)));
  const lang = f >= B.ownFilter[0] ? "me" : f < B.tamilClick + 2 ? "" : "ta";

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
  const openAmt = eio(prog(f, B.discOut[0], B.discOut[1])) * (1 - eio(prog(f, B.discBack[0], B.discBack[1])));
  const total = CAT.length + (f >= B.ownFilter[0] ? OWN.length : 0);
  const n = list.length;
  const count = n === total ? `${total} albums` : `${n} of ${total} albums`;
  return { items, cur, list, p, pinT, scrub, genre, lang, focus, openAmt, count, total };
}

/** the album opened in the payoff: the front case once the Tamil filter has settled */
export const payoffAlbum = (L: Layout) => shelfAt(B.langFilter[1] + 1, L).focus;

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
