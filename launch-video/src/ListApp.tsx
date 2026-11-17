// Hook + problem: a generic grey music list that scrolls forever, then its rows tip
// upright into coloured disc spines.
import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eio, eout, ein } from "./anim";
import { ALL, fmt } from "./site/catalogue";
import { geometry, listGeom, STEP, PUSH, W, H } from "./shelf";
import { smooth } from "./anim";

const B = cfg.beats;
const N = ALL.length;

/** scroll velocity per frame (unscaled): slow drift, three flicks, then a stop */
const vel = (f: number) => {
  let v = f < 105 ? 4 + 6 * eio(f / 105) : 10;
  for (const fl of B.flicks) if (f >= fl) v += 70 * Math.exp(-(f - fl) / 9);
  return v * (1 - eio(prog(f, B.scrollStop[0], B.scrollStop[1])));
};
const cache = new Map<string, { s: number[]; k: number }>();
function scrollTable(L: Layout) {
  const key = L.kind;
  if (!cache.has(key)) {
    const raw: number[] = [0];
    for (let f = 1; f <= 900; f++) raw[f] = raw[f - 1] + vel(f - 1);
    const target = listGeom(L).endRows * L.list.rH;
    const k = target / raw[B.scrollStop[1]];
    cache.set(key, { s: raw.map((x) => x * k), k });
  }
  return cache.get(key)!;
}
export const scrollAt = (f: number, L: Layout) => scrollTable(L).s[clamp(Math.round(f), 0, 900)];
export const blurAt = (f: number, L: Layout) => clamp(vel(f) * scrollTable(L).k * 0.16, 0, 18);

const GREY = { bg: "#f5f5f4", line: "#e2e2e0", ink: "#2e3034", mute: "#7d8085", side: "#ececea" };

export const ListApp: React.FC<{ f: number; L: Layout; opacity: number }> = ({ f, L, opacity }) => {
  const { hH, rH, side, pad, thumb } = L.list;
  const desk = L.kind === "desk";
  const scroll = scrollAt(f, L);
  const blur = blurAt(f, L);
  const morphing = f >= B.morph[0];
  const chromeFade = 1 - eout(prog(f, B.morph[0], B.morph[0] + 16));
  const { nv, k0, cur0 } = listGeom(L);
  const { S, floorY } = geometry(L);

  const rowW = L.app.w - side - pad * 2;
  const first = Math.floor(scroll / rH);
  const rows: React.ReactNode[] = [];
  for (let i = first; i < first + nv + 1; i++) {
    const y = hH + i * rH - scroll;
    if (y > L.app.h) break;
    const al = ALL[((i % N) + N) % N];
    const rel = i - (240 + k0); // position among the rows that become spines
    const isMorph = morphing && rel >= 0 && rel < nv;
    if (morphing && !isMorph) continue;

    if (!isMorph) {
      rows.push(
        <div key={i} style={{ position: "absolute", left: side + pad, top: y, width: rowW, height: rH, display: "flex", alignItems: "center", gap: desk ? 18 : 14, borderBottom: `1px solid ${GREY.line}`, fontFamily: "var(--font-body)" }}>
          {desk && <span style={{ width: 34, textAlign: "right", font: "400 13px var(--font-mono)", color: GREY.mute }}>{(i % 9000) + 1}</span>}
          <span style={{ width: thumb, height: thumb, borderRadius: 6, flex: "none", backgroundImage: al.coverUrl, backgroundSize: "cover", filter: "grayscale(1) contrast(.75) brightness(1.1)", opacity: 0.75 }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: desk ? "row" : "column", gap: desk ? 0 : 3 }}>
            <span style={{ flex: desk ? "0 0 46%" : undefined, fontSize: desk ? 17 : 16, fontWeight: 500, color: GREY.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{al.tracks[0].name}</span>
            <span style={{ fontSize: desk ? 16 : 13.5, color: GREY.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{al.artist}</span>
          </span>
          <span style={{ font: "400 13px var(--font-mono)", color: GREY.mute }}>{fmt(al.tracks[0].sec)}</span>
        </div>
      );
      continue;
    }

    // morph: row -> spine standing where the shelf will put it
    const mid = Math.floor(nv / 2);
    const st0 = B.morph[0] + Math.abs(rel - mid) * 2;
    const p = eio(prog(f, st0, st0 + 22));
    const d = rel - mid;
    const ad = Math.abs(d), sg = d < 0 ? -1 : 1, near = smooth(Math.min(ad, 1));
    // the phone frame is narrow: pack the spines so the whole row stays in shot
    const sArc = desk ? d * STEP + sg * PUSH * near : d * STEP * 0.78;
    const tx = L.stage.w / 2 + sArc * S * 0.93, ty = L.stage.y + floorY - (H / 2) * S;
    const fx = side + pad + rowW / 2, fy = y + rH / 2;
    // shrink to spine length first, then tip upright: no long bars sweeping the frame
    const pt = prog(f, st0, st0 + 22);
    const pw = eio(clamp(pt / 0.5, 0, 1)), pr = eio(clamp((pt - 0.42) / 0.58, 0, 1));
    const cx = lerp(fx, tx, p), cy = lerp(fy, ty, p);
    const w = lerp(rowW, W * S, pw), h = lerp(rH - 4, 46 * S, pr);
    const bgMix = clamp(p * 1.4, 0, 1) * 100;
    rows.push(
      <div key={i} style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `rotate(${(90 * pr).toFixed(2)}deg)`, borderRadius: lerp(0, 2, p),
        background: `color-mix(in oklab, ${al.pal.bg} ${bgMix.toFixed(1)}%, ${GREY.bg})`, color: `color-mix(in oklab, ${al.pal.ink} ${bgMix.toFixed(1)}%, ${GREY.ink})`,
        display: "flex", alignItems: "center", gap: lerp(18, 10, p), padding: `0 ${lerp(desk ? 52 : 14, 12, p)}px`, overflow: "hidden", whiteSpace: "nowrap",
        boxShadow: p > 0.5 ? `inset 6px 0 8px -6px rgba(255,255,255,.25), inset -6px 0 8px -6px rgba(0,0,0,.2)` : "none", borderBottom: p < 0.2 ? `1px solid ${GREY.line}` : "none" }}>
        <span style={{ width: thumb * (1 - p), height: thumb * (1 - p), opacity: 1 - clamp(p * 3, 0, 1), flex: "none", backgroundImage: al.coverUrl, backgroundSize: "cover", filter: "grayscale(1)", borderRadius: 6 }} />
        <span style={{ font: `700 ${lerp(15.5, 14.5 * S, p).toFixed(2)}px var(--font-body)`, flex: "none" }}>{p < 0.5 ? al.tracks[0].name : al.title}</span>
        <span style={{ font: `500 ${lerp(15, 10.5 * S, p).toFixed(2)}px var(--font-body)`, opacity: 0.8, flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis" }}>{al.artist}</span>
      </div>
    );
  }

  const blurId = `vb-${L.kind}`;
  return (
    <div style={{ position: "absolute", inset: 0, background: GREY.bg, opacity, fontFamily: "var(--font-body)", color: GREY.ink }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={blurId} x="0" y="-20%" width="100%" height="140%"><feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} /></filter>
      </svg>
      {/* chrome */}
      <div style={{ opacity: chromeFade }}>
        {desk && (
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: side, background: GREY.side, padding: "34px 26px", display: "grid", alignContent: "start", gap: 14 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 20 }}>{["#d4d4d2", "#d4d4d2", "#d4d4d2"].map((c, k) => <i key={k} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />)}</div>
            {["Home", "Search", "Songs", "Albums", "Artists", "Playlists"].map((t) => (
              <div key={t} style={{ fontSize: 15, fontWeight: t === "Songs" ? 600 : 400, color: t === "Songs" ? GREY.ink : GREY.mute, padding: "8px 12px", borderRadius: 8, background: t === "Songs" ? "#e2e2e0" : "transparent" }}>{t}</div>
            ))}
          </div>
        )}
        <div style={{ position: "absolute", left: side + pad, right: pad, top: desk ? 36 : 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: desk ? 34 : 28, fontWeight: 600, letterSpacing: "-.01em" }}>All songs</div>
            {desk && <div style={{ width: 260, height: 38, borderRadius: 10, background: "#ebebe9", color: GREY.mute, fontSize: 14, display: "flex", alignItems: "center", padding: "0 14px" }}>Search 12,480 songs</div>}
          </div>
          <div style={{ fontSize: 14, color: GREY.mute, marginTop: 6 }}>12,480 songs · 41 days of music</div>
          {desk && (
            <div style={{ display: "flex", gap: 18, marginTop: 34, font: "500 11px var(--font-mono)", letterSpacing: ".14em", color: GREY.mute, textTransform: "uppercase", paddingBottom: 10, borderBottom: `1px solid ${GREY.line}` }}>
              <span style={{ width: 34, textAlign: "right" }}>#</span><span style={{ width: thumb }} /><span style={{ flex: "0 0 46%" }}>Title</span><span style={{ flex: 1 }}>Artist</span><span>Time</span>
            </div>
          )}
        </div>
      </div>
      {/* rows: clipped under the header while scrolling */}
      <div style={{ position: "absolute", inset: 0, clipPath: morphing ? "none" : `inset(${hH}px 0 0 0)`, filter: blur > 0.3 && !morphing ? `url(#${blurId})` : "none" }}>
        {rows}
      </div>
    </div>
  );
};
