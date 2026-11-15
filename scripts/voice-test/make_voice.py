#!/usr/bin/env python3
"""Makes the student's voice for talk.js: three short WAV files, spoken by an ElevenLabs voice.

Needs ELEVENLABS_API_KEY in .env.local at the top of the repo, and ffmpeg on the path.
Writes one WAV per clip into scripts/voice-test/out/. Skips clips that already exist. Standard library only.
Usage: python3 make_voice.py [voice_id]   or   python3 make_voice.py --mac   (the Mac's own voice, no key needed).
"""
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"

CLIPS = {
    "a1": "Okay, so a cell has a skin around it,",
    "a2": "and that skin decides what gets in and what gets out.",
    "b": "Inside there are little power stations that make the energy, and the middle bit has the DNA that tells the cell what to do.",
    # The hint run: right about the skin, wrong twice about the energy, then building on Milo's hint.
    "h1": "A cell has a skin around it that decides what gets in and what gets out.",
    "h2": "The energy comes from the skin itself, I think.",
    "h3": "I'm not sure, maybe the energy just comes from the air around the cell.",
    "h4": "Oh, so there are little power stations inside the cell that make the energy.",
    "h5": "And the middle bit has the DNA that tells the cell what to do.",
    # The off-topic run: a real start, small talk, asking for the answer, then the rest of the explanation.
    "o2": "Anyway, what's your favourite football team?",
    "o3": "Can you just tell me the answer instead?",
    # the "done" run: one idea, an honest "I don't know", then asking to stop
    "d2": "Um, I don't know what makes the energy.",
    "d3": "That's all I know, I'm done.",
    # The notes run, on scripts/notes-test/cell-notes.pdf: right, then two parts swapped, then corrected.
    "n1": "The cell is wrapped in a membrane, a gatekeeper that lets food and oxygen in and waste out.",
    "n2": "The mitochondria hold the DNA and give the cell its instructions.",
    "n3": "Sorry, I mean the mitochondria are the battery packs that make the energy, and the nucleus is the control centre with the DNA.",
}


def load_env(name):
    for line in (HERE.parent.parent / ".env.local").read_text().splitlines():
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip()
    return None


def load_key():
    key = load_env("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("No ELEVENLABS_API_KEY in .env.local.")
    return key


def api(url, key, payload=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload else None,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST" if payload else "GET",
    )
    return urllib.request.urlopen(req, timeout=60).read()


def pick_voice(key):
    """A voice id given on the command line (such as one of ElevenLabs' public premade voices), else the
    first voice on the account, else ELEVENLABS_VOICE_ID for a key that is not allowed to list voices."""
    ids = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    if ids:
        print("voice:", ids[0])
        return {"voice_id": ids[0]}
    try:
        voice = json.loads(api("https://api.elevenlabs.io/v1/voices", key))["voices"][0]
        print("voice:", voice["name"])
        return voice
    except urllib.error.HTTPError:
        voice_id = load_env("ELEVENLABS_VOICE_ID")
        if not voice_id:
            raise SystemExit("This key cannot list voices. Pass a voice id: python3 make_voice.py <voice_id>")
        print("voice: the one in ELEVENLABS_VOICE_ID")
        return {"voice_id": voice_id}


def main():
    OUT.mkdir(exist_ok=True)
    key = None if "--mac" in sys.argv else load_key()
    if "--mac" in sys.argv:
        # The Mac's own speech, for an ElevenLabs key that may only run agents. No key, no cost.
        for name, text in CLIPS.items():
            if (OUT / (name + ".wav")).exists():
                continue
            aiff = OUT / (name + ".aiff")
            subprocess.run(["say", "-v", "Samantha", "-o", str(aiff), text], check=True)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff), "-ar", "48000", "-ac", "1", str(OUT / (name + ".wav"))], check=True)
            aiff.unlink()
            print("made", name + ".wav (Mac voice)")
        return
    voice = pick_voice(key)
    for name, text in CLIPS.items():
        if (OUT / (name + ".wav")).exists():
            continue
        mp3 = OUT / (name + ".mp3")
        mp3.write_bytes(api("https://api.elevenlabs.io/v1/text-to-speech/%s?output_format=mp3_44100_128" % voice["voice_id"], key, {"text": text}))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(OUT / (name + ".wav"))], check=True)
        mp3.unlink()
        print("made", name + ".wav")


if __name__ == "__main__":
    main()
