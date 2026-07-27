#!/usr/bin/env python3
"""
build_photo_data.py

Scans the photos/ folder for images, pulls GPS coordinates out of each
file's EXIF metadata, and writes photos.json — the data file the
scrollytelling page reads to know where each photo goes on the map.

Usage:
    python3 scripts/build_photo_data.py

Run this any time you add, remove, or reorder photos in photos/.
Photos are ordered alphabetically by filename, so prefix files like
site-01.jpg, site-02.jpg, etc. if you care about scroll order.

If a photo has no GPS EXIF data, it's still included in photos.json
with lat/lng set to null — you can fill those in by hand, or drop
the photo from the map (it'll just be skipped when placing markers).

Existing captions/titles in photos.json are preserved when you rerun
this script, so it's safe to edit those fields and re-run after adding
new photos.
"""

import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
except ImportError:
    print("This script needs Pillow. Install it with:")
    print("  pip install Pillow --break-system-packages")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "photos"
OUTPUT_FILE = ROOT / "data" / "photos.json"
VALID_EXT = {".jpg", ".jpeg", ".png", ".heic"}


def dms_to_decimal(dms, ref):
    degrees, minutes, seconds = dms
    decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    if ref in ("S", "W"):
        decimal = -decimal
    return round(decimal, 6)


def extract_gps(image_path):
    try:
        img = Image.open(image_path)
        exif = img._getexif()
    except Exception:
        return None, None

    if not exif:
        return None, None

    gps_info = None
    for tag_id, value in exif.items():
        if TAGS.get(tag_id) == "GPSInfo":
            gps_info = value
            break

    if not gps_info:
        return None, None

    gps = {GPSTAGS.get(t, t): v for t, v in gps_info.items()}

    if "GPSLatitude" not in gps or "GPSLongitude" not in gps:
        return None, None

    lat = dms_to_decimal(gps["GPSLatitude"], gps.get("GPSLatitudeRef", "N"))
    lng = dms_to_decimal(gps["GPSLongitude"], gps.get("GPSLongitudeRef", "E"))
    return lat, lng


def load_existing(path):
    if not path.exists():
        return {}
    try:
        with open(path) as f:
            entries = json.load(f)
        return {e["file"]: e for e in entries}
    except Exception:
        return {}


def main():
    if not PHOTOS_DIR.exists():
        print(f"No photos/ folder found at {PHOTOS_DIR}")
        sys.exit(1)

    existing = load_existing(OUTPUT_FILE)

    files = sorted(
        f for f in PHOTOS_DIR.iterdir()
        if f.suffix.lower() in VALID_EXT
    )

    if not files:
        print(f"No images found in {PHOTOS_DIR}")
        sys.exit(1)

    entries = []
    missing_gps = []

    for f in files:
        lat, lng = extract_gps(f)
        prior = existing.get(f.name, {})

        entry = {
            "file": f.name,
            "lat": lat if lat is not None else prior.get("lat"),
            "lng": lng if lng is not None else prior.get("lng"),
            "title": prior.get("title", f.stem.replace("-", " ").replace("_", " ").title()),
            "caption": prior.get("caption", "Add a description for this photo in data/photos.json."),
        }
        entries.append(entry)

        if entry["lat"] is None or entry["lng"] is None:
            missing_gps.append(f.name)

    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(entries, f, indent=2)

    print(f"Wrote {len(entries)} entries to {OUTPUT_FILE}")
    if missing_gps:
        print("\nNo GPS data found for:")
        for name in missing_gps:
            print(f"  - {name}")
        print("Add lat/lng manually in data/photos.json for these.")


if __name__ == "__main__":
    main()
