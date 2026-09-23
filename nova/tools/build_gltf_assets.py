#!/usr/bin/env python3
"""Build NOVA's web GLTF asset from the original exported GLTF + texture ZIP.

The source GLTF carries geometry/skin/animation buffers inline. This script only:
- extracts the 12 referenced textures from the original headphone ZIP,
- downscales them to <=1024px WebP,
- rewrites image URIs,
- replaces incorrect exporter PBR channel assignments with conservative web materials.
"""
from __future__ import annotations
import argparse, io, json, zipfile
from pathlib import Path
from PIL import Image

MATERIALS = {
    "Part_1": {"base": 11, "roughness": .58, "metalness": .02},
    "Part_2": {"base": 10, "normal": (5, .72), "ao": (6, .65), "roughness": .48, "metalness": .03},
    "Part_4": {"base": 9, "normal": (8, .65), "roughness": .34, "metalness": .12},
    "Material.005": {"base": 1, "normal": (7, .72), "ao": (3, .55), "roughness": .44, "metalness": .03},
    "Material.006": {"base": 4, "normal": (2, .70), "roughness": .40, "metalness": .05},
}

def material_json(name: str) -> dict:
    cfg = MATERIALS[name]
    m = {"doubleSided": True, "name": name}
    if "normal" in cfg:
        idx, scale = cfg["normal"]
        m["normalTexture"] = {"index": idx, "scale": scale}
    if "ao" in cfg:
        idx, strength = cfg["ao"]
        m["occlusionTexture"] = {"index": idx, "strength": strength}
    m["pbrMetallicRoughness"] = {
        "baseColorTexture": {"index": cfg["base"]},
        "baseColorFactor": [1, 1, 1, 1],
        "metallicFactor": cfg["metalness"],
        "roughnessFactor": cfg["roughness"],
    }
    return m

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gltf", required=True, type=Path)
    ap.add_argument("--textures-zip", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--max-size", type=int, default=1024)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    data = json.loads(args.gltf.read_text(encoding="utf-8"))
    source_uris = [img["uri"] for img in data.get("images", [])]
    if len(source_uris) != 12:
        raise SystemExit(f"Expected 12 external images, got {len(source_uris)}")

    with zipfile.ZipFile(args.textures_zip) as zf:
        members = {Path(n).name: n for n in zf.namelist() if not n.endswith("/")}
        missing = [u for u in source_uris if Path(u).name not in members]
        if missing:
            raise SystemExit(f"Texture ZIP missing: {missing}")
        for image in data["images"]:
            src_name = Path(image["uri"]).name
            raw = zf.read(members[src_name])
            with Image.open(io.BytesIO(raw)) as im:
                im.load()
                im.thumbnail((args.max_size, args.max_size), Image.Resampling.LANCZOS)
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGB")
                out_name = Path(src_name).with_suffix(".webp").name
                quality = 87 if "_Col" in src_name else 90
                im.save(args.out / out_name, "WEBP", quality=quality, method=6)
                image["uri"] = out_name

    by_name = {m.get("name"): i for i, m in enumerate(data.get("materials", []))}
    missing_materials = [n for n in MATERIALS if n not in by_name]
    if missing_materials:
        raise SystemExit(f"GLTF missing expected materials: {missing_materials}")
    for name in MATERIALS:
        data["materials"][by_name[name]] = material_json(name)

    out_gltf = args.out / "headphones-web.gltf"
    out_gltf.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(out_gltf)

if __name__ == "__main__":
    main()
