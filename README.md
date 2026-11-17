# Dhun Disc Library

A static site: `index.html` plus a favicon. No build step.

## Deploy to Vercel

Easiest: open https://vercel.com/drop and drag this whole folder onto the page.

From a terminal, inside this folder:

```bash
npx vercel --prod
```

Or push this folder to a GitHub repo and import it in Vercel
(Framework preset: Other, no build command). Every push then redeploys.

## Real music

The shelf loads `catalog.json`: real albums with 30-second previews and artwork from Apple Music
(iTunes Search API). Each album page links to the full album on Apple Music, as Apple's terms require.

- **Edit the shelf:** change `data/albums.json` (artist, album, language, genre, original year, storefront) and push.
  The GitHub Action `Build album catalog` looks every album up, then commits `catalog.json` and
  `catalog-report.md` (what matched, what was skipped). It also refreshes monthly.
- **Your own music:** the "Your music" button (or dropping a folder on the page) reads tags and covers from
  local audio files in the browser and adds them to the shelf under "My music". Files are never uploaded.
  Tags are read with [jsmediatags](https://github.com/aadsm/jsmediatags) (BSD-3-Clause), vendored in `vendor/`.
- **No catalog?** If `catalog.json` is missing, the site falls back to the demo shelf with generated music.
