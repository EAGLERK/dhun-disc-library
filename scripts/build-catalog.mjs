// Builds catalog.json for the Dhun shelf from data/albums.json using Apple's iTunes Search API.
// Runs on GitHub Actions (see .github/workflows/catalog.yml). Needs Node 20+ and `sharp` for spine colours.
//   node scripts/build-catalog.mjs
import fs from "node:fs/promises";

const SRC = new URL("../data/albums.json", import.meta.url);
const OUT = new URL("../catalog.json", import.meta.url);
const REPORT = new URL("../catalog-report.md", import.meta.url);
const GAP_MS = 3200;          // Apple allows roughly 20 requests a minute per IP
const MAX_TRACKS = 14;

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not installed: spine colours fall back to a neutral palette"); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tidyTitle = (s) => s.replace(/\s*[\(\[](original (motion picture )?soundtrack|music from[^)\]]*|deluxe[^)\]]*|remaster[^)\]]*|\d{4} remaster[^)\]]*|expanded[^)\]]*|legacy[^)\]]*|anniversary[^)\]]*|bonus[^)\]]*)[\)\]]\s*$/i, "").trim();

let last = 0;
async function itunes(params) {
  const url = "https://itunes.apple.com/search?" + new URLSearchParams(params);
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": "dhun-catalog-builder/1.0" } });
    if (res.ok) return (await res.json()).results || [];
    console.warn(`  HTTP ${res.status}, backing off`);
    await sleep(20000 * (attempt + 1));
  }
  throw new Error("iTunes search failed: " + url);
}

function scoreCollection(c, want) {
  const a = norm(c.collectionName), w = norm(want.album), ar = norm(c.artistName), wa = norm(want.artist);
  let s = 0;
  if (a === w) s += 6; else if (a.startsWith(w + " ") || a.startsWith(w)) s += 4; else if (a.includes(w)) s += 2; else return -1;
  if (ar.includes(wa) || wa.includes(ar)) s += 3;
  else if (wa.split(" ").some((p) => p.length > 2 && ar.includes(p))) s += 1;
  if (/karaoke|tribute|cover|instrumental version|lullaby|8 bit|piano renditions/i.test(c.collectionName + " " + c.artistName)) s -= 8;
  if (/live|remix|acoustic/i.test(c.collectionName) && !/live|remix|acoustic/i.test(want.album)) s -= 2;
  return s;
}

async function spineColours(artUrl) {
  const fallback = { bg: "#3a3d42", ink: "#f3f3f1" };
  if (!sharp) return fallback;
  try {
    const buf = Buffer.from(await (await fetch(artUrl.replace(/\d+x\d+bb/, "60x60bb"))).arrayBuffer());
    const { data } = await sharp(buf).removeAlpha().resize(12, 12, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let ar = 0, ag = 0, ab = 0, best = null, bestScore = -1;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      ar += r; ag += g; ab += b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
      const score = sat * 0.65 + (1 - Math.abs(l - 0.45) * 2) * 0.35;
      if (score > bestScore) { bestScore = score; best = [r, g, b]; }
    }
    const n = data.length / 3, avg = [ar / n, ag / n, ab / n];
    const mix = best.map((v, i) => v * 0.7 + avg[i] * 0.3);
    const hex = "#" + mix.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
    const lum = 0.2126 * mix[0] + 0.7152 * mix[1] + 0.0722 * mix[2];
    return { bg: hex, ink: lum > 0.55 ? "#14161a" : "#f6f5f2" };
  } catch (e) {
    return fallback;
  }
}

const src = JSON.parse(await fs.readFile(SRC, "utf8"));
const albums = [], missed = [], report = [];
for (const [i, want] of src.albums.entries()) {
  process.stdout.write(`[${i + 1}/${src.albums.length}] ${want.artist} — ${want.album} … `);
  let songs = [];
  try {
    songs = await itunes({ term: `${want.artist} ${want.album}`, media: "music", entity: "song", limit: "100", country: want.cc || "us" });
    if (!songs.length) songs = await itunes({ term: want.album, media: "music", entity: "song", limit: "100", country: want.cc || "us" });
  } catch (e) { console.log("error"); missed.push({ ...want, why: e.message }); continue; }
  const byCol = new Map();
  for (const s of songs) if (s.wrapperType === "track" && s.kind === "song") {
    if (!byCol.has(s.collectionId)) byCol.set(s.collectionId, []);
    byCol.get(s.collectionId).push(s);
  }
  let pick = null, pickScore = -1;
  for (const list of byCol.values()) {
    const sc = scoreCollection(list[0], want) + Math.min(list.filter((t) => t.previewUrl).length, 10) * 0.15;
    if (sc > pickScore) { pickScore = sc; pick = list; }
  }
  if (!pick || pickScore < 3) { console.log("not found"); missed.push({ ...want, why: pick ? `best match too weak (${pick[0].collectionName} / ${pick[0].artistName})` : "no results" }); continue; }
  const c = pick[0];
  const tracks = pick.filter((t) => t.previewUrl)
    .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))
    .slice(0, MAX_TRACKS)
    .map((t) => ({ name: t.trackName, ms: t.trackTimeMillis || 0, preview: t.previewUrl, n: t.trackNumber }));
  if (!tracks.length) { console.log("no previews"); missed.push({ ...want, why: "album found but no previews" }); continue; }
  const art = (c.artworkUrl100 || "").replace(/\d+x\d+bb/, "600x600bb");
  const col = await spineColours(art);
  albums.push({
    id: "it" + c.collectionId,
    title: tidyTitle(c.collectionName), fullTitle: c.collectionName,
    artist: c.artistName, year: want.year, appleYear: +(c.releaseDate || "").slice(0, 4) || null,
    genre: want.genre, lang: want.lang,
    art, url: (c.collectionViewUrl || "").split("?")[0],
    copyright: c.copyright || "", trackCount: c.trackCount || tracks.length,
    bg: col.bg, ink: col.ink, tracks,
  });
  report.push(`| ${want.artist} — ${want.album} | ${c.artistName} — ${c.collectionName} | ${want.year} (${(c.releaseDate || "").slice(0, 4)}) | ${tracks.length} |`);
  console.log(`ok: ${c.collectionName} (${tracks.length} previews)`);
}

albums.sort((a, b) => a.year - b.year || a.artist.localeCompare(b.artist));
const catalog = {
  generated: new Date().toISOString(),
  source: "Apple Music previews via the iTunes Search API",
  genres: src.genres, languages: src.languages, albums,
};
await fs.writeFile(OUT, JSON.stringify(catalog));
await fs.writeFile(REPORT, [
  `# Catalog report`, ``, `Generated ${catalog.generated}. Matched ${albums.length} of ${src.albums.length} albums.`, ``,
  `## Matched`, ``, `| Wanted | Apple match | Year (Apple) | Previews |`, `|---|---|---|---|`, ...report, ``,
  `## Missed`, ``, ...(missed.length ? missed.map((m) => `- ${m.artist} — ${m.album} (${m.cc}): ${m.why}`) : ["None."]), ``,
].join("\n"));
console.log(`\nDone: ${albums.length} albums, ${missed.length} missed.`);
