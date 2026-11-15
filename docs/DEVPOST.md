# Devpost entry: text to paste

Everything here describes the `Ali` branch as it stood on Sunday 15 November, 11:00. Nolan is not part of this entry.

## Fields

| Field | Value |
|---|---|
| Project name | Milo |
| Track | 03, Voice, Vision and Generative Media |
| Bounties | fal, ElevenLabs |
| Repo | https://github.com/LumaHack/milo-submission |
| Video | https://www.youtube.com/watch?v=Z5pfUKr4XBE (1:52) |
| Team | add every member: full name, Luma email, university email |

## Tagline

Explain a topic out loud to a kid who knows nothing. He draws exactly what you said, so you can see what you don't understand yet.

## The problem

The night before a test, a student has read the chapter three times and still cannot explain it. Reading feels like knowing. Flashcards and quizzes check whether you recognise an answer, not whether you can build the explanation yourself. The fastest way to find the hole in your understanding is to explain the topic to someone who knows nothing, and most students have nobody to do that with at midnight.

## What we built

Milo is a cartoon kid who knows nothing. You pick a topic and explain it to him out loud.

- **He draws what you said, and only that.** A vague explanation gets a messy crayon scribble. A clear one gets a clean, labelled revision sheet. The same drawing grows up across the session, so you watch your own understanding take shape.
- **He follows, he does not lead.** After each thing you say, Milo asks one small question about the biggest gap. He never explains and never uses a word you have not used.
- **He checks facts before he draws.** A clearly wrong statement goes on the paper small and grey with a red question mark, never as a fact, and Milo asks about it first.
- **He teaches at one moment only.** If you try the same gap twice and are still not there, he sketches a small hint on the paper in blue dashed pencil and asks you to build on it. The idea only counts once you say it in your own words. If you still miss it, he lets that bit go and moves on.
- **He grows up with you.** Milo ages from 4 to 18 as your explanation improves.
- **You leave with a revision sheet.** The final board, your explanation in your own words, how your level climbed turn by turn, and what to look up next. You can replay the session as a slideshow or have fal turn the first and last boards into a short film.

You can also type in any topic of your own, choose how much detail Milo should expect, and reopen past sheets.

## How it works

One Next.js app. Every vendor key stays on the server; the browser only gets a short-lived ElevenLabs conversation token.

1. **Voice (ElevenLabs Agents).** Milo is an ElevenLabs agent connected over WebRTC. It handles listening, turn-taking, interruption and speech. The agent has one client tool, `next_line`. Before every reply it calls that tool in the browser, which waits for Claude's verdict on the turn the student just finished and hands back Milo's line. So the voice never answers from a stale turn. The agent also speaks up by itself when a hint sketch or the final sheet lands, nudges when the student goes quiet, and hangs up when the lesson is over.
2. **Brain (Claude).** Each student turn goes to `claude-opus-5-5` through the Anthropic SDK with structured outputs. One call fact-checks the turn, scores every key idea as missing, vague or clear, picks the biggest gap, writes Milo's next line and writes the drawing instruction. The response is streamed, so Milo's line is ready after 1.0 to 1.8 seconds while the rest is still arriving.
3. **Drawing (fal).** Every board is an edit of the previous image, so it is the same drawing getting better. One redraw runs at a time. Turns that arrive while fal is drawing are folded into the next edit, and the old board stays on screen until the new one has loaded.
4. **Rules the app enforces, not the model.** At most two questions per gap, then the hint. One try after the hint, then Milo leaves that gap. The level never drops. The lesson ends when every idea is clear or every open gap has been let go.

## APIs and models

| Used for | Service | Model or API |
|---|---|---|
| Milo's voice, listening, turn-taking, client tool | ElevenLabs | Agents platform over WebRTC, `@elevenlabs/react`. The agent's own language model is `claude-haiku-5-5` |
| Fact check, scoring, Milo's line, drawing instruction | Anthropic | `claude-opus-5-5`, low effort, fast mode, structured outputs, streamed |
| Setting up a typed-in topic | Anthropic | `claude-opus-5-5` |
| First board | fal | `google/nano-banana-2-lite` |
| Board edits, every turn | fal | `google/nano-banana-2-lite/edit` |
| Final sheet at the higher detail levels | fal | `fal-ai/nano-banana-pro/edit` |
| Film of the first board becoming the last | fal | `bytedance/seedance-2.0/fast/image-to-video` |
| Milo's four portraits, ages 4, 7, 11 and 18 | fal | `google/nano-banana-2-lite` for the first, then `google/nano-banana-2-lite/edit` for each older age. Made during the hackathon by `scripts/gen_milo.py`, stored in `design/milo/` |

Built with: Next.js 16, React 19, TypeScript, Tailwind CSS 4, zod, pnpm.

**Datasets:** none. There is no training and no database. A session lives in memory, and finished sheets are kept in the browser's `localStorage`.

## What is real and what is mocked

- Real: the voice conversation, the scoring, every board redraw, the film.
- Not live: Milo's face is four fal portraits swapped by level, not a live avatar.
- Scripted: the `/demo` page replays stored boards with no voice and no calls. Its own credits line says so.

## How it was tested

- Ten spoken sessions on Sunday morning, run by a script that plays recorded speech into the page's microphone against the live agent: five straight explanations and five where the student gets the energy wrong twice and needs the hint. All ten reached the final sheet with no error on screen.
- Milo usually replied 1.5 to 2.8 seconds after the student's words were transcribed. The slowest reply was 4.8 seconds. A board redraw takes 5 to 9 seconds.
- Honest limits: these runs used recorded speech in a quiet setup. Other topics than the cell work but are less tested.

## What we would do next

- A live face for Milo.
- Mark a session against the student's own notes or slides.
- A teacher view: which gaps a whole class keeps hitting.
- Measure whether students who explain to Milo do better on the test than students who reread.
