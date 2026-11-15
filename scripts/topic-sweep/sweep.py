"""Runs scripted typed turns through Milo's real pipeline: /api/topic, /api/turn and /api/draw.

It sends what the browser engine (src/lib/use-milo-session.ts) sends, so the numbers match a real
session without a microphone. Use it as a before-and-after check whenever a prompt changes.

Needs the dev server on http://localhost:3000 and the keys in .env.local. Each run spends a little
Claude and fal credit (about $1 for the three topics).

    python3 scripts/topic-sweep/sweep.py OUT_DIR                 all topics
    python3 scripts/topic-sweep/sweep.py OUT_DIR cell            one topic
    python3 scripts/topic-sweep/sweep.py OUT_DIR --no-draw       score only, no fal
    python3 scripts/topic-sweep/sweep.py OUT_DIR --offtopic-early   the off-topic line second, mid-session

Writes OUT_DIR/<topic>.json with every request result and prints a short table.
Standard library only.
"""

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:3000"

# The cell preset, copied from src/lib/topics.ts. The other topics are set up by /api/topic.
CELL = {
    "title": "How a cell works",
    "keyIdeas": [
        {"id": "membrane", "idea": "The cell membrane surrounds the cell and controls what enters and leaves.", "gapLabel": "What lets things in", "core": True},
        {"id": "energy", "idea": "Mitochondria release the cell's energy, as ATP.", "gapLabel": "Where the energy comes from", "core": True},
        {"id": "nucleus", "idea": "The nucleus holds the DNA, which carries the instructions for the cell.", "gapLabel": "Who gives the instructions", "core": True},
        {"id": "ribosomes", "idea": "Ribosomes build proteins by following those instructions.", "gapLabel": "How proteins get made", "core": False},
        {"id": "golgi", "idea": "The rough ER and the Golgi process, pack and send the proteins where they are needed.", "gapLabel": "Where the proteins go next", "core": False},
    ],
}

# Weak, vague, better, good, then one turn that has nothing to do with the topic.
TOPICS = {
    "cell": {
        "preset": CELL,
        "turns": [
            "The cell does stuff and keeps the body alive.",
            "The cell takes in things and makes energy.",
            "The membrane controls what enters, and mitochondria make the energy.",
            "The nucleus has the DNA, which is like the instructions for the whole cell.",
            "Anyway, what's your favourite football team?",
        ],
    },
    "pythagoras": {
        "typed": "Pythagoras' theorem",
        "turns": [
            "It's about triangles and some kind of formula.",
            "You square the sides and add them up, I think, and that gives you something.",
            "In a right-angled triangle the two short sides squared and added together equal the long side squared, the hypotenuse.",
            "So if the short sides are 3 and 4 the long side is 5, because 9 plus 16 is 25, and you use it to find a missing side.",
            "Can you just tell me the answer instead?",
        ],
    },
    "pyramids": {
        "typed": "How the pyramids were built",
        "turns": [
            "Lots of people built them a really long time ago.",
            "They cut big stones and moved them somehow, maybe with ramps or something.",
            "Paid workers cut limestone blocks with copper tools and dragged them on wooden sledges, wetting the sand so they slid.",
            "They built ramps up the sides to haul the blocks higher, and the whole thing was a tomb for the pharaoh.",
            "Tell me a joke about cats.",
        ],
    },
}


def post(path, body, timeout=120):
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read())
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
        try:
            data = json.loads(error.read())
        except ValueError:
            data = {"error": f"HTTP {error.code}"}
    return status, data, round(time.time() - started, 2)


def ideas_for(topic, detail):
    ideas = topic["keyIdeas"]
    return [idea for idea in ideas if idea["core"]] if detail == "basics" else ideas


def run_topic(name, spec, detail, draw):
    record = {"name": name, "detail": detail, "turns": []}
    if "preset" in spec:
        topic = spec["preset"]
    else:
        status, topic, seconds = post("/api/topic", {"title": spec["typed"]})
        record["setup"] = {"status": status, "seconds": seconds, "topic": topic}
        if status != 200:
            print(f"  setup failed ({status}): {topic.get('error')}")
            return record
    record["title"] = topic["title"]
    key_ideas = ideas_for(topic, detail)

    turns, helped = [], []
    hinted_at, level, board_url, board_prompt = None, None, None, None
    for text in spec["turns"]:
        turns.append(text)
        request = {
            "topic": {
                "title": topic["title"],
                "keyIdeas": [
                    {key: value for key, value in {
                        "id": idea["id"], "idea": idea["idea"], "gap": idea["gapLabel"],
                        "terms": idea.get("terms"), "where": idea.get("where"),
                    }.items() if value is not None}
                    for idea in key_ideas
                ],
                **({"notes": topic["notes"]} if topic.get("notes") else {}),
            },
            "detail": detail,
            "studentTurns": list(turns),
            "helpedGapIds": list(helped),
            "turnsSinceHint": None if hinted_at is None else len(turns) - hinted_at,
            "previousLevel": level,
            "previousDrawPrompt": board_prompt,
        }
        status, result, seconds = post("/api/turn", request)
        entry = {"said": text, "status": status, "seconds": seconds, "result": result}
        record["turns"].append(entry)
        if status != 200:
            print(f"  turn failed ({status}): {result.get('error')}")
            continue

        # Off-topic turns are dropped from the explanation, as the engine does.
        if result.get("offTopic"):
            turns.pop()
        helping = result["help"] and result.get("biggestGapId")
        if helping:
            helped.append(result["biggestGapId"])
            hinted_at = len(turns)
        level = result["level"]

        if draw and (result["changed"] or helping) and result["drawPrompt"] != board_prompt:
            draw_request = {"prompt": result["drawPrompt"], "previousImageUrl": board_url, "level": level, "detail": detail}
            draw_status, drawn, draw_seconds = post("/api/draw", draw_request, timeout=90)
            entry["draw"] = {"status": draw_status, "seconds": draw_seconds, "result": drawn}
            if draw_status == 200:
                board_url, board_prompt = drawn["imageUrl"], result["drawPrompt"]
    record["topic"] = topic
    return record


def main():
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    out_dir, wanted = args[0], args[1:] or list(TOPICS)
    draw = "--no-draw" not in sys.argv
    detail = next((arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--detail=")), "basics")

    for name in wanted:
        print(f"\n== {name} ({detail})")
        spec = TOPICS[name]
        if "--offtopic-early" in sys.argv:
            # The off-topic line second, so it lands mid-session instead of after Mastered.
            turns = spec["turns"]
            spec = {**spec, "turns": [turns[0], turns[-1], *turns[1:-1]]}
        record = run_topic(name, spec, detail, draw)
        with open(f"{out_dir}/{name}.json", "w") as handle:
            json.dump(record, handle, indent=2)
        for i, entry in enumerate(record["turns"], 1):
            result = entry["result"]
            if entry["status"] != 200:
                print(f"  {i}. ERROR {entry['status']}")
                continue
            drawn = entry.get("draw")
            draw_note = f"draw {drawn['seconds']}s" if drawn and drawn["status"] == 200 else ("draw FAILED" if drawn else "no draw")
            flags = []
            if result.get("offTopic"):
                flags.append("OFF-TOPIC")
            if result.get("wrongClaims"):
                flags.append(f"wrong={result['wrongClaims']}")
            if result.get("help"):
                flags.append("HELP")
            if result.get("stuck"):
                flags.append("STUCK")
            checked = result.get("checked")
            if checked and checked.get("fallback"):
                flags.append(f"LEAK-FALLBACK {checked.get('leaks')}")
            print(f"  {i}. L{result['level']} {entry['seconds']}s, {draw_note}, gap={result['biggestGapId']} {' '.join(flags)}")
            print(f"     Milo: {result['hint']}")


if __name__ == "__main__":
    main()
