# Milo

You explain a topic out loud. Milo, a cartoon kid who knows nothing, draws exactly what you said. A weak explanation gets a messy crayon scribble. A good one gets a clean revision sheet. Milo never explains anything. He only asks about your biggest gap, and he grows up as you get it right.

Built at Imperial AI Hack, 14 to 15 November 2026. Track 03: Voice, Vision and Generative Media.

## Read these, in this order

| File | What it is |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | What we are building, screen by screen, and how one turn works |
| [docs/DESIGN.md](docs/DESIGN.md) | The v3 look: colours, type, layout, copy, motion rules |
| [docs/PROMPTS.md](docs/PROMPTS.md) | Every prompt: the tested fal prompts, Claude's brief, Milo's voice |
| [docs/BACKLOG.md](docs/BACKLOG.md) | What to build, in order, with checkpoints |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What we already decided and why. Don't reopen these |
| [docs/SUBMISSION.md](docs/SUBMISSION.md) | Deadlines, rules, the video script, the Devpost checklist |
| [CLAUDE.md](CLAUDE.md) | Rules for any AI working in this repo |

The design itself: [Milo v3 on Claude Design](https://claude.ai/artifact/KAwE1srdFEsi4zZrdwsW3R?sk=u5se3NDV8fmoEE4lxJQz3w#page-717156d19b2e), page "v3, final". That is the look we are going for. A snapshot of those screens is in [design/](design/).

## The one rule

**Nobody pushes to `main`.** Work on your own branch and do whatever you want there.

| Branch | Owner |
|---|---|
| `Antoine` | Antoine |
| `Yusuf` | Yusuf |
| `Ali` | Ali |

`main` only changes through a pull request that the team agrees on. Details in [docs/BACKLOG.md](docs/BACKLOG.md), "How the three branches work".

## Setup

```bash
git clone git@github.com:LumaHack/milo-submission.git
cd milo-submission
git checkout Ali            # or Antoine, or Yusuf
git config core.hooksPath .githooks   # blocks an accidental push to main
cp .env.example .env.local  # then fill in the keys
```

Keys are shared in the team chat, never in this repo. `.env.local` is ignored by git.

There is no app code on `main` yet. Each branch starts its own. The stack we recommend, and the package versions we checked today, are in [docs/SPEC.md](docs/SPEC.md).

### Running the app (branch `Ali`)

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:3000.

| Page | What it is |
|---|---|
| `/` | Start screen. Pick the cell topic or type your own, and how much detail |
| `/session` | The live session. It connects by itself: allow the microphone and start explaining the cell to Milo. The mic button only mutes |
| `/demo` | The scripted run from stored images. No keys or network. The header says "Scripted run" |
| `/sheet` | A session's revision sheet, with a slideshow and a fal film of the drawing growing up |
| `/sheets` | Every session saved in this browser |

It needs `FAL_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in `.env.local`. Milo's agent is created once with `curl -X POST http://localhost:3000/api/elevenlabs/setup`, which prints the id.

**Testing without a microphone** (development only, in the browser console on `/session`):

- `window.miloText()` reconnects to the real ElevenLabs agent in text mode, so no microphone is needed.
- `window.miloSay("...")` says a turn. In text mode Milo answers it for real.
- `window.miloLog` lists everything Milo said, plus the reason for any dropped connection.

**After changing a prompt** in `src/lib/prompts.ts`, restart `pnpm dev` and then run the setup route again. The dev server has twice served an old copy of a changed file to a route, and the agent ended up with an outdated first line. The setup route now prints the first line it sent, so check it.

Use Chrome for the live session. The microphone only works on `localhost` or https.

## What is in here besides docs

- `design/boards/` the four whiteboards, real fal output from our test run
- `design/milo/` Milo at four ages, real fal output
- `design/claude-design/` the v3 screens as HTML, to copy exact sizes and spacing from
- `scripts/fal_speed_test.py` the test that produced the boards and the timings. Run it to check your fal key works
- `scripts/gen_milo.py` the script that drew Milo

## Team

Ali, Yusuf, Antoine.
