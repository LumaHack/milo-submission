# Nolan

Nolan takes witness accounts for an investigator. He interviews each witness alone, out loud, writes down what they say, then shows the investigator where the accounts agree and where they differ, as a table and as one simple scene per account.

Nolan is its own product. It lives in this folder with its own dependencies and its own dev server, and shares no code with Milo at runtime.

## The four screens

| Screen | Route | Who sees it | What happens |
|---|---|---|---|
| Case file | `/` | Investigator | Open a case, list the witnesses, send each one their interview link |
| Interview | `/interview/<link>` | Witness | Talk to Nolan. His notes appear in his handwriting. No pictures |
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

Open it at `http://localhost:3001`, not at the machine's network address. Browsers only give a page the microphone on `localhost` or on an `https` address.

Nolan's ElevenLabs agent needs no setup. The first interview finds it by name in the workspace, creates it if it is missing, and brings its prompt up to date from `src/lib/prompts.ts`.

## How one interview works

1. The witness opens their link, reads what will happen and agrees. Only then does the microphone open.
2. Nolan (an ElevenLabs agent, turn-taking set to patient) asks for free recall: "Tell me what you saw, from the moment you first noticed something."
3. After each thing the witness says, the browser sends the transcript so far to `/api/extract`. Claude returns the notes: one per detail, in the witness's words, with how sure they sounded and anything they took back.
4. The notes appear on screen in Nolan's handwriting. A correction is crossed out. "Not sure about…" is written under a note the witness sounded unsure of.
5. Nolan asks about details the witness has not covered, then asks if there is anything else, then thanks them.

"Take a break" hangs up and keeps the notes. "Carry on" reconnects and tells Nolan what is already covered.

## Who does what

| Job | Tool | Where |
|---|---|---|
| Nolan's voice and ears | ElevenLabs Agents | `src/lib/agent.ts`, `src/app/api/token` |
| Nolan's face, optional and not yet run | Anam | `src/app/api/face`, `startFace` in `src/components/interview.tsx` |
| The interview plan, the notes, the comparison, the scene instructions | Claude (`claude-opus-5-5`, structured output) | `src/lib/brain.ts`, `src/app/api/case`, `extract`, `compare` |
| The scenes | fal (`google/nano-banana-2-lite`, then `/edit` for each witness) | `src/app/api/draw` |

Every key stays on the server. The browser gets a short-lived ElevenLabs token and calls our own routes.

## Interview links

"Send interview link" copies a link that opens one witness's interview on their own device. The case file updates while they talk.

- The link holds a long random token. It opens that one account: the questions and that witness's own notes. It cannot reach another witness, the comparison or a scene.
- The case file, the comparison, the scenes and the drawing route are only served to the machine Nolan runs on (requests to `localhost`). Any other address gets "This is for the investigator". This is a demo-grade guard, not a login.
- The two routes an interview uses (the voice token and the notes) only answer a request that carries a link that is on file.
- **A phone needs https for its microphone.** Plain `pnpm dev` sends links over http, which a phone's browser refuses the microphone on, and the interview screen says so in plain words. To send links that work, start Nolan over https instead:

```bash
pnpm dev:https
```

Then open `https://localhost:3443`. Links now start with `https://<this machine's network address>:3443`, and a phone on the same Wi-Fi can open one and talk. The certificate is made on this machine and no browser knows it, so the investigator's browser and each phone show a warning once: choose "Advanced", then "Proceed". Nothing leaves the local network. For witnesses who are not on the same network, set `NOLAN_PUBLIC_URL` to a real https address for this machine.

Cases are kept in one JSON file, `.data/cases.json`, on the machine that runs Nolan. It is ignored by git. On a host with a read-only disk the cases last only as long as the process.

## What was run, and what was not

Run on Sat 14 Nov on the case "bike theft outside the library" with three witnesses:

- **A spoken interview on the investigator's device.** `scripts/voice-test/talk.js` opens a witness's link in headless Chrome, plays generated speech into the page's microphone, and prints what Nolan heard, said and wrote. Four spoken turns, Nolan answered 1.6 to 2.8 s after the witness stopped, all five details were noted, the self-correction was crossed out and the unsure answer was marked. Speech-to-text heard "twenty to six" as "20 to 6:00".
- **A spoken interview through a sent link, over https.** The same test with `pnpm dev:https`, opening the link at `https://192.168.x.x:3443/interview/<token>` the way a witness's device would. The page had a microphone (secure context), all four turns were heard and noted, Nolan's own voice arrived (the level meter peaked at 0.94 while he talked), and that address was refused the case file (403).
- An interview through a link over plain http, in text mode. The case file showed "Interview in progress" while it ran.
- An interview on the investigator's device, in text mode, with a break and resume.
- The comparison, the shared scene and the witness scenes from fal, with three and with four witnesses, and the report page.
- Type-check, lint and a production build.

Not run:

- **A person talking to Nolan.** Both spoken tests use generated speech and a simulated microphone in Chrome. Nobody has listened to his voice or tried pausing mid-sentence.
- **A real phone.** The https link was opened by Chrome on this machine at the network address, with the certificate warning accepted by a flag. A phone on the Wi-Fi should behave the same after "Proceed", but none was tried.
- **Nolan's Anam face.** No key. See "What is not built".
- An internet tunnel for witnesses on another network.

## What is not built, or not proven

- **Nolan's live face is wired but has never run.** The design gives Nolan an Anam face. The code for it is in place and follows Anam's ElevenLabs guide: the server asks Anam for a session that connects to Nolan's ElevenLabs agent (`src/app/api/face/session`), and the interview streams the face into Nolan's picture and reads what was said from Anam's transcript events (`startFace` in `src/components/interview.tsx`). No Anam key was available, so none of it has been run, and it should be treated as untested until someone watches it work. To try it, add `ANAM_API_KEY` and `ANAM_AVATAR_ID` (a Cara 4 avatar from lab.anam.ai/avatars) to `.env.local` and restart. Things to check on the first run: that his opening line and questions are the case's own (the prompt blanks are sent as `dynamicVariables`), that notes appear after each answer, and that "Take a break" and "Carry on" work. On this path Nolan cannot be sent the mid-interview notes he gets on the voice path, so he decides by himself when everything is covered. If the face fails to start, the interview carries on with his voice alone. Without the two values the app shows what the design's artboard draws, an orange swirl with a head and shoulders that moves with the voice, and the credits do not name Anam.
- **Adaption.** The design tunes the questions with a fine-tuned model. Here the open-question rules are in the prompts. The credits do not name Adaption.
- **Audio recording.** The agent is created with voice recording off. The screen says "Transcribed with your consent", not "Recording".
- **A login.** Anyone on the machine that runs Nolan is the investigator.

## Design

The look is the "Nolan" artifact: https://claude.ai/artifact/Dipb7XVcyE4uqWQ8VZpE1A

A snapshot of its five artboards is in `design/`. Sizes and colours in `src/app/globals.css` are copied from them. It is the same quiet look as Milo (near-white page, black ink, one grey panel of white cards, pill buttons) plus Caveat for Nolan's handwriting.

## Where things are

| Path | Contents |
|---|---|
| `src/lib/nolan.ts` | The shared shapes: case, witness, fact, comparison |
| `src/lib/prompts.ts` | Every prompt, and Nolan's agent prompt |
| `src/lib/server-store.ts` | Cases in `.data/cases.json`, interview links, and who may see what |
| `src/lib/store.ts` | The investigator's copy of the cases, kept in step with the server |
| `scripts/voice-test/` | The spoken test: generated speech into a simulated microphone |
| `scripts/https-dev.mjs` | `pnpm dev:https`: Nolan over https on the local network, with a certificate made on this machine |
| `src/lib/use-case-work.ts` | Runs the comparison and the scene drawing once, and stores the result |
| `src/components/` | One file per screen |
| `design/` | The design artboards as HTML. Read for exact styles |
