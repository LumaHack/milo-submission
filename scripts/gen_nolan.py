#!/usr/bin/env python3
"""Draws Nolan, the investigator, with fal. One still picture in the same 3D style as Milo.

He is a made-up cartoon character, not a likeness of anyone.
Saves public/nolan/nolan.jpg and a copy in design/nolan/.
"""
import pathlib
import sys
import urllib.request

from fal_speed_test import call, first_image_url, load_key

ROOT = pathlib.Path(__file__).resolve().parent.parent

PROMPT = (
    "A friendly cartoon detective, a made-up character, about forty years old, with short dark wavy hair "
    "and a calm, attentive look, one eyebrow slightly raised. He wears a beige trench coat over a white shirt "
    "and a dark green tie, and holds a small spiral notepad and a pencil near his chest. "
    "3D animated film style, smooth stylised 3D render, soft studio lighting, friendly and expressive. "
    "Plain pale lavender background. Head and shoulders, centred. No text."
)


def main():
    key = load_key()
    body, secs, err = call("google/nano-banana-2-lite", {"prompt": PROMPT, "aspect_ratio": "4:3", "output_format": "jpeg"}, key)
    url = first_image_url(body)
    print("nolan  %.1fs  %s" % (secs, err or ("ok" if url else "no image")))
    if not url:
        sys.exit(1)
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = resp.read()
    for folder in (ROOT / "public" / "nolan", ROOT / "design" / "nolan"):
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "nolan.jpg").write_bytes(data)


if __name__ == "__main__":
    main()
