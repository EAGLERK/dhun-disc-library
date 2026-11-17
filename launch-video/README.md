# Dhun launch video

30-second launch film for Dhun, built in code with [Remotion](https://www.remotion.dev).
Two cuts render from the same scenes: 16:9 (1920 × 1080) and 9:16 (1080 × 1920), 30 fps.

The UI in the video is the real site: its CSS, catalogue, cover art and disc art are ported
from `index.html` in the repo root, and the soundtrack is rendered by the site's own audio engine.

## Storyboard

Full storyboard with frames from both cuts: [`Dhun-launch-storyboard.pdf`](Dhun-launch-storyboard.pdf).

| Scene | Time | Frames | What happens |
|---|---|---|---|
| 1 · Hook | 0–3.5 s | 0–105 | A grey music list scrolls. "Thousands of songs." "One endless list." |
| 2 · Problem | 3.5–8 s | 105–240 | Three flicks blur the list. "Scroll. Scroll. Scroll." Rows tip upright into coloured spines. |
| 3 · The shelf | 8–20 s | 240–600 | Shelf reveal, then year scrub, genre (Jazz) and language (Tamil). |
| 4 · Payoff | 20–25.5 s | 600–765 | Click the front case, the CD slides out spinning, the album page opens and plays. |
| 5 · Logo + CTA | 25.5–30 s | 765–900 | Dhun mark builds, tagline, "Open the shelf". |

## Edit

All copy and timing lives in `src/config.json` (captions, tagline, CTA, beat frames).
Layout per format lives in `src/layout.ts`.

## Render

```bash
npm install
npm run studio          # preview and scrub in the browser
npm run render:16x9     # out/dhun-launch-16x9.mp4
npm run render:9x16     # out/dhun-launch-9x16.mp4
```

`remotion.config.ts` points Remotion at a system Chrome (`/usr/bin/google-chrome`).
Remove that line on a machine where Remotion can download its own browser.

To rebuild the soundtrack after changing beat frames: `cd audio && node build.mjs`
(needs Playwright and Chrome).
