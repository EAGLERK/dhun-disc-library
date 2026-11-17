// Per-format layout. App coordinates are the site's own CSS pixels, measured from the
// live page at 1440x900 (desktop) and 390x780 (phone). The window is drawn with CSS zoom
// so text and the 3D shelf stay sharp at output resolution.
export type Box = { x: number; y: number; w: number; h: number };
export type Layout = {
  kind: "desk" | "mob";
  out: { w: number; h: number };
  app: { w: number; h: number; zoom: number; left: number; top: number; radius: number };
  stage: Box;
  lang: Box;
  timeline: Box;
  stops: { cx: number; cy: number }[];
  caption: { y: number; size: number };
  list: { side: number; hH: number; rH: number; thumb: number; pad: number };
  menu: { w: number; item: number };
  end: { logoH: number; tagSize: number; ctaSize: number; logoY: number };
};

export const DESK: Layout = {
  kind: "desk",
  out: { w: 1920, h: 1080 },
  app: { w: 1440, h: 900, zoom: 0.92, left: (1920 - 1440 * 0.92) / 2, top: 196, radius: 22 },
  stage: { x: 0, y: 74, w: 1440, h: 644.9 },
  lang: { x: 1214, y: 24.5, w: 190, h: 39 },
  timeline: { x: 36, y: 810, w: 1368, h: 72 },
  stops: [476.9, 569.3, 661.6, 754, 846.3, 938.6, 1031].map((cx) => ({ cx, cy: 53.5 })),
  caption: { y: 104, size: 66 },
  list: { side: 232, hH: 168, rH: 62, thumb: 44, pad: 32 },
  menu: { w: 220, item: 40 },
  end: { logoH: 150, tagSize: 46, ctaSize: 20, logoY: -70 },
};

export const MOB: Layout = {
  kind: "mob",
  out: { w: 1080, h: 1920 },
  app: { w: 390, h: 780, zoom: 1.95, left: (1080 - 390 * 1.95) / 2, top: 292, radius: 40 },
  stage: { x: 0, y: 138.2, w: 390, h: 457.7 },
  lang: { x: 216, y: 16, w: 158, h: 37 },
  timeline: { x: 16, y: 706, w: 358, h: 64 },
  stops: [25, 81.7, 138.3, 195, 251.7, 308.3, 365].map((cx) => ({ cx, cy: 117.7 })),
  caption: { y: 168, size: 68 },
  list: { side: 0, hH: 150, rH: 66, thumb: 48, pad: 16 },
  menu: { w: 200, item: 40 },
  end: { logoH: 190, tagSize: 58, ctaSize: 26, logoY: -120 },
};
