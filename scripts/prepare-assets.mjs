import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = "assets/portfolio/media";
await mkdir(directory, { recursive: true });
const poster = join(tmpdir(), "portfolio-ssp-poster.png");
execFileSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-ss",
  "2",
  "-i",
  "publications/static/videos/ssp_banner_video.mp4",
  "-frames:v",
  "1",
  poster,
]);
const sources = {
  hero: {
    source: poster,
    crop: { left: 640, top: 0, width: 640, height: 368 },
  },
  ssp: { source: poster },
  multifly: { source: "images/MultiFly/banner.png" },
  voxelfix: { source: "images/VoxelFix/overview.png" },
  "voxel-detail": { source: "images/VoxelFix/id-qualitative.png" },
  missionbench: { source: "images/MissionBench/missionbench_intro.png" },
  flexpath: { source: "images/FlexPath/method_overview.png" },
  "archive-control": { source: "images/Fault-Tolerant UAV Controller.gif" },
  "archive-planning": { source: "images/UAV Path Planning with DL.gif" },
  "archive-driving": { source: "images/Autonomous Driving.gif" },
  "archive-mesh": { source: "images/Area Mesh Generation.gif" },
};
for (const [name, asset] of Object.entries(sources)) {
  for (const width of [640, 1280]) {
    let pipeline = sharp(asset.source, { page: 0 }).flatten({
      background: "#ffffff",
    });
    if (asset.crop) pipeline = pipeline.extract(asset.crop);
    // Preserve the complete figure and its aspect ratio. No scientific edits.
    pipeline = pipeline.resize({ width });
    await Promise.all([
      pipeline
        .clone()
        .webp({ quality: 85 })
        .toFile(`${directory}/${name}-${width}.webp`),
      pipeline
        .clone()
        .avif({ quality: 55, effort: 5 })
        .toFile(`${directory}/${name}-${width}.avif`),
    ]);
  }
}
const xml = Buffer.from(
  `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#112322"/><text x="65" y="83" fill="#a6d4b3" font-family="Helvetica,Arial,sans-serif" font-size="20">ROBOTIC PERCEPTION · 3D MAPPING · AERIAL AUTONOMY</text><text x="65" y="230" fill="#f4f6ee" font-family="Helvetica,Arial,sans-serif" font-size="82" letter-spacing="-4">Taehyoung Kim.</text><text x="65" y="305" fill="#c8d8ca" font-family="Helvetica,Arial,sans-serif" font-size="28">From pixels to autonomous decisions.</text><text x="65" y="550" fill="#c8d8ca" font-family="Helvetica,Arial,sans-serif" font-size="18">Research Engineer · Fraunhofer IVI</text></svg>`,
);
const image = await sharp(`${directory}/hero-640.webp`)
  .resize(370, 212)
  .toBuffer();
await sharp(xml)
  .composite([{ input: image, left: 765, top: 370 }])
  .jpeg({ quality: 90 })
  .toFile(`${directory}/social.jpg`);
const sizes = {};
for (const name of Object.keys(sources))
  sizes[name] = await sharp(`${directory}/${name}-1280.webp`)
    .metadata()
    .then(({ width, height }) => ({ width, height }));
await writeFile(
  `${directory}/dimensions.json`,
  `${JSON.stringify(sizes, null, 2)}\n`,
);
console.log("Prepared faithful responsive derivatives and social preview.");
