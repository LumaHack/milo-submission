# Nolan

Nolan takes witness accounts for an investigator. He interviews each witness alone, out loud, writes down what they say, then shows the investigator where the accounts agree and where they differ, as a table and as one simple scene per account.

Nolan is its own product. It lives in this folder with its own dependencies and its own dev server, and shares no code with Milo at runtime.

## The four screens

| Screen | Route | Who sees it | What happens |
|---|---|---|---|
| Case file | `/` | Investigator | Open a case, list the witnesses, start each interview |
| Interview | `/interview` | Witness | Talk to Nolan. His notes appear in his handwriting. No pictures |
| Compare accounts | `/compare` | Investigator | One row per detail, one column per witness, and what to ask next |
| Scenes | `/scenes` | Investigator | One shared scene from what everyone agrees on, then one scene per witness |

There is also `/report`: the comparison, the scenes and every witness's notes on one page to print.

## How Nolan protects an account

These are product rules, not nice-to-haves. A feature that breaks one is the wrong feature.

- Each witness is interviewed alone.
- Nolan asks open questions and never suggests an answer. He never says what another witness said.
- No pictures exist until every interview is finished. Scenes are only drawn once every listed witness has been interviewed.
- Scenes are for the investigator. A witness never sees one.
- A scene shows only what was said. Where accounts differ, the shared scene is left blank.
- Scenes are reconstructions, not evidence. They are diagrams, so they cannot pass for a photo or look like a real person.
- Accounts carry no names. A witness is "Witness 1".

## Run it

```bash
cd nolan
pnpm install
cp .env.example .env.local   # then fill in the three keys
pnpm dev                     # http://localhost:3001
```

Nolan's ElevenLabs agent needs no setup. The first interview finds it by name in the workspace, creates it if it is missing, and brings its prompt up to date from `src/lib/prompts.ts`.

## How one interview works

1. The witness reads what will happen and agrees. Only then does the microphone open.
2. Nolan (an ElevenLabs agent, turn-taking set to patient) asks for free recall: "Tell me what you saw, from the moment you first noticed something."
3. After each thing the witness says, the browser sends the transcript so far to `/api/extract`. Claude returns the notes: one per detail, in the witness's words, with how sure they sounded and anything they took back.
4. The notes appear on screen in Nolan's handwriting. A correction is crossed out. "Not sure about…" is written under a note the witness sounded unsure of.
5. Nolan asks about details the witness has not covered, then asks if there is anything else, then thanks them.

"Take a break" hangs up and keeps the notes. "Carry on" reconnects and tells Nolan what is already covered.

## Who does what

| Job | Tool | Where |
|---|---|---|
| Nolan's voice and ears | ElevenLabs Agents | `src/lib/agent.ts`, `src/app/api/token` |
| The interview plan, the notes, the comparison, the scene instructions | Claude (`claude-opus-5-5`, structured output) | `src/lib/brain.ts`, `src/app/api/case`, `extract`, `compare` |
| The scenes | fal (`google/nano-banana-2-lite`, then `/edit` for each witness) | `src/app/api/draw` |

Every key stays on the server. The browser gets a short-lived ElevenLabs token and calls our own routes.

## What was run, and what was not

Run on Sat 14 Nov, in the browser, on the case "bike theft outside the library" with three witnesses:

- Opening a case, adding witnesses, the consent step.
- Three full interviews with the real ElevenLabs agent **in text mode** (typed turns over a WebSocket, no microphone), including a break and resume, a self-correction and an unsure answer.
- The comparison, the three scenes and the shared scene from fal, and the report page.

Not run:

- **A spoken interview.** The voice path is the same code Milo uses, but nobody has talked to Nolan out loud yet. Check the microphone prompt, his voice, and how patient turn-taking feels.
- More than three witnesses, and a second case topic.

## What is not built

- **Sending an interview link.** The design shows "Send interview link" so each witness can use their own device. Cases live in this browser's `localStorage`, so the interviews happen on the investigator's device, one witness at a time. A link needs a server store.
- **Nolan's face.** The design has a live Anam face. The app shows the design's placeholder: an orange swirl with a head and shoulders that moves with the voice. The credits do not name Anam.
- **Adaption.** The design tunes the questions with a fine-tuned model. Here the open-question rules are in the prompts. The credits do not name Adaption.
- **Audio recording.** The agent is created with voice recording off. The screen says "Transcribed with your consent", not "Recording".

## Design

The look is the "Nolan" artifact: https://claude.ai/artifact/Dipb7XVcyE4uqWQ8VZpE1A

A snapshot of its five artboards is in `design/`. Sizes and colours in `src/app/globals.css` are copied from them. It is the same quiet look as Milo (near-white page, black ink, one grey panel of white cards, pill buttons) plus Caveat for Nolan's handwriting.

## Where things are

| Path | Contents |
|---|---|
| `src/lib/nolan.ts` | The shared shapes: case, witness, fact, comparison |
| `src/lib/prompts.ts` | Every prompt, and Nolan's agent prompt |
| `src/lib/store.ts` | Cases in `localStorage` |
| `src/lib/use-case-work.ts` | Runs the comparison and the scene drawing once, and stores the result |
| `src/components/` | One file per screen |
| `design/` | The design artboards as HTML. Read for exact styles |
