"""A small, cheap check of Milo's brain against the real API, with a readable "what changed" report.

Eleven moments from a session, each sent once to /api/turn (Claude only, no drawing, so no fal cost).
Each answer is checked against what Milo should do, and compared with the saved baseline so you can
see what a prompt or code change did. About 11 Claude calls, roughly $1 a run, done in about 15 s.

Needs the dev server on http://localhost:3000 and ANTHROPIC_API_KEY in .env.local.

    python3 scripts/regress/check.py              check, then show what changed since the baseline
    python3 scripts/regress/check.py --lines      also print every line Milo would say
    python3 scripts/regress/check.py --save       make this run the new baseline (do it after a good run)
    python3 scripts/regress/check.py weak wrong   only the cases whose name contains one of these words

The model is not perfectly repeatable: Milo's wording changes every run, so only his behaviour is
compared (level, gaps, off topic, fact check, hint). A single failed check can be chance; run it again
before changing a prompt because of it.

Standard library only.
"""

import concurrent.futures
import importlib.util
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:3000"
HERE = os.path.dirname(os.path.abspath(__file__))
BASELINE = os.path.join(HERE, "baseline.json")

# The cell preset, shared with the sweep so there is one copy in scripts/.
_spec = importlib.util.spec_from_file_location("sweep", os.path.join(HERE, "..", "topic-sweep", "sweep.py"))
_sweep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sweep)
CELL = _sweep.CELL

# A topic made from our own test notes (scripts/notes-test), fixed here so no upload call is needed.
NOTES = {
    "title": "Parts of an animal cell",
    "keyIdeas": [
        {"id": "membrane", "idea": "Every animal cell is wrapped in a cell membrane, the cell's gatekeeper, which lets food and oxygen in and lets waste out.", "gapLabel": "What decides what goes in and out", "core": True, "where": "slide 2", "terms": ["membrane", "phospholipid bilayer"]},
        {"id": "nucleus", "idea": "The nucleus is the control centre and holds the DNA, which carries the instructions for making proteins.", "gapLabel": "What is in charge of the cell", "core": True, "where": "slide 4", "terms": ["nucleus", "DNA", "chromatin"]},
        {"id": "mitochondria", "idea": "Mitochondria are the cell's battery packs: they carry out aerobic respiration and release energy as ATP.", "gapLabel": "Where the cell's energy comes from", "core": True, "where": "slide 3", "terms": ["mitochondria", "mitochondrion", "ATP", "aerobic respiration"]},
    ],
    "notes": {"facts": [
        {"text": "Every animal cell is wrapped in a cell membrane.", "where": "slide 2"},
        {"text": "The cell membrane is selectively permeable and is called the cell's gatekeeper.", "where": "slide 2"},
        {"text": "The membrane lets food and oxygen in and lets waste out.", "where": "slide 2"},
        {"text": "In this course mitochondria are called the cell's battery packs.", "where": "slide 3"},
        {"text": "Mitochondria carry out aerobic respiration: glucose + oxygen.", "where": "slide 3"},
        {"text": "The energy from respiration is released as ATP.", "where": "slide 3"},
        {"text": "The nucleus is the control centre.", "where": "slide 4"},
        {"text": "The nucleus holds the DNA, packed as chromatin.", "where": "slide 4"},
        {"text": "The DNA carries the instructions for making proteins.", "where": "slide 4"},
        {"text": "Ribosomes read the DNA's instructions and build the proteins.", "where": "slide 4"},
    ]},
}

# Each case is one moment in a session: what the student has said so far, and what Milo should do next.
# "expect" only lists what matters for that moment.
CASES = [
    {"name": "weak start", "why": "A vague first turn stays at Crayon and is not off topic.",
     "topic": CELL, "turns": ["The cell does stuff and keeps the body alive."],
     "expect": {"level": 1, "offTopic": False, "wrong": False}},
    {"name": "everything clear", "why": "All three Basics ideas in one go reaches Mastered with no gap left.",
     "topic": CELL, "turns": ["The membrane controls what goes in and out, the mitochondria make the energy as ATP, and the nucleus has the DNA with the instructions."],
     "expect": {"level": 4, "gap": None, "offTopic": False}},
    {"name": "wrong claim", "why": "A false statement is caught by the fact check and Milo asks about it.",
     "topic": CELL, "turns": ["The energy in a cell comes from its skin."],
     "expect": {"wrong": True, "offTopic": False}},
    {"name": "wrong name at basics", "why": "D36: at Basics the job counts, not the name. 'Cell wall' for the membrane is fine.",
     "topic": CELL, "turns": ["Things get in through the cell wall, it's semi-permeable."],
     "expect": {"ideas": {"membrane": "clear"}, "wrong": False}},
    {"name": "analogy is on topic", "why": "An analogy is explaining, not small talk.",
     "topic": CELL, "turns": ["It's like a little factory with a wall around it that decides what gets in."],
     "expect": {"offTopic": False}},
    {"name": "small talk", "why": "Football is off topic: not scored, nothing redrawn.",
     "topic": CELL, "turns": ["The cell takes in things and makes energy.", "Anyway, what's your favourite football team?"], "previousLevel": 2,
     "expect": {"offTopic": True, "changed": False, "wrong": False}},
    {"name": "asks for the answer", "why": "Milo says he doesn't know, that's why he's asking.",
     "topic": CELL, "turns": ["The cell takes in things and makes energy.", "Can you just tell me the answer?"], "previousLevel": 2,
     "expect": {"offTopic": True, "hintStarts": "I don't know"}},
    {"name": "hint after two misses", "why": "D30: two failed tries at the same gap, so Milo sketches a hint.",
     "topic": CELL, "turns": [
         "Things get into the cell through its membrane, and the nucleus has the DNA that gives the instructions.",
         "The energy comes from the skin of the cell.",
         "Erm, maybe the energy just comes from the air around it?"],
     "previousLevel": 3, "expect": {"help": True, "gap": "energy"}},
    {"name": "exam needs names", "why": "At Exam, 'a wall' and 'a power part' are not named, so neither idea is clear.",
     "topic": CELL, "detail": "exam", "turns": ["The cell has a wall that lets things in and a power part that makes energy."],
     "expect": {"ideas": {"membrane": "not clear", "energy": "not clear"}}},
    {"name": "notes: swapped parts", "why": "D43: with notes, giving one part another part's job is wrong, even at Basics.",
     "topic": NOTES, "turns": ["The mitochondria hold the DNA and give the cell its instructions."],
     "expect": {"wrong": True}},
    {"name": "notes: true but not in notes", "why": "D42: a true claim the notes don't mention is not flagged.",
     "topic": NOTES, "turns": ["The cell is wrapped in a gatekeeper membrane that lets food and oxygen in.", "Plant cells also have chloroplasts that make sugar from sunlight."],
     "previousLevel": 2, "expect": {"wrong": False, "offTopic": False}},
]

BANNED_OPENERS = ("you said", "mmhh", "hmm", "wait", "ooh", "hang on")
PRAISE = ("brilliant", "great", "nice", "love that", "onto something")


def request_for(case):
    detail = case.get("detail", "basics")
    ideas = [idea for idea in case["topic"]["keyIdeas"] if idea["core"] or detail != "basics"]
    topic = {
        "title": case["topic"]["title"],
        "keyIdeas": [
            {key: value for key, value in {
                "id": idea["id"], "idea": idea["idea"], "gap": idea["gapLabel"],
                "where": idea.get("where"), "terms": idea.get("terms"),
            }.items() if value is not None}
            for idea in ideas
        ],
    }
    if case["topic"].get("notes"):
        topic["notes"] = case["topic"]["notes"]
    return {
        "topic": topic,
        "detail": detail,
        "studentTurns": case["turns"],
        "helpedGapIds": [],
        "turnsSinceHint": None,
        "previousLevel": case.get("previousLevel"),
        "previousDrawPrompt": None,
    }


def call(case):
    body = json.dumps(request_for(case)).encode()
    request = urllib.request.Request(BASE + "/api/turn", data=body, headers={"Content-Type": "application/json"}, method="POST")
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read()), round(time.time() - started, 2)
    except urllib.error.HTTPError as error:
        return {"error": f"HTTP {error.code}: {error.read()[:200]!r}"}, round(time.time() - started, 2)
    except urllib.error.URLError as error:
        return {"error": f"Is the dev server running? {error.reason}"}, 0


def checks(case, result):
    """Returns a list of (what was checked, passed, what came back)."""
    out = []
    expect = case["expect"]
    status = {idea["id"]: idea["status"] for idea in result.get("ideas", [])}
    if "level" in expect:
        out.append((f"level {expect['level']}", result["level"] == expect["level"], result["level"]))
    if "gap" in expect:
        out.append((f"biggest gap {expect['gap']}", result["biggestGapId"] == expect["gap"], result["biggestGapId"]))
    if "offTopic" in expect:
        out.append((f"off topic {'yes' if expect['offTopic'] else 'no'}", result.get("offTopic") == expect["offTopic"], result.get("offTopic")))
    if "changed" in expect:
        out.append((f"redraw {'yes' if expect['changed'] else 'no'}", result["changed"] == expect["changed"], result["changed"]))
    if "wrong" in expect:
        flagged = bool(result.get("wrongClaims"))
        out.append((f"fact check {'flags it' if expect['wrong'] else 'flags nothing'}", flagged == expect["wrong"], result.get("wrongClaims")))
    if "help" in expect:
        out.append((f"hint sketch {'yes' if expect['help'] else 'no'}", result["help"] == expect["help"], result["help"]))
    if "hintStarts" in expect:
        out.append((f"line starts \"{expect['hintStarts']}\"", result["hint"].startswith(expect["hintStarts"]), result["hint"][:40]))
    for idea, want in expect.get("ideas", {}).items():
        got = status.get(idea, "missing")
        ok = got != "clear" if want == "not clear" else got == want
        out.append((f"{idea} {want}", ok, got))

    # Rules for every line Milo says.
    hint = result["hint"]
    words = len(hint.split())
    finished = result["biggestGapId"] is None or result["stuck"]
    limit = 60 if finished else 40 if result["help"] else 20
    out.append((f"line at most {limit} words", words <= limit, words))
    if not finished:
        out.append(("exactly one question mark", hint.count("?") == 1, hint.count("?")))
    lower = hint.lower()
    out.append(("no banned opener", not lower.startswith(BANNED_OPENERS), hint.split(" ")[0]))
    out.append(("no praise", not any(re.search(rf"\b{word}\b", lower) for word in PRAISE), ""))
    checked = result.get("checked") or {}
    out.append(("no answer word (no swap needed)", not checked.get("fallback"), checked.get("leaks")))
    return out


def behaviour(result):
    """What is compared between runs. Milo's exact wording is not: it changes every time."""
    return {
        "level": result.get("level"),
        "gap": result.get("biggestGapId"),
        "offTopic": result.get("offTopic"),
        "changed": result.get("changed"),
        "help": result.get("help"),
        "stuck": result.get("stuck"),
        "wrongClaims": len(result.get("wrongClaims") or []),
        "ideas": {idea["id"]: idea["status"] for idea in result.get("ideas", [])},
    }


def main():
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    cases = [case for case in CASES if not args or any(word in case["name"] for word in args)]
    print(f"Sending {len(cases)} turns to /api/turn (Claude only, no drawing)…\n")

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        answers = list(pool.map(call, cases))

    baseline = {}
    if os.path.exists(BASELINE):
        with open(BASELINE) as handle:
            baseline = json.load(handle)

    run, failures, changes = {}, 0, []
    for case, (result, seconds) in zip(cases, answers):
        name = case["name"]
        if "error" in result:
            failures += 1
            print(f"✗ {name}: {result['error']}\n")
            continue
        results = checks(case, result)
        bad = [item for item in results if not item[1]]
        failures += bool(bad)
        print(f"{'✓' if not bad else '✗'} {name}  ({seconds}s)  {case['why']}")
        for label, ok, got in results:
            if not ok:
                print(f"    FAILED: {label}. Got: {got}")
        if "--lines" in sys.argv or bad:
            print(f"    Milo: {result['hint']}")
            if result.get("wrongClaims"):
                print(f"    Flagged: {result['wrongClaims']}")
        now = behaviour(result)
        run[name] = {"behaviour": now, "seconds": seconds, "hint": result["hint"]}

        before = baseline.get(name)
        if before:
            # A change in something this case checks matters. A change in anything else may just be chance.
            tested = {"level": "level", "gap": "gap", "offTopic": "offTopic", "changed": "changed", "help": "help",
                      "wrongClaims": "wrong", "ideas": "ideas"}
            diff = [
                f"{key}: {before['behaviour'].get(key)} → {value}" + ("" if tested.get(key) in case["expect"] else "   (not checked by this case, may be chance)")
                for key, value in now.items()
                if before["behaviour"].get(key) != value
            ]
            if diff:
                changes.append((name, diff, before["hint"], result["hint"]))
        print()

    usage = [result.get("usage") for result, _ in answers if isinstance(result, dict) and result.get("usage")]
    if usage:
        read = sum(entry["cacheRead"] for entry in usage)
        total = sum(entry["input"] + entry["cacheRead"] + entry["cacheWrite"] for entry in usage)
        print(f"Prompt cache: {read} of {total} input tokens read from cache ({100 * read // max(total, 1)}%)")
        # List prices for claude-opus-5-5 in fast mode, per million tokens: input $8, output $40,
        # cache write 1.25x input, cache read 0.05x of the standard $4 doubled for fast mode. An estimate.
        dollars = sum(
            entry["input"] * 8 + entry["cacheWrite"] * 10 + entry["cacheRead"] * 0.4 + entry["output"] * 40
            for entry in usage
        ) / 1_000_000
        out_tokens = sum(entry["output"] for entry in usage) / len(usage)
        print(f"Estimated Claude cost per turn: ${dollars / len(usage):.3f} (fast mode list prices), {out_tokens:.0f} output tokens on average")
    times = [entry["seconds"] for entry in run.values()]
    if times:
        print(f"Turn time: {min(times)} to {max(times)} s, average {sum(times) / len(times):.2f} s", end="")
        old = [baseline[name]["seconds"] for name in run if name in baseline]
        print(f" (baseline average {sum(old) / len(old):.2f} s)" if old else "")
    print(f"{len(cases) - failures} of {len(cases)} cases passed.")

    if baseline:
        print("\nWhat changed since the baseline:")
        if not changes:
            print("  Nothing in Milo's behaviour. (His wording always varies a little.)")
        for name, diff, old_hint, new_hint in changes:
            print(f"  {name}")
            for line in diff:
                print(f"    {line}")
            print(f"    before: {old_hint}\n    now:    {new_hint}")
    else:
        print("\nNo baseline yet. Run again with --save to keep this run as the baseline.")

    if "--save" in sys.argv:
        with open(BASELINE, "w") as handle:
            json.dump({**baseline, **run}, handle, indent=2)
        print(f"\nSaved as the baseline: {os.path.relpath(BASELINE)}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
