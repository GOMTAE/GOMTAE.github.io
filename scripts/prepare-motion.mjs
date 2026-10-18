import { execFileSync } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";

const directory = "assets/portfolio/media";
await mkdir(directory, { recursive: true });
const sources = {
  hero: {
    source: "publications/static/videos/ssp_banner_video.mp4",
    filter: "crop=640:368:640:0",
  },
  "archive-control": { source: "images/Fault-Tolerant UAV Controller.gif" },
  "archive-planning": { source: "images/UAV Path Planning with DL.gif" },
  "archive-driving": { source: "images/Autonomous Driving.gif" },
  "archive-mesh": { source: "images/Area Mesh Generation.gif" },
};
const loops = {};
for (const [name, item] of Object.entries(sources)) {
  const output = `${directory}/${name}-loop.mp4`;
  execFileSync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    item.source,
    "-an",
    "-vf",
    [item.filter, "pad=ceil(iw/2)*2:ceil(ih/2)*2"].filter(Boolean).join(","),
    "-fps_mode",
    "vfr",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
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
        output,
      ],
      { encoding: "utf8" },
    ),
  );
  loops[name] = {
    src: `/${output}`,
    width: info.streams[0].width,
    height: info.streams[0].height,
    duration: Number(info.format.duration),
    source: item.source,
    bytes: (await stat(output)).size,
  };
  console.log(
    `${name}: ${(loops[name].bytes / 1024).toFixed(0)} KiB, ${loops[name].duration.toFixed(2)} seconds`,
  );
}
await writeFile(
  `${directory}/loops.json`,
  `${JSON.stringify(loops, null, 2)}\n`,
);
