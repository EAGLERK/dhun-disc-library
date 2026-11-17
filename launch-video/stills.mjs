import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const [,, comp, framesArg, outDir="out/stills"] = process.argv;
const frames = framesArg.split(",").map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const opts = { serveUrl, browserExecutable: "/usr/bin/google-chrome", chromiumOptions: { gl: "swangle" } };
const composition = await selectComposition({ ...opts, id: comp, inputProps: {} });
for (const frame of frames) {
  const t0 = Date.now();
  await renderStill({ ...opts, composition, frame, output: `${outDir}/${comp}-${String(frame).padStart(3,"0")}.jpg`, imageFormat: "jpeg", jpegQuality: 85 });
  console.log(comp, frame, (Date.now()-t0)+"ms");
}
