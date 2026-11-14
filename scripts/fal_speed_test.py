#!/usr/bin/env python3
"""Times fal drawing Milo's whiteboard, one turn at a time.

The question this answers: how long does one board redraw take, and are the
handwritten labels readable? It draws the level 1 crayon board, then edits it
through levels 2, 3 and 4 the way a real session would, and prints how long
every call took. The images are saved so we can look at the labels.

Needs FAL_KEY in the environment or in .env.local at the top of the repo.
Uses only the standard library, so there is nothing to install.
"""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "fal_test_out"

STYLE = (
    "A sheet of off-white textured paper, photographed flat, filling the frame. "
    "Hand-drawn with wax crayons and coloured pencils, like a student's notes. "
    "Handwritten marker lettering, spelled exactly as given. No other text. "
)
LEVELS = [
    ("level1", STYLE
     + "Very messy and childish. One big pink crayon scribbled blob in the middle. "
     + "Top left in pink crayon handwriting: 'The cell ?'. On the right in pink: "
     + "'does stuff ?' and 'keeps us alive ?'. Nothing else."),
    ("level2", "Keep the same paper and crayon style. Redraw the blob as a pink crayon "
     + "outline of a cell. Inside it draw one squiggly mitochondrion with yellow rays, "
     + "and a yellow lightning bolt leaving the cell. Small circles enter from the left "
     + "with an arrow. Add two purple question marks with arrows. Remove the old words."),
    ("level3", "Keep the same drawing and style, a bit neater. Make the cell outline purple "
     + "with a hatched purple nucleus and two orange mitochondria. Add handwritten labels "
     + "with arrows, spelled exactly: 'Cell membrane' and next to it on a purple highlighter "
     + "patch 'controls what enters'; 'Mitochondria' and next to it on a yellow highlighter "
     + "patch 'make energy (ATP)'. Remove the question marks."),
    ("level4", "Keep the same drawing and style, now clean and organised like a finished "
     + "revision sheet. Title top left: 'The cell: how it works'. Add a pink nucleus with a "
     + "DNA helix, a blue rough ER with dots on it, a purple Golgi and a yellow star labelled "
     + "'ATP'. Yellow label boxes with black handwriting, spelled exactly: 'Nucleus', "
     + "'Ribosomes (build proteins)', 'Rough ER', 'Golgi (packs and sends)', "
     + "'Mitochondria (make ATP)'. Arrows show proteins moving from the rough ER to the Golgi."),
]

BASE_MODEL = "google/nano-banana-2-lite"
EDIT_MODEL = "google/nano-banana-2-lite/edit"
COMPARE = [
    ("fal-ai/flux-2/flash/edit", "level3"),   # the cheap fast one, same step
    ("fal-ai/nano-banana-pro/edit", "level4"),  # the careful one, for label quality
]


def load_key():
    key = os.environ.get("FAL_KEY", "").strip()
    # The repo's .env.local first, then a .env next to this script.
    for env_file in (HERE.parent / ".env.local", HERE / ".env"):
        if key or not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("FAL_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("No FAL_KEY found. Put FAL_KEY=... in .env.local at the top of the repo.")
    return key


def call(endpoint, payload, key, timeout=240):
    """POST to fal's synchronous endpoint. Returns (body, seconds, error)."""
    req = urllib.request.Request(
        "https://fal.run/" + endpoint,
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Key " + key, "Content-Type": "application/json"},
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read())
    except urllib.error.HTTPError as err:
        detail = err.read().decode(errors="replace")[:400]
        return None, time.perf_counter() - start, "HTTP %s: %s" % (err.code, detail)
    except Exception as err:  # network errors, timeouts, bad JSON
        return None, time.perf_counter() - start, str(err)
    return body, time.perf_counter() - start, None


def first_image_url(body):
    images = (body or {}).get("images") or []
    return images[0].get("url") if images else None


def save(url, name):
    OUT.mkdir(exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            (OUT / name).write_bytes(resp.read())
    except Exception as err:
        print("   could not save %s: %s" % (name, err))


def edit_payload(model, prompt, image_url):
    payload = {"prompt": prompt, "image_urls": [image_url], "output_format": "jpeg"}
    if model.startswith("fal-ai/flux-2"):
        payload["image_size"] = "landscape_16_9"
    else:
        payload["aspect_ratio"] = "16:9"
    return payload


def main():
    key = load_key()
    rows = []
    urls = {}

    name, prompt = LEVELS[0]
    print("Drawing %s with %s ..." % (name, BASE_MODEL))
    body, secs, err = call(BASE_MODEL, {"prompt": prompt, "aspect_ratio": "16:9", "output_format": "jpeg"}, key)
    url = first_image_url(body)
    rows.append((BASE_MODEL, name, secs, err or ("" if url else "no image returned")))
    if not url:
        report(rows)
        sys.exit("Could not draw the first board, so the edits were not tried.")
    urls[name] = url
    save(url, "1_%s.jpg" % name)

    previous = name
    for step, (name, prompt) in enumerate(LEVELS[1:], start=2):
        print("Editing to %s with %s ..." % (name, EDIT_MODEL))
        body, secs, err = call(EDIT_MODEL, edit_payload(EDIT_MODEL, prompt, urls[previous]), key)
        url = first_image_url(body)
        rows.append((EDIT_MODEL, name, secs, err or ("" if url else "no image returned")))
        if not url:
            break
        urls[name] = url
        save(url, "%d_%s.jpg" % (step, name))
        previous = name

    prompts = dict(LEVELS)
    order = [n for n, _ in LEVELS]
    for model, target in COMPARE:
        before = order[order.index(target) - 1]
        if before not in urls:
            continue
        print("Comparing: %s with %s ..." % (target, model))
        body, secs, err = call(model, edit_payload(model, prompts[target], urls[before]), key)
        url = first_image_url(body)
        rows.append((model, target, secs, err or ("" if url else "no image returned")))
        if url:
            save(url, "compare_%s_%s.jpg" % (model.replace("/", "_"), target))

    report(rows)


def report(rows):
    print()
    print("%-34s %-8s %8s  %s" % ("model", "step", "seconds", "problem"))
    for model, step, secs, problem in rows:
        print("%-34s %-8s %8.2f  %s" % (model, step, secs, problem))
    print()
    print("Images are in: %s" % OUT)


if __name__ == "__main__":
    main()
