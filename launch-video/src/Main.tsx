import React, { useState } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, delayRender, continueRender, Sequence } from "remotion";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/bricolage-grotesque/500.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "./site/site.css";
import "./site/overrides.css";
import cfg from "./config.json";
import { Layout } from "./layout";
import { prog, eout, ein, track, lerp } from "./anim";
import { ListApp } from "./ListApp";
import { DhunApp } from "./DhunApp";
import { Cursor } from "./Cursor";
import { Captions } from "./Captions";
import { EndCard } from "./EndCard";

const B = cfg.beats;
const FONTS = [
  '400 16px "Instrument Sans"', '500 16px "Instrument Sans"', '600 16px "Instrument Sans"', '700 16px "Instrument Sans"',
  '400 16px "DM Mono"', '500 16px "DM Mono"',
  '500 16px "Bricolage Grotesque"', '600 16px "Bricolage Grotesque"', '700 16px "Bricolage Grotesque"', '800 16px "Bricolage Grotesque"',
];

function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  React.useEffect(() => {
    Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
}

/** the camera lives inside the window frame: push, pull and reframe on the action */
const CAM = {
  s: [{ f: 0, v: 1 }, { f: 228, v: 1.035 }, { f: 296, v: 1 }, { f: 340, v: 1 }, { f: 372, v: 1.06 }, { f: 410, v: 1.06 }, { f: 440, v: 1 }, { f: 660, v: 1 }, { f: 764, v: 1.06 }],
  fx: [{ f: 0, v: 0.5 }, { f: 660, v: 0.5 }, { f: 764, v: 0.6 }],
  fy: [{ f: 0, v: 0.5 }, { f: 340, v: 0.5 }, { f: 372, v: 0.86 }, { f: 410, v: 0.86 }, { f: 440, v: 0.5 }, { f: 660, v: 0.5 }, { f: 764, v: 0.42 }],
};

export const Main: React.FC<{ L: Layout; withAudio?: boolean }> = ({ L, withAudio = true }) => {
  useFonts();
  const f = useCurrentFrame();
  const { app } = L;
  const fw = app.w * app.zoom, fh = app.h * app.zoom;

  // window enters at the start, leaves before the end card
  const winIn = eout(prog(f, 0, 14));
  const winOut = ein(prog(f, B.windowOut[0], B.windowOut[1]));
  const showWin = f < B.windowOut[1] + 1;
  const s = track(CAM.s, f) * (1 + 0.004 * Math.sin(f / 40));
  const fx = track(CAM.fx, f), fy = track(CAM.fy, f);

  const listOp = 1 - prog(f, B.crossfade[0], B.crossfade[1]);
  const appOp = prog(f, B.crossfade[0], B.crossfade[1]);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 28%, #eef0ee 0%, #e2e4e2 55%, #d3d6d4 100%)", fontFamily: "var(--font-body)" }}>
      <Captions f={f} L={L} />
      {showWin && (
        <div style={{ position: "absolute", left: app.left, top: app.top, width: fw, height: fh, borderRadius: app.radius * app.zoom, overflow: "hidden",
          background: "#e8e9e7", boxShadow: "0 50px 90px -40px rgba(20,22,26,.45), 0 18px 40px -24px rgba(20,22,26,.3), 0 0 0 1px rgba(20,22,26,.07)",
          opacity: winIn * (1 - winOut), transform: `translateY(${((1 - winIn) * 30 + winOut * 40).toFixed(2)}px) scale(${(lerp(0.97, 1, winIn) * (1 - 0.08 * winOut)).toFixed(4)})` }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${s.toFixed(4)})`, transformOrigin: `${(fx * 100).toFixed(2)}% ${(fy * 100).toFixed(2)}%` }}>
            <div className={"dhun-root " + (L.kind === "desk" ? "dk" : "mob")} style={{ zoom: app.zoom, width: app.w, height: app.h } as any}>
              {f < B.crossfade[1] && <ListApp f={f} L={L} opacity={listOp} />}
              {f >= B.crossfade[0] && <DhunApp f={f} L={L} opacity={appOp} />}
              <Cursor f={f} L={L} />
            </div>
          </div>
        </div>
      )}
      <EndCard f={f} L={L} />
      {withAudio && <Audio src={staticFile("soundtrack.wav")} />}
    </AbsoluteFill>
  );
};
