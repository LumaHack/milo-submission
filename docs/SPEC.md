# Milo: the spec

## What it is

A study tool built on one idea: you only understand something if you can explain it. The student explains a topic out loud to Milo. Milo is a cartoon kid who knows nothing. He draws exactly what he hears on a sheet of paper, so the student sees their own explanation, gaps and all.

- A weak explanation gets a messy crayon scribble with question marks.
- A good explanation gets a clean, labelled revision sheet.
- Milo follows, he does not lead. He repeats back a few of your words and asks one small question about your biggest gap, in at most 20 words. He speaks once per turn.
- He is also a bit of a teacher, at one moment: after two failed tries at the same gap he says you are onto something, sketches a small hint on the paper, and asks you to build on it. If you are still stuck after that, he wraps up and tells you what to look up.
- The student picks how much detail Milo holds them to: Basics, Exam or Deep.
- Milo grows up as the explanation improves: age 4, 7, 11, 18.
- Every board is kept. The session can be replayed, and the last board is saved as a revision sheet.

**The user in the demo:** a first-year biology student revising "How a cell works" the night before a test.

**Closest existing product:** flashcard and quiz apps test recall of someone else's wording. Milo tests whether you can build the explanation yourself, and shows you what is missing instead of telling you.

## Screens

The exact look of each is in [DESIGN.md](DESIGN.md).

| Screen | Route (suggested) | What happens |
|---|---|---|
| Start | `/` | Upload your own notes, or pick a subject, how much detail, then one of four topics |
| Session | `/session` | Talk to Milo. Board on the right, Milo on the left |
| Revision sheet | `/sheet` | The final board, the explanation in the student's words, how the level climbed |
| Replay | inside Session | The history strip plays the boards in order, 1.4 s each |
| History | `/sheets` | Every session saved in this browser, newest first. Pick one to open its sheet |
| Slideshow | inside Revision sheet | Full screen. Each board with what the student said and what Milo asked. Advances by itself |
| Film | inside Revision sheet | A fal video of the first board turning into the last. Made when the student presses "Make a film" |

**Biology, "How a cell works"** is the hand-written, most-tested topic and opens at once. Every other topic on the Start screen (eight per subject, four shown at a time) is set up on the spot, and the student can also **type any topic**: `/api/topic` has Claude turn it into a title, Milo's opening question and five key ideas (three core), and refuses anything that is not a school topic or is not safe to draw.

**Your own notes.** The student can upload their slides (saved as PDF), lecture notes, a transcript (`.txt`, `.md`, `.vtt`, `.srt`) or photos of slides: up to 5 files, 20 MB. `/api/notes` reads them in one Claude call (about 8 to 11 s for an 8-slide deck) and sets up to four topics, each with five key ideas taken only from the notes, every idea and fact tagged with where it is ("slide 6"). The files are never stored; the topics are kept in `localStorage`. In a session from notes the notes are the marking scheme: a claim that contradicts them is flagged, a claim they don't mention is not scored unless it is clearly false, swapping two parts from the notes counts as wrong even at Basics, and the wrap-up and the revision sheet say which slide to look at. `NEXT_PUBLIC_MILO_NOTES=0` hides the upload.

## One turn, step by step

1. **The student talks.** Milo's ElevenLabs agent is listening. It is a back-and-forth, not a speech: Milo comes in at the first small pause. The student can interrupt him at any time.
2. **The turn ends.** The agent decides the student has paused (turn-taking set to eager). The browser receives the final transcript of what the student said.
3. **The brain scores it.** The browser sends everything the student has said so far to our server. Claude returns: the status of each key idea, the crayon level, the biggest gap, Milo's hint, a one-line version of what the student said, and the drawing instruction. See "The turn contract".
   - **Fact check first.** The same call lists anything clearly false in the turn (`wrongClaims`), before any drawing is asked for. A wrong claim is never drawn as a fact: it goes on the paper small, in grey pencil, with a red question mark, and Milo asks about it first.
   - **Off topic.** Small talk, jokes, another subject or "just tell me the answer" sets `offTopic`. The turn is not scored or drawn, and it is dropped from the explanation so it never counts as a try towards a hint. Milo's next line brings the student back to the gap.
   - **No answer words.** Each key idea lists its `terms` (the proper names that would give it away). The brain is told not to use them before the student does, and the server checks Milo's lines and swaps one that leaks for a plain line.
   - **A note within about 2.6 s.** As soon as the brain answers, Milo jots the student's words on the paper in his handwriting. The real drawing replaces the note when fal returns.
4. **The board redraws.** If the turn added something drawable, our server calls fal with the drawing instruction and the current board image. fal returns the edited board. This takes 5 to 9 seconds on the fast model and about 22 seconds for the final sheet.
5. **The screen updates.** The new board replaces the old one. A new frame is added to the history strip. The crayon level, the gap list and Milo's age update.
6. **Milo speaks.** Milo asks about the biggest gap. See "Who writes Milo's line" below.
   - **Two failed tries at the same gap:** the brain sets `help`. The redraw adds a small blue dashed hint sketch, and when it lands Milo gets a cue to say his teacher line. The frame is labelled "Milo's hint".
   - **Still stuck two turns after the hint:** the brain sets `stuck`, and the engine ignores it if fewer than two turns have passed. Milo wraps up, the gaps heading becomes "Look these up next", and the sheet button turns black.
7. Repeat until every key idea is clear. Then Milo says he gets it, switches himself off, and the revision sheet is offered.

While step 3 and 4 run, the old board stays visible. From about 2.6 seconds in it carries Milo's jotted note of what the student said, with "Milo is drawing this…" under it. The student can keep talking.

## The turn contract

These shapes are shared by all three branches. Change them only together with this doc.

**Request to the brain**

```ts
type TurnRequest = {
  topic: {                       // sent by the browser, so topics the student typed work too
    title: string;
    keyIdeas: {
      id: string;
      idea: string;
      gap?: string;        // the gap label on screen
      where?: string;      // topics from notes only: where the notes say it, "slide 6"
      terms?: string[];    // words that would give the idea away. Milo may only say them once the student has
    }[];                   // the ideas marked at the chosen level of detail
    notes?: { facts: { text: string; where: string }[] };   // topics from notes only: the notes are the marking scheme
  };
  detail: "basics" | "exam" | "deep";   // level of detail, chosen on the Start screen
  studentTurns: string[];        // everything the student has said, oldest first. Last entry is the new turn
  helpedGapIds: string[];        // gaps Milo has already sketched a hint for. He helps once per gap
  turnsSinceHint: number | null; // scored turns since his last hint. He may only wrap up after two
  previousLevel: 1 | 2 | 3 | 4 | null;   // null on the first turn
  previousDrawPrompt: string | null;     // the instruction that made the board on screen. null if no board yet
};
```

**Response from the brain**

```ts
type TurnResult = {
  ideas: { id: string; status: "missing" | "vague" | "clear" | "wrong" }[];  // one per key idea
  level: 1 | 2 | 3 | 4;
  biggestGapId: string | null;   // null when every idea is clear
  wrongClaims: string[];         // the fact check: clearly false statements in the latest turn, in the student's words
  hint: string;                  // Milo's next line. At most 20 words, one question. On a help turn: his teacher line
  help: boolean;                 // true after two failed tries at the same gap: Milo sketches a hint
  stuck: boolean;                // true when the student is still stuck after the hint: Milo wraps up
  offTopic: boolean;             // small talk, a joke, another subject, "just tell me": not scored, not drawn, dropped from studentTurns
  said: string;                  // the latest turn as one sentence, max 20 words, in the student's words
  changed: boolean;              // false = nothing new to draw, leave the board alone
  drawPrompt: string;            // instruction for fal. Repeats the previous one when changed is false
  drew: string;                  // one sentence Milo says about what he just drew. Empty when changed is false
  checked?: { leaks: string[]; fallback: boolean };   // added by the server: a line that used a term was swapped for a safe one
};
```

**Request to draw**

```ts
type DrawRequest = {
  prompt: string;
  previousImageUrl: string | null;   // null draws a new board. Otherwise this board is edited
  level: 1 | 2 | 3 | 4;              // picks the fal model
  detail: "basics" | "exam" | "deep";   // the careful model draws every level 4 sheet (MILO_CAREFUL_FINAL=0: only above Basics)
};
type DrawResult = { imageUrl: string; endpoint: string; seconds: number };
```

**A frame in the history strip**

```ts
type Frame = {
  turn: number;
  level: 1 | 2 | 3 | 4;
  said: string;
  imageUrl: string;
  at: number;        // seconds since the session started
  hint: string;
  gaps: string[];    // gap labels still open after this turn, biggest first
  hinted?: boolean;  // this board carries Milo's hint sketch
};
```

**Rules the code enforces, whatever the model returns**

- The level never goes down within a session. Milo does not shrink.
- An off-topic turn never changes the board, never counts as a try towards a hint or a wrap-up, and is removed from `studentTurns` before the next turn.
- If `hint` or `drew` uses one of the topic's `terms` that the student has not said (and that is not in a gap label or the title), the server swaps it for a plain line that cannot give anything away (`src/lib/line-check.ts`).
- If `changed` is false, do not call fal.
- One redraw in flight. If a newer result arrives while fal is drawing, keep only the newest and drop anything in between.
- The old board stays on screen until the new image has finished loading.

## Topic and key ideas

The key ideas are the marking scheme. Claude scores each one every turn. The student never sees the "idea" text, only the gap label, which is a question so it never gives the answer away.

**Biology: How a cell works** (`cell`)

| id | A complete explanation says | Gap label on screen |
|---|---|---|
| `membrane` | The cell membrane surrounds the cell and controls what enters and leaves | What lets things in |
| `energy` | Mitochondria release the cell's energy, as ATP | Where the energy comes from |
| `nucleus` | The nucleus holds the DNA, which carries the instructions for the cell | Who gives the instructions |
| `ribosomes` | Ribosomes build proteins by following those instructions | How proteins get made |
| `golgi` | The rough ER and the Golgi process, pack and send the proteins where they are needed | Where the proteins go next |

Other topics shown on the Start screen, not built: How the heart pumps blood, How a neuron fires, Photosynthesis.

## Level of detail

Chosen on the Start screen, remembered in the browser. It sets which key ideas are marked and how strict "clear" is. The default is Basics, because Exam was too hard to finish when spoken out loud.

| Level | Key ideas marked | An idea is clear when |
|---|---|---|
| Basics | The core ones: `membrane`, `energy`, `nucleus` | The part and its job are described in everyday words. No proper name needed |
| Exam | All five | The part is named and its job is stated correctly |
| Deep | All five | Named, job stated, and linked to at least one other part |

## Crayon levels

| Level | Name | When | Board looks like | Milo's age |
|---|---|---|---|---|
| 1 | Crayon | No key idea is clear | Very messy childish crayon, question marks | 4 |
| 2 | Sketching | Ideas are there but vague, or only one is clear | Rough crayon outline, question marks where vague | 7 |
| 3 | Clearer | At least two key ideas are clear, none wrong | Neater coloured pencil, handwritten labels with arrows | 11 |
| 4 | Mastered | Every key idea is clear | Clean revision sheet, title, label boxes | 18 |

A wrong idea is drawn the way the student said it, and becomes the biggest gap.

## Who does what

| Job | Tool | Notes |
|---|---|---|
| Milo's voice and ears | **ElevenLabs** Agents | Live conversation. Central to the product: no voice, no Milo |
| Whiteboard | **fal** | One edit per turn. Central: the drawing is the feedback |
| Scoring and drawing instruction | **Claude** (Anthropic API) | One structured call per turn |
| Milo's face | Four fal images first. **Anam** live avatar if there is time | See backlog |
| Grade | Claude's level first. **Adaption** fine-tune if it trains in time | See backlog |
| Design | Claude Design, v3 final | See [DESIGN.md](DESIGN.md) |

### fal: which model, measured

From our test on Sat 14 Nov (`scripts/fal_speed_test.py`), one run each. The images are in `design/boards/`.

| Use | Endpoint | Time | Result |
|---|---|---|---|
| First board (new image) | `google/nano-banana-2-lite` | 5.2 s | Good |
| Levels 2 and 3 (edit) | `google/nano-banana-2-lite/edit` | 7.5 to 9.2 s | Good. Keeps the same paper and cell, spells labels right |
| Level 4 (edit) | `fal-ai/nano-banana-pro/edit` | 22.1 s | Good. The fast model mislabelled the final sheet, this one did not |
| Rejected | `fal-ai/flux-2/flash/edit` | 4.9 s | Redrew the whole picture and misspelled labels |

How to call it (this is what the test script does, and it works):

```
POST https://fal.run/<endpoint>
Authorization: Key $FAL_KEY
Content-Type: application/json

{ "prompt": "...", "image_urls": ["<previous board url>"], "aspect_ratio": "16:9", "output_format": "jpeg" }
```

Leave `image_urls` out for the first board. The image is at `images[0].url` in the response. In JavaScript the same call is `fal.subscribe(endpoint, { input })` from `@fal-ai/client`, and the image is at `result.data.images[0].url`.

These are single runs. Time your own before the demo and plan for the slow case.

### ElevenLabs: what is true

Checked against the ElevenLabs docs and the installed SDK types on Sat 14 Nov.

- Package `@elevenlabs/react`. Hooks need a `ConversationProvider` above them. `useConversation` is the combined hook.
- Start with `startSession({ conversationToken })` (WebRTC) or `{ signedUrl }` (WebSocket). A public agent needs only `{ agentId }`.
- The server gets a token with `GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=…` and header `xi-api-key`. The token is at `body.token`. For a signed URL the path is `/v1/convai/conversation/get-signed-url` and the value is at `body.signed_url`.
- `onMessage` receives `{ message, source: "user" | "ai", … }`: the student's transcript and Milo's replies. `source` is marked deprecated in favour of `role`. Read the type before using it.
- `sendContextualUpdate(text)` gives the agent information without making it speak. `sendUserMessage(text)` makes it reply.
- `isSpeaking` and `onModeChange` tell you when Milo is talking or listening. Use them for the status badge.
- Agent settings: interruptions on, turn eagerness Eager / Normal / Patient, turn timeout 1 to 30 s. We use Eager with speculative turn on, so Milo comes in at the first small pause.
- An existing agent is updated with `PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}`.
- Client tools exist: the agent can call a function in the browser. Names must match the dashboard exactly. Tick "Wait for response" on the tool if the agent should get the return value.
- The agent's LLM can be set to "Custom LLM": ElevenLabs then calls our own server for every reply. The server must expose an OpenAI-style `/v1/chat/completions` endpoint, answer as a server-sent event stream, and be reachable from the internet (a tunnel such as ngrok during development).

Not available, so do not promise it:

- No back-channel setting ("mm-hm" while the student talks). If we want it, we play it ourselves.
- The docs do not say "full duplex". Say "live and interruptible".
- Speech-to-text returns no emotion, sentiment or gender. Only words, timestamps, audio event tags such as laughter, and speaker labels.

### Who writes Milo's line

The ElevenLabs agent replies as soon as the student stops. Claude's scored hint arrives a few seconds later. So:

- Milo's own agent prompt ([PROMPTS.md](PROMPTS.md)) makes him a confused kid who asks about the weakest part and never explains. That covers the reply he gives straight away.
- After each scored turn, send Claude's hint to the agent with `sendContextualUpdate`. Milo uses it the next time the student stops. This keeps Milo's question in line with the gap shown on screen.

This is approach A. Two other live ways to do it are in [BACKLOG.md](BACKLOG.md), one per branch: the agent calls a browser tool and waits for the hint (B), or Claude is the agent's own LLM so one call writes both Milo's line and the score (C). All three are live conversations. None is hold-to-talk.

### Claude: how to call it

- Official SDK `@anthropic-ai/sdk`. Model `claude-opus-5-5`.
- Ask for the `TurnResult` as structured output: `client.messages.parse({ …, output_config: { format: zodOutputFormat(TurnResultSchema) } })` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`. Read `response.parsed_output`.
- Thinking cannot be turned off on this model. Set `output_config.effort` to `"low"` to keep the turn fast.
- Check `response.stop_reason` before reading the result. Handle `"refusal"` and `"max_tokens"`.
- The system prompt and the user message are in [PROMPTS.md](PROMPTS.md).
- **Not measured yet:** how long this call takes. Time it on the first run. If it is too slow, the model is one setting to change.

### Anam: what is true

- Package `@anam-ai/js-sdk`. The server gets a session token from `POST https://api.anam.ai/v1/auth/session-token` (header `Authorization: Bearer <key>`, body `{ personaConfig: { name, avatarId, voiceId, llmId, systemPrompt } }`). The token is at `sessionToken`.
- In the browser: `createClient(sessionToken)` then `streamToVideoElement("<video element id>")`. The video element needs `autoplay` and `playsinline`.
- A custom avatar can be made from one photo on every plan. It shows head and shoulders. Hands are out of frame.
- Free plan: 30 minutes a month, 3 minutes per conversation, 1 session at a time.
- **Not confirmed:** whether a stylised 3D character like Milo is accepted as a custom avatar, and whether Anam can speak with the ElevenLabs agent's audio. Test before relying on it.

### Adaption: what is true

- Optional prize: credits, ranked by win rate against the base model. The Devpost form needs the model ID.
- Planned use: a fine-tuned grader that labels an explanation bad, mid or good.
- **Not known:** training time. Nobody has started it. Treat it as a bonus.

## Speed

Measured on Sat 14 Nov. One turn is Claude then fal, one after the other.

| Step | Time | Note |
|---|---|---|
| Claude scoring, fast mode | 1.9 to 2.9 s | `speed: "fast"` on `claude-opus-5-5`. Standard speed took 4.9 to 5.1 s. Fast mode costs about twice as much per token. Turn it off with `MILO_FAST=0` |
| Claude scoring on `claude-haiku-5-5` | 6.3 to 7.5 s | Slower here, so we did not switch |
| Claude scoring with the instructions cached | 1.5 to 3.8 s, average 2.1 to 2.4 s | Sun 15 Nov. The turn instructions are sent with `cache_control`, so about 90% of each turn's input is read from cache once warm. Faster by about 0.1 s, much cheaper per turn. `scripts/regress/check.py` prints the cache share |
| fal, first board | about 4 s | |
| fal, edit with the fast model | 7 to 9 s | This is the floor for a redraw. The endpoint has no smaller or faster setting |
| fal, final sheet with the careful model | 17 to 19 s | Used for every final sheet since Sun 15 Nov (D48). `MILO_CAREFUL_FINAL=0` goes back to the fast model at Basics |
| fal film, first board to last | 214 s, one run | Only on request, from the revision sheet. The browser starts the job and checks on it every 5 s |

## Recommended stack

Each branch may choose its own. This is what we checked installs and exists today (Sat 14 Nov):

| Package | Version |
|---|---|
| `next` (App Router, TypeScript, Tailwind 4) | 16.4.6 |
| `react` | 19.3.0 |
| `@anthropic-ai/sdk` | 1.8.0 |
| `@elevenlabs/react` | 1.22.1 |
| `@fal-ai/client` | 1.11.0 |
| `@anam-ai/js-sdk` | 4.29.2 |
| `zod` | 4.6.7 |

Next 16 differs from older versions. Its own docs ship in `node_modules/next/dist/docs/`. Read the page you need before writing against it.

Suggested server routes, all `POST`, all reading keys from the environment:

| Route | Does |
|---|---|
| `/api/turn` | TurnRequest in, TurnResult out. Calls Claude |
| `/api/draw` | DrawRequest in, DrawResult out. Calls fal |
| `/api/elevenlabs/token` | Returns a conversation token for Milo's agent |
| `/api/topic` | `{ title }` in, a Topic out. Claude writes the key ideas for a typed topic |
| `/api/notes` | Multipart `files` in (PDF, text, transcript, PNG/JPG/WebP; up to 5, 20 MB). `{ files, topics, seconds }` out. Claude sets up topics from the notes alone. Files are held in memory only |
| `/api/film` | `POST { firstImageUrl, lastImageUrl }` starts a film and returns `{ requestId }`. `GET ?id=` returns `{ status: "working" }` or `{ status: "done", videoUrl }`. fal `bytedance/seedance-2.0/fast/image-to-video` with a start and an end frame |
| `/api/elevenlabs/setup` | Development. Creates Milo's agent, or updates it from `src/lib/prompts.ts` |
| `/api/anam/token` | Optional. Returns an Anam session token |

No database. The session lives in memory in the browser. Finished boards, the chosen topic and the level of detail are kept in `localStorage` (`src/lib/history.ts`), up to 24 sessions.

Milo's agent prompt and first line have blanks (`{{topic_about}}`, `{{topic_title}}`, `{{milo_first_line}}`). The browser fills them per session with `dynamicVariables` in `startSession`, so one agent works for every topic.

## Out of scope

- Nolan, the witness-interview product. It is not part of Milo and is not on this branch (it lives in `nolan/` on Ali's branch).
- A moving Milo. We tried turning his picture into a video with fal. The video model refused it as a possible likeness of a real person.
- Points, streaks, leaderboards.
- Accounts and login.
