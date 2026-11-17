// Builds catalog.json for the Dhun shelf from data/albums.json using Apple's iTunes Search API.
// Runs on GitHub Actions (see .github/workflows/catalog.yml). Needs Node 20+ and `sharp` for spine colours.
//   node scripts/build-catalog.mjs
import fs from "node:fs/promises";

const SRC = new URL("../data/albums.json", import.meta.url);
const OUT = new URL("../catalog.json", import.meta.url);
const REPORT = new URL("../catalog-report.md", import.meta.url);
const GAP_MS = 4000;          // Apple allows roughly 20 requests a minute per IP; stay well under it
const MAX_TRACKS = 14;

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not installed: spine colours fall back to a neutral palette"); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// strip edition tags Apple appends: "(Original Motion Picture Soundtrack)", "[Deluxe Edition]", " - EP", "-30th Anniversary Edition-", "(feat. …)"
const EDITION = /(original|motion picture|soundtrack|background score|\bscore\b|music from|deluxe|remaster|expanded|legacy|anniversary|bonus|edition|version|feat\.|\bft\.|リマスター|バージョン|記念|デラックス|エディション)/i;
function tidyTitle(s) {
  let t = String(s).trim(), prev;
  do {
    prev = t;
    t = t.replace(/\s+-\s+(EP|Single)$/i, "")
         .replace(/\s*-[^-]*(anniversary|edition|remaster)[^-]*-\s*$/i, "")
         .replace(/\s*[\(\[]([^\)\]]*)[\)\]]\s*$/, (m, inner) => (EDITION.test(inner) ? "" : m));
  } while (t !== prev && t);
  return t.trim() || String(s).trim();
}
const squash = (s) => norm(s).replace(/\s+/g, "");
const OTHER_LANGS = ["tamil", "telugu", "hindi", "malayalam", "kannada", "marathi", "bengali", "punjabi"];
const LANG_WORD = { ta: "tamil", hi: "hindi" };

let last = 0;
itunes.lookup = (params) => itunes(params, "lookup");
async function itunes(params, endpoint = "search") {
  const url = `https://itunes.apple.com/${endpoint}?` + new URLSearchParams(params);
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": "dhun-catalog-builder/1.0" } });
    if (res.ok) {
      const results = (await res.json()).results || [];
      if (results.length || attempt > 0 || endpoint !== "search") return results;
      console.warn("  empty result, retrying once");
      await sleep(10000);
      continue;
    }
    console.warn(`  HTTP ${res.status}, backing off`);
    await sleep(20000 * (attempt + 1));
  }
  throw new Error("iTunes search failed: " + url);
}

// A match needs the exact title (after edition tags are stripped) AND the artist. Score >= 8 passes.
function scoreCollection(c, want) {
  const a = squash(tidyTitle(c.collectionName)), w = squash(tidyTitle(want.album));
  const ar = squash(c.artistName), wa = squash(want.artist);
  let s = 0;
  if (a === w) s += 6; else if (a.includes(w)) s += 1; else return -1;
  if (ar.includes(wa) || wa.includes(ar)) s += 3;
  else if (norm(want.artist).split(" ").some((p) => p.length > 3 && ar.includes(p))) s += 2;
  const name = (c.collectionName + " " + c.artistName).toLowerCase();
  const wantName = want.album.toLowerCase();
  for (const bad of ["karaoke", "tribute", "cover", "lullaby", "8 bit", "8-bit", "piano renditions", "lofi", "lo-fi", "slowed", "reverb", "remix", "instrumental", "- single", "live", "dialogue"])
    if (name.includes(bad) && !wantName.includes(bad)) s -= 6;
  for (const lw of OTHER_LANGS) if (lw !== LANG_WORD[want.lang] && new RegExp(`[\\(\\[]\\s*${lw}\\s*[\\)\\]]`, "i").test(c.collectionName)) s -= 10;
  if ((c.trackCount || 0) <= 2) s -= 3;
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

// Apple's release year is used when it agrees with the curated year to within one year;
// a bigger gap means Apple lists a reissue, so the original year stands.
const yearFor = (curated, appleDate) => { const y = +(appleDate || "").slice(0, 4); return y && Math.abs(y - curated) <= 1 ? y : curated; };
const src = JSON.parse(await fs.readFile(SRC, "utf8"));
const albums = [], missed = [], report = [];
for (const [i, want] of src.albums.entries()) {
  process.stdout.write(`[${i + 1}/${src.albums.length}] ${want.artist} — ${want.album} … `);
  const cc = want.cc || "us";
  const ranked = [];
  const best = (rows) => {
    let pick = null, sc = -99;
    for (const c of rows) {
      // prefer the plain original over deluxe/anniversary editions when both match
      const v = scoreCollection(c, want) + Math.min(c.trackCount || 0, 12) * 0.02 - (tidyTitle(c.collectionName) !== c.collectionName.trim() && !/soundtrack|score/i.test(c.collectionName) ? 0.3 : 0);
      if (v >= 8 && !ranked.some((r) => r.c.collectionId === c.collectionId)) ranked.push({ c, v });
      if (v > sc) { sc = v; pick = c; }
    }
    return { pick, sc };
  };
  // three ways in, stopping at the first exact match: album search, song search, album-only search
  const fromSongs = (rows) => {
    const m = new Map();
    for (const r of rows) if (r.wrapperType === "track" && r.kind === "song" && !m.has(r.collectionId))
      m.set(r.collectionId, { collectionId: r.collectionId, collectionName: r.collectionName, artistName: r.collectionArtistName || r.artistName, trackCount: r.trackCount });
    return [...m.values()];
  };
  const tries = [
    async () => best(await itunes({ term: `${want.artist} ${want.album}`, media: "music", entity: "album", limit: "50", country: cc })),
    async () => best(fromSongs(await itunes({ term: `${want.artist} ${want.album}`, media: "music", entity: "song", limit: "100", country: cc }))),
    async () => best(await itunes({ term: tidyTitle(want.album), media: "music", entity: "album", limit: "50", country: cc })),
  ];
  let found = { pick: null, sc: -99 };
  try {
    for (const t of tries) { const r = await t(); if (r.sc > found.sc) found = r; if (found.sc >= 8) break; }
  } catch (e) { console.log("error"); missed.push({ ...want, why: e.message }); continue; }
  if (!found.pick || found.sc < 8) { console.log("not found"); missed.push({ ...want, why: found.pick ? `best match too weak (${found.pick.collectionName} / ${found.pick.artistName})` : "no results" }); continue; }
  // when the list names a song, take the first good match that actually contains it (dubs share titles)
  ranked.sort((a, b) => b.v - a.v);
  const cands = want.track ? ranked.slice(0, 4).map((r) => r.c) : [found.pick];
  let rows = null;
  try {
    for (const cand of cands) {
      const r = await itunes.lookup({ id: String(cand.collectionId), entity: "song", limit: "200", country: cc });
      if (!want.track || r.some((t) => t.wrapperType === "track" && squash(t.trackName).includes(squash(want.track)))) { rows = r; break; }
    }
  } catch (e) { console.log("lookup error"); missed.push({ ...want, why: e.message }); continue; }
  if (!rows) { console.log("song not found"); missed.push({ ...want, why: `no version on Apple contains "${want.track}"` }); continue; }
  const c = rows.find((r) => r.wrapperType === "collection") || found.pick;
  if (albums.some((x) => x.id === "it" + c.collectionId)) { console.log("duplicate"); missed.push({ ...want, why: `same Apple album as an earlier entry (${c.collectionName})` }); continue; }
  const pick = rows.filter((r) => r.wrapperType === "track" && r.kind === "song");
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
    artist: c.artistName, year: yearFor(want.year, c.releaseDate), appleYear: +(c.releaseDate || "").slice(0, 4) || null,
    genre: want.genre, lang: want.lang,
    art, url: (c.collectionViewUrl || "").split("?")[0],
    copyright: c.copyright || "", trackCount: c.trackCount || tracks.length,
    bg: col.bg, ink: col.ink, tracks,
  });
  report.push(`| ${want.artist} — ${want.album} | ${c.artistName} — ${c.collectionName} | ${yearFor(want.year, c.releaseDate)} (Apple ${(c.releaseDate || "").slice(0, 4)}) | ${tracks.length} |`);
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
