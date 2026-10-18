import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const directory = "assets/portfolio/media";
const cache = await mkdtemp(join(tmpdir(), "portfolio-publication-"));
try {
  await mkdir(directory, { recursive: true });
  const flexBase =
    "https://raw.githubusercontent.com/FraunhoferIVI/FlexPath/main/resources";
  const flexPanels = [
    ["optimal", "Optimal"],
    ["obstavoidance", "Obstacle Avoidance"],
    ["semavoidance", "Semantic Avoidance"],
    ["waypoint", "Waypoint"],
  ];
  for (const [name] of flexPanels) {
    const response = await fetch(`${flexBase}/${name}.gif`);
    if (!response.ok)
      throw new Error(`FlexPath download failed: ${response.status}`);
    await writeFile(
      `${cache}/${name}.gif`,
      Buffer.from(await response.arrayBuffer()),
    );
  }
  // Put labels in the outer rails; the four maps meet with no internal strips.
  const labels = `<svg xmlns="http://www.w3.org/2000/svg" width="1488" height="930"><g text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white"><text x="116" y="244">Optimal</text><text x="1372" y="220"><tspan x="1372">Obstacle</tspan><tspan x="1372" dy="44">Avoidance</tspan></text><text x="116" y="684"><tspan x="116">Semantic</tspan><tspan x="116" dy="44">Avoidance</tspan></text><text x="1372" y="708">Waypoint</text></g></svg>`;
  await sharp(Buffer.from(labels)).png().toFile(`${cache}/flexpath-labels.png`);
  const panelFilters = flexPanels.map(
    (_, i) => `[${i}:v]fps=12,setpts=PTS-STARTPTS,crop=512:464:0:0[p${i}]`,
  );
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    ...flexPanels.flatMap(([name]) => [
      "-stream_loop",
      "-1",
      "-i",
      `${cache}/${name}.gif`,
    ]),
    "-loop",
    "1",
    "-i",
    `${cache}/flexpath-labels.png`,
    "-filter_complex",
    [
      ...panelFilters,
      "[p0][p1][p2][p3]xstack=inputs=4:layout=0_0|512_0|0_464|512_464[grid]",
      "[grid]pad=1488:930:232:0:black[framed]",
      "[framed][4:v]overlay=0:0:shortest=1[out]",
    ].join(";"),
    "-map",
    "[out]",
    "-t",
    "15",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    `${cache}/flexpath-collage.mp4`,
  ]);
  // Decode animated WebP through sharp because FFmpeg builds vary in support.
  const missionSource =
    "images/MissionBench/mission_webps/CityEnv_isolated_house_rooftop_mission25_TPV.webp";
  await sharp(missionSource, { animated: true })
    .gif()
    .toFile(`${cache}/missionbench.gif`);
  const inputs = {
    multifly: {
      source:
        process.env.MULTIFLY_PREVIEW_SOURCE ||
        "/Users/tae/dev/personal/multifly_vis/outputs/revised/showcase/multifly_semantic_clouds.mp4",
      start: 8,
      duration: 15,
      crop: "crop=1312:820:400:90",
      restoreLeftLabels: true,
    },
    voxelfix: {
      source:
        process.env.VOXELFIX_PREVIEW_SOURCE ||
        "/Users/tae/dev/personal/blender_vid/deliverables/voxelfix-web.mp4",
      start: 16,
      duration: 4.5,
      crop: "crop=854:538:40:118",
    },
    missionbench: {
      source: `${cache}/missionbench.gif`,
      original: missionSource,
      start: 0,
      duration: 15,
    },
    ssp: {
      source: "publications/static/videos/ssp_banner_video.mp4",
      start: 5,
      duration: 15,
      crop: "crop=640:368:640:0",
    },
    flexpath: {
      source: `${cache}/flexpath-collage.mp4`,
      original: flexPanels.map(([name]) => `${flexBase}/${name}.gif`),
      start: 0,
      duration: 15,
    },
  };
  const manifest = process.env.PUBLICATION_PREVIEW_ONLY
    ? JSON.parse(await readFile(`${directory}/publication-loops.json`, "utf8"))
    : {};
  for (const [id, input] of Object.entries(inputs)) {
    if (
      process.env.PUBLICATION_PREVIEW_ONLY &&
      id !== process.env.PUBLICATION_PREVIEW_ONLY
    )
      continue;
    const base = `${directory}/${id}-preview`;
    const trim = ["-ss", String(input.start), "-i", input.source];
    const filter = [
      input.crop,
      "fps=12",
      "scale='min(800,iw)':-2:flags=lanczos",
    ]
      .filter(Boolean)
      .join(",");
    if (input.restoreLeftLabels) {
      await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><g font-family="Arial, sans-serif" font-size="24" fill="#eef0f4"><rect x="0" y="0" width="68" height="30" fill="#20242c"/><text x="5" y="25">RGB</text><rect x="0" y="310" width="92" height="32" fill="#20242c"/><text x="5" y="337">LiDAR</text></g></svg>`,
        ),
      )
        .png()
        .toFile(`${cache}/multifly-labels.png`);
    }
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      ...trim,
      ...(input.restoreLeftLabels
        ? ["-i", `${cache}/multifly-labels.png`]
        : []),
      "-t",
      String(input.duration),
      "-an",
      ...(input.restoreLeftLabels
        ? [
            "-filter_complex",
            `[0:v]${filter}[clip];[clip][1:v]overlay=0:0[out]`,
            "-map",
            "[out]",
          ]
        : ["-vf", filter]),
      "-c:v",
      "libx264",
      "-crf",
      "20",
      "-preset",
      "slow",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${base}.mp4`,
    ]);
    await sharp(
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-i",
        `${base}.mp4`,
        "-frames:v",
        "1",
        "-f",
        "image2pipe",
        "-c:v",
        "png",
        "pipe:1",
      ]),
    )
      .webp({ quality: 88 })
      .toFile(`${base}.webp`);
    const info = JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "stream=width,height:format=duration",
          "-of",
          "json",
          `${base}.mp4`,
        ],
        { encoding: "utf8" },
      ),
    );
    const descriptions = {
      multifly:
        "MultiFly animated comparison of registered semantic point clouds across RGB, infrared, LiDAR and radar.",
      voxelfix:
        "VoxelFix before/after wipe showing semantic label correction in Scene 2 with fixed geometry.",
      missionbench:
        "MissionBench aerial visual-inspection mission approaching an isolated house rooftop.",
      ssp: "KD-SSP semantic segmentation of aerial video, cropped to the method output panel.",
      flexpath:
        "Four-panel FlexPath animation comparing optimal, obstacle-avoidance, semantic-avoidance and waypoint-guided search.",
    };
    manifest[id] = {
      alt: descriptions[id],
      src: `/${base}.mp4`,
      poster: `/${base}.webp`,
      width: info.streams[0].width,
      height: info.streams[0].height,
      duration: Number(info.format.duration),
      source: input.original || input.source,
      start: input.start,
      crop: input.crop || null,
      bytes: (await stat(`${base}.mp4`)).size,
    };
    console.log(
      `${id}: ${manifest[id].duration}s, ${(manifest[id].bytes / 1024).toFixed(0)} KiB video`,
    );
  }
  await writeFile(
    `${directory}/publication-loops.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
} finally {
  await rm(cache, { recursive: true, force: true });
}
