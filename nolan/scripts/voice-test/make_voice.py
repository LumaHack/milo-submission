#!/usr/bin/env python3
"""Makes a witness's voice for talk.js: short WAV files spoken by an ElevenLabs voice.

Needs ELEVENLABS_API_KEY in .env.local (in this folder's app, or the repo above it) and ffmpeg on the path.
Writes scripts/voice-test/out/w1.wav to w4.wav. Standard library only.
"""
import json
import pathlib
import subprocess
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"

CLIPS = {
    "w1": "I was across the road, at about twenty to six. There was one man, on his own, by the library doors, and he took a black bike from the middle of the rack.",
    "w2": "He had a dark jacket on. No, that is wrong. It was a red jacket.",
    "w3": "Um, I think he went right, towards the road. I am not sure about that.",
    "w4": "No, that is everything I remember.",
}


def load_key():
    for folder in (HERE.parent.parent, HERE.parent.parent.parent):
        env = folder / ".env.local"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("ELEVENLABS_API_KEY="):
                    return line.split("=", 1)[1].strip()
    raise SystemExit("No ELEVENLABS_API_KEY in .env.local.")


def api(url, key, payload=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload else None,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST" if payload else "GET",
    )
    return urllib.request.urlopen(req, timeout=60).read()


def main():
    key = load_key()
    OUT.mkdir(exist_ok=True)
    voice = json.loads(api("https://api.elevenlabs.io/v1/voices", key))["voices"][0]
    print("voice:", voice["name"])
    for name, text in CLIPS.items():
        mp3 = OUT / (name + ".mp3")
        mp3.write_bytes(api("https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128" % voice["voice_id"], key, {"text": text}))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(OUT / (name + ".wav"))], check=True)
        mp3.unlink()
        print("made", name + ".wav")


if __name__ == "__main__":
    main()
