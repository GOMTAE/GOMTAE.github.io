#!/usr/bin/env python3
"""Build compact, deterministic VoxelFix web assets from the source PLY archives."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import shutil
import struct
import tempfile
import zipfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


VOXEL_SIZE = 0.5
PLY_VERTEX_SIZE = 19
CLASS_DEFINITIONS = (
    {"id": 0, "name": "Unlabeled", "color": "#000000"},
    {"id": 1, "name": "Road", "color": "#800080"},
    {"id": 2, "name": "Dirt", "color": "#800000"},
    {"id": 3, "name": "Gravel", "color": "#c0c0c0"},
    {"id": 4, "name": "Rock", "color": "#f67828"},
    {"id": 5, "name": "Grass", "color": "#00ff00"},
    {"id": 7, "name": "Tree", "color": "#404000"},
    {"id": 8, "name": "Obstacle", "color": "#ffff00"},
    {"id": 9, "name": "Animal", "color": "#ff99cc"},
    {"id": 10, "name": "Person", "color": "#ff10ff"},
    {"id": 11, "name": "Bicycle", "color": "#ffcc99"},
    {"id": 12, "name": "Vehicle", "color": "#008080"},
    {"id": 13, "name": "Water", "color": "#0000ff"},
    {"id": 14, "name": "Boat", "color": "#6d7896"},
    {"id": 15, "name": "Wall / Building", "color": "#ff0000"},
    {"id": 16, "name": "Roof", "color": "#40a078"},
    {"id": 17, "name": "Sky", "color": "#00ffff"},
    {"id": 18, "name": "Drone", "color": "#c08080"},
    {"id": 19, "name": "Train track", "color": "#383e42"},
    {"id": 20, "name": "Cable", "color": "#ffa000"},
    {"id": 21, "name": "Cable tower", "color": "#6a00ff"},
    {"id": 25, "name": "Bridge", "color": "#abc7f5"},
    {"id": 26, "name": "Airplane", "color": "#f5e376"},
)
CLASS_COLORS = {
    item["id"]: tuple(bytes.fromhex(item["color"][1:])) for item in CLASS_DEFINITIONS
}
MODEL_NAMES = {
    "mask2former": "Mask2Former Swin-T",
    "segformer": "SegFormer MiT-B3",
    "upernet_conv2_t": "UPerNet ConvNeXt-v2-T",
    "upernet_swinv2_t": "UPerNet Swin-v2-T",
}
MODEL_ORDER = tuple(MODEL_NAMES)
SCENE_ORDER = (
    "Buxheim",
    "CAR",
    "Donaukurier",
    "INC-west",
    "Kiesplatz",
    "Koesching",
    "Lenting",
    "Schanz",
    "Treffler",
)


@dataclass(frozen=True)
class PlyData:
    coordinates: bytes
    labels: bytes
    count: int


def slugify(value: str) -> str:
    return value.lower().replace("_", "-").replace(" ", "-")


def parse_header(raw: bytes, member: str) -> tuple[int, int]:
    marker = raw.find(b"end_header")
    if marker < 0:
        raise ValueError(f"{member}: missing end_header")
    data_offset = raw.find(b"\n", marker)
    if data_offset < 0:
        raise ValueError(f"{member}: incomplete header")
    data_offset += 1
    header = raw[:data_offset].decode("ascii").replace("\r\n", "\n")
    required_lines = (
        "format binary_little_endian 1.0",
        "property float x",
        "property float y",
        "property float z",
        "property uchar red",
        "property uchar green",
        "property uchar blue",
        "property int label",
    )
    for line in required_lines:
        if line not in header:
            raise ValueError(f"{member}: expected PLY declaration '{line}'")
    vertex_line = next(
        (line for line in header.splitlines() if line.startswith("element vertex ")),
        None,
    )
    if vertex_line is None:
        raise ValueError(f"{member}: missing vertex count")
    count = int(vertex_line.rsplit(" ", 1)[1])
    expected_size = data_offset + count * PLY_VERTEX_SIZE
    if len(raw) != expected_size:
        raise ValueError(
            f"{member}: expected {expected_size} bytes for {count} vertices, got {len(raw)}"
        )
    return data_offset, count


def read_ply(archive: zipfile.ZipFile, member: str) -> PlyData:
    raw = archive.read(member)
    data_offset, count = parse_header(raw, member)
    view = memoryview(raw)
    coordinates = bytearray(count * 12)
    labels = bytearray(count)

    for index in range(count):
        source_offset = data_offset + index * PLY_VERTEX_SIZE
        coordinate_offset = index * 12
        coordinates[coordinate_offset : coordinate_offset + 12] = view[
            source_offset : source_offset + 12
        ]
        red, green, blue = view[source_offset + 12 : source_offset + 15]
        label = struct.unpack_from("<i", view, source_offset + 15)[0]
        if label not in CLASS_COLORS:
            raise ValueError(f"{member}: unknown semantic label {label}")
        expected_color = CLASS_COLORS[label]
        if (red, green, blue) != expected_color:
            raise ValueError(
                f"{member}: label {label} has RGB {(red, green, blue)}, expected {expected_color}"
            )
        labels[index] = label

    return PlyData(bytes(coordinates), bytes(labels), count)


def coordinate_at(coordinates: bytes, index: int) -> tuple[float, float, float]:
    return struct.unpack_from("<fff", coordinates, index * 12)


def quantized_key(coordinate: tuple[float, float, float]) -> tuple[int, int, int]:
    return tuple(round(value / VOXEL_SIZE) for value in coordinate)


def align_labels(reference: PlyData, candidate: PlyData, member: str) -> bytes:
    if candidate.count != reference.count:
        raise ValueError(
            f"{member}: vertex count {candidate.count} does not match reference {reference.count}"
        )
    if candidate.coordinates == reference.coordinates:
        return candidate.labels

    reference_indices = {
        quantized_key(coordinate_at(reference.coordinates, index)): index
        for index in range(reference.count)
    }
    if len(reference_indices) != reference.count:
        raise ValueError(f"{member}: reference contains duplicate voxel coordinates")

    aligned = bytearray(reference.count)
    seen = bytearray(reference.count)
    for index in range(candidate.count):
        key = quantized_key(coordinate_at(candidate.coordinates, index))
        reference_index = reference_indices.get(key)
        if reference_index is None:
            raise ValueError(f"{member}: geometry differs from the scene reference")
        aligned[reference_index] = candidate.labels[index]
        seen[reference_index] = 1
    if not all(seen):
        raise ValueError(f"{member}: geometry does not cover every reference voxel")
    return bytes(aligned)


def encode_geometry(data: PlyData, member: str) -> tuple[bytes, list[float]]:
    origin = [float("inf"), float("inf"), float("inf")]
    for coordinate in struct.iter_unpack("<fff", data.coordinates):
        for axis in range(3):
            origin[axis] = min(origin[axis], coordinate[axis])
    encoded = bytearray(data.count * 6)

    for index, coordinate in enumerate(struct.iter_unpack("<fff", data.coordinates)):
        offsets = []
        for axis in range(3):
            exact_offset = (coordinate[axis] - origin[axis]) / VOXEL_SIZE
            offset = round(exact_offset)
            if abs(exact_offset - offset) > 1e-4:
                raise ValueError(
                    f"{member}: coordinate {coordinate[axis]} is not on the {VOXEL_SIZE} m grid"
                )
            if not 0 <= offset <= 65535:
                raise ValueError(f"{member}: scene extent exceeds Uint16 grid encoding")
            offsets.append(offset)
        struct.pack_into("<HHH", encoded, index * 6, *offsets)

    return bytes(encoded), origin


def gzip_bytes(raw: bytes) -> bytes:
    return gzip.compress(raw, compresslevel=9, mtime=0)


def write_asset(root: Path, relative_path: str, raw: bytes) -> dict[str, object]:
    compressed = gzip_bytes(raw)
    destination = root / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(compressed)
    return {
        "path": relative_path,
        "compressedBytes": len(compressed),
        "rawBytes": len(raw),
        "sha256": hashlib.sha256(compressed).hexdigest(),
    }


def label_counts(labels: bytes) -> dict[str, int]:
    return {str(label): count for label, count in sorted(Counter(labels).items())}


def read_metrics(archive: zipfile.ZipFile) -> dict[tuple[str, str], dict[str, float]]:
    text = archive.read("occufly/manifest.csv").decode("utf-8")
    rows = csv.DictReader(text.splitlines())
    return {
        (row["scene"], row["model"]): {
            "inputMiou": float(row["input_miou"]),
            "outputMiou": float(row["output_miou"]),
            "miouGain": float(row["miou_gain"]),
        }
        for row in rows
    }


def assert_duplicate_gt(
    archive: zipfile.ZipFile, reference_member: str, candidate_member: str
) -> None:
    reference = archive.getinfo(reference_member)
    candidate = archive.getinfo(candidate_member)
    if (reference.file_size, reference.CRC) != (candidate.file_size, candidate.CRC):
        raise ValueError(
            f"{candidate_member}: GT differs from scene reference {reference_member}"
        )


def build_occufly(archive_path: Path, output: Path) -> list[dict[str, object]]:
    scenes = []
    with zipfile.ZipFile(archive_path) as archive:
        metrics = read_metrics(archive)
        for scene_name in SCENE_ORDER:
            scene_id = f"occufly-{slugify(scene_name)}"
            reference_gt_member = f"occufly/{scene_name}/{MODEL_ORDER[0]}/gt.ply"
            reference = read_ply(archive, reference_gt_member)
            geometry, origin = encode_geometry(reference, reference_gt_member)
            asset_root = f"scenes/{scene_id}"
            geometry_asset = write_asset(output, f"{asset_root}/geometry.u16.gz", geometry)
            gt_asset = write_asset(output, f"{asset_root}/gt.u8.gz", reference.labels)
            models = []
            present_labels = set(reference.labels)

            for model_id in MODEL_ORDER:
                gt_member = f"occufly/{scene_name}/{model_id}/gt.ply"
                assert_duplicate_gt(archive, reference_gt_member, gt_member)
                input_member = f"occufly/{scene_name}/{model_id}/input.ply"
                output_member = f"occufly/{scene_name}/{model_id}/output.ply"
                input_data = read_ply(archive, input_member)
                output_data = read_ply(archive, output_member)
                input_labels = align_labels(reference, input_data, input_member)
                output_labels = align_labels(reference, output_data, output_member)
                present_labels.update(input_labels)
                present_labels.update(output_labels)
                labels_asset = write_asset(
                    output,
                    f"{asset_root}/{model_id}.u8.gz",
                    input_labels + output_labels,
                )
                models.append(
                    {
                        "id": model_id,
                        "name": MODEL_NAMES[model_id],
                        "labels": labels_asset,
                        "metrics": metrics[(scene_name, model_id)],
                        "inputCounts": label_counts(input_labels),
                        "outputCounts": label_counts(output_labels),
                    }
                )

            scenes.append(
                {
                    "id": scene_id,
                    "dataset": "occufly",
                    "name": scene_name,
                    "voxelCount": reference.count,
                    "origin": origin,
                    "geometry": geometry_asset,
                    "gt": gt_asset,
                    "gtCounts": label_counts(reference.labels),
                    "presentLabels": sorted(present_labels),
                    "models": models,
                }
            )
            print(f"built {scene_name}: {reference.count:,} voxels")
    return scenes


def build_ood(archive_path: Path, output: Path) -> list[dict[str, object]]:
    variants = (
        ("ood-poernbach-patch", "Pörnbach OOD patch", "poernbach_ood"),
        ("ood-poernbach-full", "Pörnbach OOD full scene", "poernbach_ood_full"),
    )
    scenes = []
    with zipfile.ZipFile(archive_path) as archive:
        for scene_id, scene_name, prefix in variants:
            gt_member = f"ood_patches/{prefix}_gt.ply"
            input_member = f"ood_patches/{prefix}_input.ply"
            output_member = f"ood_patches/{prefix}_output.ply"
            reference = read_ply(archive, gt_member)
            input_data = read_ply(archive, input_member)
            output_data = read_ply(archive, output_member)
            input_labels = align_labels(reference, input_data, input_member)
            output_labels = align_labels(reference, output_data, output_member)
            geometry, origin = encode_geometry(reference, gt_member)
            asset_root = f"scenes/{scene_id}"
            geometry_asset = write_asset(output, f"{asset_root}/geometry.u16.gz", geometry)
            gt_asset = write_asset(output, f"{asset_root}/gt.u8.gz", reference.labels)
            labels_asset = write_asset(
                output,
                f"{asset_root}/mask2former.u8.gz",
                input_labels + output_labels,
            )
            present_labels = sorted(set(reference.labels + input_labels + output_labels))
            scenes.append(
                {
                    "id": scene_id,
                    "dataset": "ood",
                    "name": scene_name,
                    "voxelCount": reference.count,
                    "origin": origin,
                    "geometry": geometry_asset,
                    "gt": gt_asset,
                    "gtCounts": label_counts(reference.labels),
                    "presentLabels": present_labels,
                    "models": [
                        {
                            "id": "mask2former",
                            "name": "Mask2Former Swin-T",
                            "labels": labels_asset,
                            "metrics": None,
                            "inputCounts": label_counts(input_labels),
                            "outputCounts": label_counts(output_labels),
                        }
                    ],
                }
            )
            print(f"built {scene_name}: {reference.count:,} voxels")
    return scenes


def directory_size(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def replace_directory(staged: Path, destination: Path) -> None:
    backup = destination.with_name(f".{destination.name}-backup")
    if backup.exists():
        shutil.rmtree(backup)
    try:
        if destination.exists():
            os.replace(destination, backup)
        os.replace(staged, destination)
    except Exception:
        if not destination.exists() and backup.exists():
            os.replace(backup, destination)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def build(occufly: Path, ood: Path, destination: Path) -> None:
    if not occufly.is_file() or not ood.is_file():
        raise FileNotFoundError("Both source ZIP archives must exist")
    destination.parent.mkdir(parents=True, exist_ok=True)
    staged = Path(tempfile.mkdtemp(prefix=".voxelfix-data-", dir=destination.parent))
    try:
        scenes = build_occufly(occufly, staged)
        scenes.extend(build_ood(ood, staged))
        manifest = {
            "version": 1,
            "voxelSize": VOXEL_SIZE,
            "encoding": {
                "geometry": "little-endian uint16 xyz grid offsets",
                "gt": "uint8 labels",
                "model": "uint8 input labels followed by uint8 output labels",
                "compression": "gzip",
            },
            "defaultScene": "occufly-donaukurier",
            "defaultModel": "segformer",
            "classes": CLASS_DEFINITIONS,
            "scenes": scenes,
        }
        manifest_path = staged / "manifest.json"
        manifest_path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        total_size = directory_size(staged)
        largest_asset = max(
            item.stat().st_size
            for item in staged.rglob("*")
            if item.is_file() and item.name != "manifest.json"
        )
        if total_size > 75 * 1024 * 1024:
            raise ValueError(f"generated data is {total_size / 1024 / 1024:.1f} MiB, over 75 MiB")
        if largest_asset > 10 * 1024 * 1024:
            raise ValueError(
                f"largest asset is {largest_asset / 1024 / 1024:.1f} MiB, over 10 MiB"
            )
        replace_directory(staged, destination)
        print(
            f"wrote {len(scenes)} scenes to {destination} "
            f"({total_size / 1024 / 1024:.1f} MiB total, "
            f"{largest_asset / 1024 / 1024:.1f} MiB largest asset)"
        )
    except Exception:
        if staged.exists():
            shutil.rmtree(staged)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--occufly", required=True, type=Path)
    parser.add_argument("--ood", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    build(arguments.occufly, arguments.ood, arguments.output)
