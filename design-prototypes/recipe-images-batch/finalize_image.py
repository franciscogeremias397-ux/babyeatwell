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


def newest_generated_after(marker_path):
    marker_time = Path(marker_path).stat().st_mtime
    candidates = [
        item for item in GENERATED_DIR.glob("*.png")
        if item.stat().st_mtime > marker_time
    ]
    if not candidates:
        raise SystemExit("No generated image found after marker.")
    return max(candidates, key=lambda item: item.stat().st_mtime)


def save_optimized(source_path, output_path):
    image = Image.open(source_path).convert("RGB")
    image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (800, 800), "white")
    canvas.paste(image, ((800 - image.width) // 2, (800 - image.height) // 2))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: finalize_image.py <recipe_id> <marker_path>")

    recipe_id = sys.argv[1]
    marker_path = sys.argv[2]
    manifest = load_json(MANIFEST_PATH, [])
    item = next((entry for entry in manifest if entry["id"] == recipe_id), None)
    if not item:
        raise SystemExit(f"Recipe not found: {recipe_id}")

    source = newest_generated_after(marker_path)
    output = Path(item["outputFile"])
    save_optimized(source, output)

    progress = load_json(PROGRESS_PATH, {"generated": []})
    progress["generated"] = [
        entry for entry in progress.get("generated", [])
        if entry.get("id") != recipe_id
    ]
    progress["generated"].append({
        "id": item["id"],
        "name": item["name"],
        "utensil": item["utensil"],
        "sourceFile": str(source),
        "outputFile": str(output)
    })
    progress["generated"].sort(key=lambda entry: entry["id"])
    PROGRESS_PATH.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(progress["generated"][-1], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
