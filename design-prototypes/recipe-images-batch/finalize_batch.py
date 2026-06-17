import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / "manifest.json"
PROGRESS_PATH = ROOT / "progress.json"
GENERATED_DIR = Path.home() / ".codex" / "generated_images" / "019ec923-5d2b-76a0-b64c-735ac4b42bea"


def load_json(path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def generated_after(marker_path):
    marker_time = Path(marker_path).stat().st_mtime
    return sorted(
        [item for item in GENERATED_DIR.glob("*.png") if item.stat().st_mtime > marker_time],
        key=lambda item: item.stat().st_mtime,
    )


def save_optimized(source_path, output_path):
    image = Image.open(source_path).convert("RGB")
    image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (800, 800), "white")
    canvas.paste(image, ((800 - image.width) // 2, (800 - image.height) // 2))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)


def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: finalize_batch.py <start_index_1_based> <count> <marker_path>")

    start_index = int(sys.argv[1])
    count = int(sys.argv[2])
    marker_path = sys.argv[3]

    manifest = load_json(MANIFEST_PATH, [])
    batch = manifest[start_index - 1:start_index - 1 + count]
    sources = generated_after(marker_path)
    if len(sources) != len(batch):
        raise SystemExit(f"Expected {len(batch)} generated images, found {len(sources)} after marker.")

    progress = load_json(PROGRESS_PATH, {"generated": []})
    existing = {
        entry.get("id"): entry
        for entry in progress.get("generated", [])
        if entry.get("id")
    }

    written = []
    for item, source in zip(batch, sources):
        output = Path(item["outputFile"])
        save_optimized(source, output)
        entry = {
            "id": item["id"],
            "name": item["name"],
            "utensil": item["utensil"],
            "sourceFile": str(source),
            "outputFile": str(output),
        }
        existing[item["id"]] = entry
        written.append(entry)

    progress["generated"] = [existing[key] for key in sorted(existing)]
    PROGRESS_PATH.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"written": written, "totalGenerated": len(progress["generated"])}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
