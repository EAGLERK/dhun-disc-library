export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (f: number, a: number, b: number) => clamp((f - a) / (b - a), 0, 1);
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** ease-in-out cubic: all camera moves and travels */
export const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const eout = (t: number) => 1 - Math.pow(1 - t, 3);
export const eout5 = (t: number) => 1 - Math.pow(1 - t, 5);
export const ein = (t: number) => t * t * t;
/** entrance with a slight overshoot, matches cubic-bezier(.34,1.56,.64,1) */
export const back = (t: number, s = 1.56) => {
  const c3 = s + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
export const eioBack = (t: number, s = 0.9) => {
  const c2 = s * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};
/** cubic-bezier(.2,.8,.2,1), the site's reveal curve, approximated */
export const site = (t: number) => 1 - Math.pow(1 - t, 3.6);

/** keyframe track: [{f, v}] eased with ease-in-out between keys */
export function track(keys: { f: number; v: number }[], f: number) {
  if (f <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) {
      const a = keys[i - 1], b = keys[i];
      return lerp(a.v, b.v, eio(prog(f, a.f, b.f)));
    }
  }
  return keys[keys.length - 1].v;
}

/** press: 1 -> .96 -> 1 over 8 frames */
export const press = (f: number, at: number) => {
  const t = f - at;
  if (t < 0 || t > 8) return 1;
  return t < 3 ? lerp(1, 0.96, eout(t / 3)) : lerp(0.96, 1, eout((t - 3) / 5));
};
