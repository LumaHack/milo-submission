# Milo: rules for AI agents working in this repo

This is a hackathon project with a hard deadline: **Sunday 15 Nov 2026, 12:00**. Building is closed from Saturday 21:00 to Sunday 10:00. Everything below exists to get one working, filmed run of Milo before then.

## The look we are going for

**v3 final.** Open it and look at it before you build any screen:

https://claude.ai/artifact/KAwE1srdFEsi4zZrdwsW3R?sk=u5se3NDV8fmoEE4lxJQz3w#page-717156d19b2e

Use the page named "v3, final". Ignore the v1 and v2 pages. Aesthetically it references ElevenLabs: near-white background, black ink, one grey panel holding white cards, pill buttons, no decoration. The only colour on screen comes from Milo and from the crayon drawing. `docs/DESIGN.md` has every token and size written out, and `design/` has a snapshot of the screens and the images.

## Before you write anything

Read, in this order:

1. `docs/SPEC.md` what we are building and how one turn works
2. `docs/DESIGN.md` the look. It is final. Copy it, don't redesign it
3. `docs/PROMPTS.md` the prompts. They were tested. Start from them
4. `docs/BACKLOG.md` what to build next
5. `docs/DECISIONS.md` what is already decided. Don't reopen these without the human asking

## The product in four sentences

A student explains a topic out loud to Milo, a cartoon kid who knows nothing. Milo draws what the student said. The drawing starts as a messy crayon scribble and becomes a clean revision sheet as the explanation improves. Milo follows rather than leads: he asks one small question about the biggest gap, and he ages from 4 to 18 across the session.

Milo is also a bit of a teacher, at one moment only. When the student has tried the same gap twice and is still not there, he says they are onto something, sketches a small hint on the paper in blue dashed pencil, and asks them to build on it. The idea only counts once the student says it in their own words.

Every turn is fact-checked before anything is drawn. A clearly wrong statement goes on the paper small and grey with a red question mark, never as a fact, and Milo asks about it first.

Outside that moment, if a feature idea makes Milo explain, lead, or draw something the student did not say, it is the wrong feature.

## Hard rules

**Git**
- Never push to `main`. Never force-push. Work only on the branch you were started on (`Ali`, `Antoine` or `Yusuf`).
- Commit small and often, with plain messages. A broken build at the deadline loses everything, so keep the branch runnable after every commit.
- The last commit must land before Sunday 12:00.

**Secrets**
- Keys live in `.env.local` only. Never write a key into code, a doc, a commit message, a test or a log line.
- Every vendor key stays on the server. The browser gets short-lived tokens (ElevenLabs conversation token, Anam session token) or calls our own API routes. Never expose `FAL_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` or `ANAM_API_KEY` to client code.
- The repo goes public before submission. Assume everything committed will be read by judges.

**Hackathon rules that can disqualify us**
- All code must be written during the hackathon. Do not paste in code from older projects, starters or templates beyond a framework's own scaffold.
- One project, one track. Don't add features for a different track.

**Honesty**
- Never claim something works that you did not run. If you could not test it, say so.
- The credits line on screen names only tools the run really used. If Anam or Adaption is not wired, it is not in the credits.
- Don't write "full duplex", "emotion detection" or "real-time drawing" anywhere. They are not true for this stack. See `docs/DECISIONS.md`.
- Anything mocked in the demo is listed in `docs/SUBMISSION.md` so the video can say so.

**Design**
- The v3 design is final. Use the tokens in `docs/DESIGN.md` exactly. No new colours, fonts, shadows, gradients or emoji.
- Follow the 20 UX and motion rules in `docs/DESIGN.md`. They are specific to this app, not general advice.
- When unsure about a size or spacing, open the matching file in `design/claude-design/` and copy the inline style.

**Scope**
- Build the backlog in order. P0 before P1 before P2. Don't start a P1 while a P0 is not working end to end.
- Milo is the submission. Nolan (witness interviews) is a separate product in `nolan/`, with its own README and design. Don't mix the two: nothing in `src/` imports from `nolan/`, and Milo's rules about its look and scope do not apply there.
- The demo topic is biology, "How a cell works". Don't generate images of real people, flags or war.

## How to work

- Prefer the boring option. One Next.js app, server routes for anything with a key, no database (the session lives in memory, the revision sheet can use `localStorage`).
- Check a vendor's current docs before writing code against its SDK. These APIs changed recently and memory is unreliable. `docs/SPEC.md` lists what we already verified and where.
- Use the Anthropic SDK for Claude, never a raw `fetch`. Default model `claude-opus-5-5`. Ask for JSON with structured outputs (`output_config.format`), not by parsing free text.
- One board redraw in flight at a time. If a new result arrives while fal is drawing, keep only the newest and drop the rest.
- Keep the old board on screen until the new one has loaded. Never show an empty board.
- If the shared shapes in `docs/SPEC.md` ("The turn contract") need to change, change the doc in the same commit, so the other two branches can follow.
- When you finish a backlog item, tick it in `docs/BACKLOG.md` on your branch and note anything a human must check by hand (microphone, sound, timing).

## Where things are

| Path | Contents |
|---|---|
| `docs/` | Spec, design, prompts, backlog, decisions, submission |
| `design/boards/` | The four reference whiteboards (real fal output) and two rejected ones |
| `design/milo/` | Milo at ages 4, 7, 11, 18 (real fal output) |
| `design/claude-design/` | The v3 screens as HTML. Read for exact styles. Not runnable on their own |
| `scripts/` | The fal test scripts. Python, standard library only |
| `nolan/` | Nolan, a separate app. See `nolan/README.md` |
| `.claude/agents/` | `design-reviewer` and `spec-checker`. Use them before you call a screen done |
