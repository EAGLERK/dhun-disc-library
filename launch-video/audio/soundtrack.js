// Injected into the Dhun audio engine just before `return api;`. Has access to the engine's
// private voices (V, N, kick, clap, bell, ...), the Electronic arranger G, makeSong and graph.
api.soundtrack = async (P) => {
  const SR = 44100, SECS = P.duration / P.fps;
  const fr2s = (f) => f / P.fps;
  const oc = new OfflineAudioContext(2, Math.round(SR * SECS), SR);
  graph(oc);
  // global filter after the master: muffled "before", opens on the shelf reveal
  master.disconnect();
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.9;
  const out = ctx.createGain();
  master.connect(lp); lp.connect(out); out.connect(ctx.destination);
  master.gain.value = 1;
  const drop = fr2s(P.beats.crossfade[0] + 10); // 8.0 s, bar 4
  lp.frequency.setValueAtTime(700, 0);
  lp.frequency.setValueAtTime(700, drop - 2.2);
  lp.frequency.exponentialRampToValueAtTime(5200, drop - 0.05);
  lp.frequency.setValueAtTime(18000, drop);
  const end = SECS;
  // the muffled "before" sits ~6 dB under the drop so the shelf reveal lands
  out.gain.setValueAtTime(0.95, 0);
  out.gain.setValueAtTime(0.95, 3.8);
  out.gain.linearRampToValueAtTime(0.5, 4.0);
  out.gain.setValueAtTime(0.5, drop - 0.6);
  out.gain.linearRampToValueAtTime(0.62, drop - 0.02);
  out.gain.setValueAtTime(1, drop);
  out.gain.setValueAtTime(1, end - 1.1);
  out.gain.linearRampToValueAtTime(0, end - 0.05);

  // music: an Electronic track from the catalogue, locked to 120 bpm so bars land on scene cuts
  const al = ALL.find((a) => a.genre === "Electronic" && a.title === P.trackFrom) || ALL.find((a) => a.genre === "Electronic");
  const S = makeSong(al, 0);
  S.tempo = 120; S.step = 0.125; S.bar = 2; S.bars = 16; S.steps = 240; S.brk0 = 999;
  bus = makeBus();
  dly.delayTime.value = S.step * 3;
  const stopAt = fr2s(P.beats.windowOut[0]);
  for (let st = 0; st * S.step < stopAt - 0.01; st++) {
    G.Electronic(S, Math.floor(st / 16), st % 16, st * S.step, bus);
  }
  const D = bus.dry, Wt = bus.wet, Sp = bus.space;

  // ---- sound design helpers ----
  const sweep = (t, dur, f0, f1, peak, type = "bandpass", q = 1.2, dest = Wt) => {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  };
  const click = (t, p = 0.22, hz = 2400) => { V({ f: hz, t, dur: 0.006, peak: p, a: 0.001, r: 0.012, dest: D }); N({ t, dur: 0.008, peak: p * 0.6, f: 5000, dest: D }); };
  const boom = (t, p = 0.7) => {
    kick(t, D, 0.95);
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.frequency.setValueAtTime(70, t); os.frequency.exponentialRampToValueAtTime(38, t + 0.6);
    g.gain.setValueAtTime(p, t); g.gain.setTargetAtTime(0, t + 0.05, 0.35); os.connect(g); g.connect(D); os.start(t); os.stop(t + 2.5);
    sweep(t, 1.6, 9000, 3000, 0.16, "highpass", 0.7, Wt);
  };
  const fr = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // hook/problem: three scroll flicks
  for (const f of P.beats.flicks) sweep(fr2s(f), 0.32, 3200, 500, 0.32, "bandpass", 1.4, D);
  // riser into the drop
  sweep(drop - 2.4, 2.4, 300, 7000, 0.22, "bandpass", 0.8, Wt);
  { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sine";
    os.frequency.setValueAtTime(220, drop - 2.4); os.frequency.exponentialRampToValueAtTime(880, drop);
    g.gain.setValueAtTime(0, drop - 2.4); g.gain.linearRampToValueAtTime(0.05, drop - 0.1); g.gain.linearRampToValueAtTime(0, drop);
    os.connect(g); g.connect(Sp); os.start(drop - 2.4); os.stop(drop + 0.05); }
  boom(drop, 0.6);

  // year scrub: grab, a tick for every disc that passes, release
  const B = P.beats;
  click(fr2s(B.yearGrab), 0.24);
  const n = P.scrubTicks;
  for (let k = 1; k < n; k++) {
    // invert ease-in-out cubic so ticks bunch where the shelf moves fastest
    const y = k / n, x = y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) / 4);
    const t = fr2s(B.yearDrag[0] + x * (B.yearDrag[1] - B.yearDrag[0]));
    click(t, 0.07, 3400 + (k % 3) * 300);
  }
  click(fr2s(B.yearRelease), 0.16, 1800);
  // genre + language
  click(fr2s(B.genreClick), 0.24);
  sweep(fr2s(B.genreFilter[0]), 0.55, 600, 2600, 0.12, "bandpass", 1, Wt);
  click(fr2s(B.langClick), 0.24);
  V({ f: 880, t: fr2s(B.menuOpen[0]), dur: 0.05, peak: 0.07, a: 0.004, r: 0.08, dest: Sp });
  V({ f: 1320, t: fr2s(B.menuOpen[0]) + 0.05, dur: 0.05, peak: 0.05, a: 0.004, r: 0.08, dest: Sp });
  click(fr2s(B.tamilClick), 0.24);
  sweep(fr2s(B.langFilter[0]), 0.55, 600, 2600, 0.12, "bandpass", 1, Wt);
  // payoff: click, disc slides out and spins up, circle wipe
  click(fr2s(B.caseClick), 0.28);
  sweep(fr2s(B.discOut[0]), 0.75, 500, 3000, 0.2, "bandpass", 1.6, Wt);
  { const t0 = fr2s(B.discOut[0]), os = ctx.createOscillator(), g = ctx.createGain(), f2 = ctx.createBiquadFilter();
    os.type = "sawtooth"; os.frequency.setValueAtTime(40, t0); os.frequency.exponentialRampToValueAtTime(150, t0 + 1.4);
    f2.type = "lowpass"; f2.frequency.value = 600;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.6); g.gain.linearRampToValueAtTime(0, t0 + 1.6);
    os.connect(f2); f2.connect(g); g.connect(D); os.start(t0); os.stop(t0 + 1.7); }
  sweep(fr2s(B.wipe[0]), 0.8, 250, 5000, 0.2, "bandpass", 0.9, Wt);
  // end card: hit, then a bell for D, h, u, n, and the CTA
  const tEnd = fr2s(B.logoD);
  boom(tEnd, 0.55);
  sweep(fr2s(B.windowOut[0]), 0.5, 4000, 400, 0.14, "bandpass", 0.9, Wt);
  const root = S.root + 24;
  [[tEnd, 0], [fr2s(B.logoLetters), 4], [fr2s(B.logoLetters + 3), 7], [fr2s(B.logoLetters + 6), 11]].forEach(([t, iv]) => bell(t, fr(root + iv), Sp, 0.11));
  // closing chord under the tagline
  [0, 7, 16, 19].forEach((iv, i) => V({ type: "triangle", f: fr(S.root + 12 + iv), t: tEnd, dur: 3.2, peak: 0.05, a: 0.4, r: 1.2, dest: Wt, lp: 2400 }));
  bell(fr2s(B.cta), fr(root + 12), Sp, 0.08);

  const buf = await oc.startRendering();
  // normalise to -1 dBFS and encode 16-bit WAV
  const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  let pk = 0; for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i]));
  const g = 0.891 / (pk || 1);
  const n2 = L.length, bytes = new ArrayBuffer(44 + n2 * 4), dv = new DataView(bytes);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); dv.setUint32(4, 36 + n2 * 4, true); ws(8, "WAVE"); ws(12, "fmt "); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true);
  dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); ws(36, "data"); dv.setUint32(40, n2 * 4, true);
  let o = 44, sq = 0;
  for (let i = 0; i < n2; i++) {
    const a = Math.max(-1, Math.min(1, L[i] * g)), b = Math.max(-1, Math.min(1, Rr[i] * g));
    sq += a * a; dv.setInt16(o, a * 32767, true); dv.setInt16(o + 2, b * 32767, true); o += 4;
  }
  let bin = ""; const u8 = new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { wav: btoa(bin), peak: pk, gain: g, rms: Math.sqrt(sq / n2), track: al.title, root: S.root };
};
