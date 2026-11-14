#!/usr/bin/env python3
"""Draws Milo at four ages with fal, as one 3D character who grows up.

Stage 1 is a new image. Stages 2 to 4 are edits of the one before, so he stays
the same boy. Saves milo_assets/milo3d_1.jpg to milo3d_4.jpg.
"""
import pathlib
import sys
import urllib.request

from fal_speed_test import call, first_image_url, load_key

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "milo_assets"

LOOK = (
    "3D animated film style, smooth stylised 3D render, soft studio lighting, friendly and expressive. "
    "Plain pale lavender background. Head and shoulders, centred. No text."
)
SAME = (
    "Same character, same messy curly brown hair, same navy blue hoodie, same 3D animated film style, "
    "same pale lavender background and framing. "
)
STAGES = [
    "A small boy about five years old with messy curly brown hair and big brown eyes, wearing an oversized "
    "navy blue hoodie, holding a fat pink wax crayon in his fist, head tilted, puzzled, one finger on his chin. " + LOOK,
    SAME + "He is now about nine years old. He holds a coloured pencil, one eyebrow raised, a curious half-smile. No text.",
    SAME + "He is now about thirteen, wearing small round glasses. He holds a marker pen and looks thoughtful, hand on his chin. No text.",
    SAME + "He is now a confident eighteen year old wearing a graduation cap, with a big proud smile and his arms crossed. No text.",
]


def main():
    key = load_key()
    OUT.mkdir(exist_ok=True)
    previous = None
    for i, prompt in enumerate(STAGES, start=1):
        if previous is None:
            body, secs, err = call("google/nano-banana-2-lite", {"prompt": prompt, "aspect_ratio": "4:3", "output_format": "jpeg"}, key)
        else:
            body, secs, err = call("google/nano-banana-2-lite/edit", {"prompt": prompt, "image_urls": [previous], "aspect_ratio": "4:3", "output_format": "jpeg"}, key)
        url = first_image_url(body)
        print("milo3d_%d  %.1fs  %s" % (i, secs, err or ("ok" if url else "no image")))
        if not url:
            sys.exit(1)
        with urllib.request.urlopen(url, timeout=60) as resp:
            (OUT / ("milo3d_%d.jpg" % i)).write_bytes(resp.read())
        previous = url


if __name__ == "__main__":
    main()
