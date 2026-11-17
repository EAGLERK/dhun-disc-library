// The Dhun site, rebuilt in React with the site's own CSS and markup, driven by the frame.
import React from "react";
import cfg from "./config.json";
import { Layout } from "./layout";
import { clamp, lerp, prog, eio, eout, site, press, smooth } from "./anim";
import { shelfAt, caseTransform, geometry, W, H, R, OUT, PERSP, CAMH, STEP, Y0, SPAN } from "./shelf";
import { coverText, discHTML, fmt, hs, GENRES, LANGS, esc } from "./site/catalogue";
import logo from "./site/logo.json";

const B = cfg.beats;
const RAD = Math.PI / 180;

const discCache = new Map<string, string>();
export const discFor = (al: any) => {
  if (!discCache.has(al.id)) discCache.set(al.id, discHTML(al));
  return discCache.get(al.id)!;
};
/** disc spin starts as it slides out and spins up like a motor */
export const spinDeg = (f: number) => {
  const t = Math.max(0, (f - B.discOut[0]) / 30), k = 2.2, om = 300;
  return om * (t - (1 - Math.exp(-k * t)) / k);
};

const backHTML = (al: any) =>
  `<ol>${al.tracks.map((t: any, i: number) => `<li><span>${String(i + 1).padStart(2, "0")} ${esc(t.name)}</span><span>${fmt(t.sec)}</span></li>`).join("")}</ol><span class="bl">${al.cat} · ${al.year}</span><div class="bc"><i></i></div>`;
const spineHTML = (al: any) =>
  `<span class="sp-cat">${al.cat}</span><span class="sp-title">${esc(al.title)}</span><span class="sp-artist">${esc(al.artist)}</span><i class="sp-dot"></i>`;

const Planks: React.FC = React.memo(() => {
  const seg = 2.5, rO = R + OUT, w = 2 * rO * Math.tan((seg / 2) * RAD);
  const out: React.ReactNode[] = [];
  let i = 0;
  for (let a = -77.5; a <= 77.51; a += seg, i++) {
    out.push(<div key={"p" + i} className="plank" style={{ width: w + 1.2, marginLeft: -(w + 1.2) / 2, transform: `rotateY(${a}deg) translateZ(${rO}px) rotateX(90deg)` }} />);
    out.push(<div key={"l" + i} className="lip" style={{ width: w + 1.2, marginLeft: -(w + 1.2) / 2, transform: `rotateY(${a}deg) translateZ(${rO}px)`, ["--o" as any]: `${(-(i * w) % 16).toFixed(2)}px` }} />);
  }
  return <>{out}</>;
});

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6L19.4 12z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.5v5h3.4l4.6 4v-13l-4.6 4z"/><path d="M15 8.6a5 5 0 0 1 0 6.8M17.4 6a8.4 8.4 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.4v14H6zM20 5.6v12.8L9.6 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 5H18v14h-2.4zM4 5.6v12.8L14.4 12z"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
};
const html = (s: string) => ({ __html: s });

export const LANG_ITEMS = [["", "All languages"], ...LANGS] as [string, string][];

export const DhunApp: React.FC<{ f: number; L: Layout; opacity: number }> = ({ f, L, opacity }) => {
  const st = shelfAt(f, L);
  const { S, floorY, visN } = geometry(L);
  const stageW = L.stage.w;

  // chrome entrance
  const cIn = (o: number) => {
    const t = prog(f, B.chromeIn[0] + o, B.chromeIn[0] + o + 16);
    return { opacity: t, transform: `translateY(${((1 - eout(t)) * (o ? 14 : -12)).toFixed(2)}px)` };
  };

  // focus swap: frames since the focused album last changed
  let since = 99;
  for (let k = 1; k <= 12; k++) { if (shelfAt(f - k, L).focus !== st.focus) { since = k - 1; break; } }
  const sw = (i: number) => {
    const t = prog(since, i, i + 10);
    return { opacity: eout(t), transform: `translateY(${((1 - eout(t)) * 8).toFixed(2)}px)` };
  };

  // timeline
  const bins = SPAN * (L.timeline.w < 560 ? 3 : 6);
  const counts = new Array(bins).fill(0);
  st.list.forEach((a: any) => counts[clamp(Math.floor(((a.t - Y0) / SPAN) * bins), 0, bins - 1)]++);
  const bw = L.timeline.w / bins;
  const pinPct = clamp((st.pinT - Y0) / SPAN, 0, 1) * 100;
  const pinYear = clamp(Math.floor(st.pinT), Y0, Y0 + SPAN - 1);

  // menu
  const menuT = prog(f, B.menuOpen[0], B.menuOpen[0] + 10);
  const menuOut = prog(f, B.menuClose[0], B.menuClose[1]);
  const menuShown = f >= B.menuOpen[0] && f < B.menuClose[1];
  const hlTamil = f >= B.tamilClick - 6;
  const langPress = press(f, B.langClick);

  const casePress = press(f, B.caseClick);
  const openId = f >= B.discOut[0] - 2 ? st.focus.id : null;

  return (
    <div className="app" style={{ opacity }}>
      <header className="top" style={cIn(0)}>
        <div className="brand" dangerouslySetInnerHTML={html(logo.logo)} />
        <div className="genre">
          <label className="mono lab">Genre</label>
          <div className="g-wrap">
            <input className="rng" type="range" min={0} max={6} step="any" value={st.genre} readOnly />
            <div className="g-stops">
              {["All", ...GENRES].map((g: string, i: number) => (
                <button key={g} className={"g-stop" + (Math.round(st.genre) === i ? " on" : "")} style={{ left: (i / 6) * 100 + "%", transform: `translateX(-50%) scale(${i === 2 ? press(f, B.genreClick) : 1})` }}>
                  <i></i><span><span className="long">{g}</span><span className="short">{i ? ["Amb", "Jazz", "Elec", "Rock", "Folk", "Pop"][i - 1] : "All"}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lang">
          <div className="select" style={{ transform: `scale(${langPress})` }}>
            <select value={st.lang} onChange={() => {}}>
              {LANG_ITEMS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
            {menuShown && (
              <div className="lmenu" style={{ width: L.menu.w, opacity: eout(menuT) * (1 - menuOut), transform: `scale(${(0.94 + 0.06 * eout(menuT)) * (1 - 0.04 * menuOut)})` }}>
                {LANG_ITEMS.map(([c, n], i) => {
                  const it = prog(f, B.menuOpen[0] + 2 + i * 2, B.menuOpen[0] + 12 + i * 2);
                  return (
                    <div key={c} className={c === "ta" && hlTamil ? "hl" : ""} style={{ opacity: eout(it), transform: `translateY(${((1 - eout(it)) * -6).toFixed(2)}px) scale(${c === "ta" ? press(f, B.tamilClick) : 1})` }}>
                      <span>{n}</span>{c === "" && f < B.tamilClick + 2 ? <b>✓</b> : c === "ta" && f >= B.tamilClick + 2 ? <b>✓</b> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="stage" style={{ perspective: PERSP * S + "px", perspectiveOrigin: `50% ${floorY - CAMH * S}px`, cursor: "default" }}>
        <div className="floor-shadow"></div>
        <div className="world" style={{ transform: `translate3d(${stageW / 2}px,${floorY}px,0) scale3d(${S},${S},${S}) translateZ(${-R}px)`, ["--shift" as any]: `${(-((st.cur * STEP * (R + OUT)) / R) % 16).toFixed(2)}px` }}>
          <Planks />
          {st.items.map(({ al, d, alpha }) => {
            if (Math.abs(d) > visN + 1 || alpha < 0.004) return null;
            const g = caseTransform(d, alpha, st.openAmt);
            if (!g) return null;
            const isOpen = al.id === openId;
            const pr = isOpen ? casePress : 1;
            return (
              <div key={al.id} className={"case" + (isOpen ? " opening" : "")}
                style={{ transform: g.transform + (pr !== 1 ? ` scale(${pr})` : ""), ["--bg" as any]: al.pal.bg, ["--ink" as any]: al.pal.ink, ["--shF" as any]: g.shF.toFixed(3), ["--shS" as any]: g.shS.toFixed(3), ["--shB" as any]: g.shB.toFixed(3), ["--o" as any]: g.o.toFixed(3) }}>
                <div className="f front cover" style={{ backgroundImage: al.coverUrl }} dangerouslySetInnerHTML={html(coverText(al))} />
                <div className="f back" dangerouslySetInnerHTML={html(backHTML(al))} />
                <div className="f spine" dangerouslySetInnerHTML={html(spineHTML(al))} />
                <div className="f edge" />
                <div className="f topf" />
                {isOpen && (
                  <div className="sdisc" style={{ transform: `translateX(${(st.openAmt * 0.62 * W).toFixed(1)}px)` }}>
                    <SpinDisc al={al} f={f} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <section className="deck" style={cIn(5)}>
        <div className="row">
          <div className="platter" hidden />
          <div className="focus">
            <button className="nav" disabled={false} dangerouslySetInnerHTML={html(ICON.arrowL)} />
            <div className="f-text">
              <p className="f-kicker mono" style={sw(0)}><i></i><span>{`${st.focus.cat} — ${st.focus.genre} · ${st.focus.langName}`}</span></p>
              <button className="f-title" style={sw(1)}>{st.focus.title}</button>
              <p className="f-sub" style={sw(2)}>{`${st.focus.artist}, ${st.focus.year}`}</p>
            </div>
            <button className="nav" dangerouslySetInnerHTML={html(ICON.arrowR)} />
          </div>
          <div className="count mono">{st.count}</div>
        </div>
        <div className={"timeline" + (st.scrub ? " scrub" : "")}>
          <svg width={L.timeline.w} height={38} style={{ position: "absolute", left: 0, top: 0 }}>
            {counts.map((n, i) => {
              const j = hs(7, i, 3) % 5, hh = n ? 11 + Math.min(n, 3) * 7 + j : 4 + j * 0.7, x = (i + 0.5) * bw;
              const played = Y0 + ((i + 0.5) / bins) * SPAN <= st.pinT;
              return <rect key={i} x={Math.round(x) - 0.75} y={38 - hh} width={1.5} height={hh} fill={n ? (played ? "#14161a" : "#a3a7aa") : played ? "#8d9195" : "#cdcfd0"} />;
            })}
          </svg>
          <div className="pin" style={{ left: pinPct.toFixed(3) + "%" }}><b style={{ opacity: st.scrub ? 1 : 0 }}>{pinYear}</b></div>
          <div className="years">
            {Array.from({ length: SPAN }, (_, k) => {
              const y = Y0 + k, major = y % 5 === 0;
              return <span key={y} className={(major ? "" : "minor") + (y === pinYear ? " on" : "")} style={{ left: (((k + 0.5) / SPAN) * 100).toFixed(3) + "%" }}>{major ? y : "’" + String(y).slice(2)}</span>;
            })}
          </div>
        </div>
      </section>

      {f >= B.wipe[0] && <AlbumPage f={f} L={L} al={st.focus} S={S} floorY={floorY} />}
    </div>
  );
};

export const SpinDisc: React.FC<{ al: any; f: number }> = ({ al, f }) => {
  // rotate only the printed layer, as the site does; gloss and hub stay put
  const h = discFor(al).replace('<div class="disc-print">', `<div class="disc-print" style="transform:rotate(${spinDeg(f).toFixed(2)}deg)">`);
  return <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={html(h)} />;
};

const AlbumPage: React.FC<{ f: number; L: Layout; al: any; S: number; floorY: number }> = ({ f, L, al, S, floorY }) => {
  // circle wipe from the disc, which sits right of the case on the shelf
  const cx = L.stage.w / 2 + 0.62 * W * S * 1.05, cy = L.stage.y + floorY - (H / 2) * S;
  const maxR = Math.hypot(Math.max(cx, L.app.w - cx), Math.max(cy, L.app.h - cy)) + 24;
  const wt = prog(f, B.wipe[0], B.wipe[1]);
  const wE = 1 - Math.pow(1 - eio(wt), 1.6);
  const r = lerp(138 * S * 0.3, maxR, wE);
  const flashT = prog(f, B.wipe[0], B.wipe[0] + 21);
  const flash = flashT < 0.25 ? 1 : 1 - (flashT - 0.25) / 0.75;
  const R0 = B.reveal;
  const rv = (i: number) => {
    const s0 = R0 + 4.2 + i * 1.65;
    const o = eout(prog(f, s0, s0 + 15)), y = (1 - site(prog(f, s0, s0 + 22))) * 16;
    return { opacity: o, transform: `translateY(${y.toFixed(2)}px)` };
  };
  const tT = site(prog(f, R0 + 7, R0 + 34));
  const hb = site(prog(f, R0, R0 + 30));
  const hd = site(prog(f, R0 + 8, R0 + 41));
  const playSec = Math.max(0, (f - B.wipe[0]) / 30);
  const tr = al.tracks[0];
  const p = playSec / tr.sec;
  const eq = (k: number) => 0.25 + 0.75 * Math.abs(Math.sin(f * [0.31, 0.47, 0.23][k] + k * 1.7));
  return (
    <section className="detail on" aria-hidden="true"
      style={{ visibility: "visible", clipPath: wt >= 1 ? "none" : `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`, ["--bg" as any]: al.pal.bg, ["--ink" as any]: al.pal.ink, ["--d" as any]: al.pal.d, ["--flash" as any]: clamp(flash, 0, 1).toFixed(3) }}>
      <div className="d-num">{al.cat.slice(4)}</div>
      <div className="d-top">
        <button className="back-btn">× Back to the shelf</button>
        <div className="d-brand mono"><span>Dhun Records</span><span className="rule"></span><b>{al.cat}</b></div>
      </div>
      <div className="d-body">
        <div className="d-text">
          <p className="d-kicker mono" style={rv(0)}><i></i><span>{`${al.genre} · ${al.langName} · ${al.year}`}</span></p>
          <p className="d-artist" style={rv(1)}>{al.artist}</p>
          <h1 className="d-title"><span style={{ transform: `translateY(${((1 - tT) * 108).toFixed(2)}%)` }}>{al.title}</span></h1>
          <p className="d-meta mono" style={rv(3)}>{`${al.tracks.length} tracks / ${al.mins} min / compact disc`}</p>
          <p className="d-blurb" style={rv(4)}>{al.blurb}</p>
          <ol className="d-tracks" style={rv(5)}>
            {al.tracks.map((t: any, i: number) => (
              <li key={i}>
                <button className={"trk" + (i === 0 ? " on" : "")}>
                  <span className="t-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="t-eq">{[0, 1, 2].map((k) => <i key={k} style={{ transform: `scaleY(${eq(k).toFixed(3)})` }} />)}</span>
                  <span className="t-name">{t.name}</span>
                  <span className="t-dur">{fmt(t.sec)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="d-hero">
          <div className="hero-shadow"></div>
          <div className="hero-box" style={{ transform: `translateX(-25%) rotateY(${lerp(-42, -15, hb).toFixed(2)}deg) rotateX(${lerp(4, 3, hb).toFixed(2)}deg) scale(${lerp(0.82, 1, hb).toFixed(4)})` }}>
            <div className="hero-back"></div>
            <div className="hero-disc" style={{ transform: `translateX(${(hd * 50).toFixed(2)}%)` }}><SpinDisc al={al} f={f} /></div>
            <div className="hero-edge"></div>
            <div className="cover" style={{ backgroundImage: al.coverUrl }} dangerouslySetInnerHTML={html(coverText(al))} />
          </div>
        </div>
      </div>
      <div className="player">
        <div className="p-transport">
          <button className="p-btn" dangerouslySetInnerHTML={html(ICON.prev)} />
          <button className="p-btn p-play" dangerouslySetInnerHTML={html(ICON.pause)} />
          <button className="p-btn" dangerouslySetInnerHTML={html(ICON.next)} />
        </div>
        <div className="p-now">
          <span className="p-title">{tr.name}</span>
          <span className="p-sub mono">{`01 / ${String(al.tracks.length).padStart(2, "0")} · ${al.artist}`}</span>
        </div>
        <div className="p-seek">
          <span>{fmt(playSec)}</span>
          <input className="rng" type="range" min={0} max={1000} value={Math.round(p * 1000)} readOnly style={{ ["--p" as any]: (p * 100).toFixed(2) + "%" }} />
          <span>{fmt(tr.sec)}</span>
        </div>
        <div className="p-vol">
          <button className="p-btn" dangerouslySetInnerHTML={html(ICON.vol)} />
          <input className="rng" type="range" min={0} max={100} value={70} readOnly style={{ ["--p" as any]: "70%" }} />
        </div>
      </div>
    </section>
  );
};
