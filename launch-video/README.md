# Dhun launch video

30-second launch film for Dhun, built in code with [Remotion](https://www.remotion.dev).
Two cuts render from the same scenes: 16:9 (1920 × 1080) and 9:16 (1080 × 1920), 30 fps.

The UI in the video is the real site: its CSS, catalogue, cover art and disc art are ported
from `index.html` in the repo root, and the soundtrack is rendered by the site's own audio engine.

## Storyboard

Full storyboard with frames from both cuts: [`Dhun-launch-storyboard.pdf`](Dhun-launch-storyboard.pdf).

| Scene | Time | Frames | What happens |
|---|---|---|---|
| 1 · Hook | 0–3 s | 0–90 | A grey music list scrolls. "Thousands of songs." "One endless list." |
| 2 · Problem | 3–7 s | 90–210 | Three flicks blur the list. "Scroll. Scroll. Scroll." Rows tip upright into coloured spines. |
| 3 · The shelf | 7–17 s | 210–510 | Shelf reveal on the drop, year drag 1962 → 2021 ("Sixty years. One drag."), genre → Film, language → Tamil. |
| 4 · Payoff | 17–21.5 s | 510–645 | Click the front case, the CD slides out spinning, the album page plays a 30-second preview with the Apple Music link. |
| 5 · Your music | 21.5–26 s | 645–780 | Back to the shelf. A music folder is dropped in (phone: the + button), files are read, four albums land under "My music". |
| 6 · Logo + CTA | 26–30 s | 780–900 | Dhun mark builds, "Real albums. Your music. One shelf.", "Open the shelf". |

Album covers in the video are invented on purpose: no label artwork in an advert. The layout, genres,
languages and 1955–2024 timeline match the live site. The storyboard PDF matches this cut (v2).

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
