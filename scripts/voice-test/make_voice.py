#!/usr/bin/env python3
"""Makes the student's voice for talk.js: three short WAV files, spoken by an ElevenLabs voice.

Needs ELEVENLABS_API_KEY in .env.local at the top of the repo, and ffmpeg on the path.
Writes scripts/voice-test/out/a1.wav, a2.wav and b.wav. Standard library only.
"""
import json
import pathlib
import subprocess
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"

CLIPS = {
    "a1": "Okay, so a cell has a skin around it,",
    "a2": "and that skin decides what gets in and what gets out.",
    "b": "Inside there are little power stations that make the energy, and the middle bit has the DNA that tells the cell what to do.",
}


def load_key():
    for line in (HERE.parent.parent / ".env.local").read_text().splitlines():
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
