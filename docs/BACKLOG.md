# Backlog

Build in order. P0 is what the video needs. Don't start P1 while a P0 is not working end to end.

Tick items on your own branch as you finish them.

## How the three branches work

`Ali`, `Antoine` and `Yusuf` are three separate attempts at the same spec. Nobody pushes to `main`.

The screens, the prompts and the turn contract are the same for everyone. The part most likely to go wrong is the voice loop, so that is where the attempts should differ.

**All three are live.** In every branch Milo is an ElevenLabs agent in a live conversation: the student just talks, Milo can be interrupted, nobody holds a button. What differs is how the live conversation reaches the brain and the board. A suggested split, swap as you like:

| Branch | Voice loop | Trade-off |
|---|---|---|
| `Ali` | **A. Live agent, scored on the side.** The browser reads the student's transcript from `onMessage`, calls the brain, and sends Claude's hint back to the agent with `sendContextualUpdate` | Least to set up. Milo's first reply each turn comes from his own prompt, before Claude's hint arrives, so his question can lag one turn behind the board |
| `Antoine` | **B. Live agent with a client tool.** The agent calls a browser tool (for example `update_board`) when the student finishes a point. The tool runs the brain and the drawing and returns the hint to the agent | The agent decides when to redraw and waits for the hint, so Milo and the board agree. Depends on the agent's model passing the student's words to the tool correctly, which ElevenLabs' docs warn can be unreliable |
| `Yusuf` | **C. Live agent with Claude as its brain.** The agent's LLM is set to "Custom LLM" and points at our server. One Claude call per turn writes Milo's spoken reply and the score together. The server streams the reply back to ElevenLabs and pushes the score and drawing instruction to the browser | Milo's line and the board always match, and Claude is the only brain. Most setup: see "Approach C needs" below |

**Approach C needs** (from ElevenLabs' custom LLM docs, read Sat 14 Nov):

- Our server exposes an OpenAI-style `/v1/chat/completions` endpoint and answers as a stream (`Content-Type: text/event-stream`, chunks as `data: {json}`, ending with `data: [DONE]`). Streaming is required.
- ElevenLabs must reach it from the internet. Run a tunnel such as ngrok to the dev server and paste that URL in the agent's LLM settings, with a model id and a secret.
- The request carries `messages` (the conversation so far) and, if system tools are on, `tools`. Our endpoint turns that into a Claude call and streams Claude's text back in the OpenAI chunk format.
- If the reply is slow to start, send a first chunk that ends in `"... "` so the audio does not glitch.
- Milo's spoken line must stream first and fast. Run the scoring and drawing instruction so they do not hold up his voice.

**Picking the winner.** Saturday 20:30: whichever branch runs one full four-turn live session on "How a cell works" becomes the base. Open a pull request from it to `main`, the other two review, then everyone branches from the new `main` for polish. If two work, take the one where Milo's question matches the board most reliably. If none works by 20:30, everyone moves to the closest one.

**Last resort only.** If no live loop works by Sunday 10:00: hold to talk, ElevenLabs speech-to-text, the brain, ElevenLabs text-to-speech. It is not a branch plan. It is weaker for the ElevenLabs bounty, and the video would have to say it is not live.

## Checkpoints

| When | What must be true |
|---|---|
| Sat 19:00 | Your branch has the Session screen on screen with the reference images, and one real call to fal working from your code |
| Sat 20:30 | One full four-turn session runs on some branch. Winner picked, pull request to `main` |
| Sat 21:00 | Building closes. Everything committed and pushed |
| Sun 10:00 | Building reopens. Run the session ten times and count how often it works |
| Sun 10:30 | Record the video |
| Sun 11:30 | Submit on Devpost. Repo public |
| Sun 11:50 | Stop. No more commits |
| Sun 12:00 | Hard deadline |

## P0: needed for the video

Ticks below are for the `Ali` branch. Ticked items were run, not just written: four typed turns went through Claude and fal and drew four evolving boards.

- [x] **App skeleton.** Next.js app on your branch, tokens and font from DESIGN.md, `.env.local` loading. *Done when:* the Start screen renders and matches the design.
- [x] **Start screen.** *Done when:* it matches `StartV3` and "How a cell works" opens the session.
- [x] **Session screen with scripted data.** (`/demo`) The four demo turns from DESIGN.md with the images in `design/boards/` and `design/milo/`. Clicking a history frame shows that board, level, age, hint and gaps. Replay steps through them. *Done when:* it matches `MainV3` and a reviewer cannot tell it from the design.
- [x] **Draw route.** DrawRequest in, DrawResult out, right model for the level. *Done when:* the four tested prompts in PROMPTS.md, sent in order, give four boards that look like `design/boards/`.
- [x] **Brain route.** TurnRequest in, TurnResult out, structured output. *Done when:* the four demo turns give sensible levels (1, 2, 3, 4), hints that do not contain the answer, and drawing instructions with nothing the student did not say.
- [x] **Brain plus drawing.** One turn of typed text goes through the brain and then fal, and the new board appears in the session screen with a new history frame. *Done when:* typing the four demo turns produces four evolving boards.
- [x] **Voice.** *On `Ali`: approach A works. Ali spoke to Milo in Chrome on Sat 14 Nov and he answered and redrew. Not yet counted over ten runs.* Your branch's voice loop (A, B or C above). Create Milo's agent in the ElevenLabs dashboard with the prompt and settings in PROMPTS.md. *Done when:* you can explain the cell out loud across four turns in one live conversation, with no button held, interrupting Milo at least once, and Milo answers each time without giving an answer and the board redraws each time.
- [x] **Drawing state.** *Run on `Yusuf`, Sun 15 Nov: four typed sentences 2.5 s apart never emptied the board and it ended on the newest drawing. Not yet tried with fast real speech.* "Milo is drawing…" shows within 100 ms, the old board stays, one redraw in flight, newest result wins. *Done when:* talking fast for 30 seconds never shows an empty or out-of-order board.
- [x] **Failure handling.** *Run on `Yusuf`, Sun 15 Nov: a failed draw call, a failed brain call and a blocked microphone each left the old board up with a plain line, and the next turn caught up to Mastered.* fal slow or failing, Claude returning nothing usable, mic permission denied. *Done when:* each leaves the old board up with a plain message and the session carries on.

## P1: makes it good

- [x] **Revision sheet screen.** Final board, "In your words", "How you got here". Save to `localStorage`. *Done when:* it matches `SheetV3` and survives a page reload.
- [ ] **Level-up moment.** Chip pop, Milo's picture and age change (rules 1, 5, 10 in DESIGN.md). *Done when:* levelling up is the one thing on screen you cannot miss.
- [ ] **Status badge.** Listening, Thinking, Drawing, Milo is talking, Milo is off, driven by the real state.
- [ ] **Live waveform.** The bars move with the microphone level while listening.
- [x] **Scripted fallback mode.** (`/demo`) A switch that runs the session from the reference images with no network. *Done when:* the demo can be filmed even if the venue wifi dies. Say in the video that it is the scripted run if you use it.
- [ ] **Time everything.** Brain call, each fal call, time from end of speech to new board. Write the numbers into SUBMISSION.md for the Q&A.

## P2: only if P0 and P1 are done

- [ ] **Live Milo face (Anam).** Make a custom avatar from `design/milo/stage-1.jpg` cropped square, hands out of frame. Not confirmed that Anam accepts a stylised 3D character. Free plan allows 3 minutes per conversation. If it works, add "Face by Anam" to the credits.
- [ ] **Adaption grader.** Fine-tune a model to label an explanation bad, mid or good, and use it for the crayon level. Training time unknown. If it ships, record the model ID for Devpost and add "Grading by Adaption" to the credits.
- [ ] **"Mm-hm" while the student talks.** ElevenLabs has no setting for it. Play a short clip ourselves during long student turns.
- [ ] **Figma.** Put the v3 screens in a Figma file for the Figma prize. The existing file has older screens.
- [ ] **A second topic.** Key ideas and a test run for "Photosynthesis".
- **Nolan.** Built by Ali as its own product in `nolan/` (D33). Left off the Yusuf branch on purpose: this branch is Milo only.

## Added on the Yusuf branch, overnight Sun 15 Nov

- [x] **Explain your own notes** (D42). Upload on the Start screen, `/api/notes`, notes as the marking scheme, slide references on the sheet. Run with typed turns in the browser and with `sweep.py notes`. *A human must check:* one spoken session from notes with a real microphone, and how the 8 to 11 s "Reading your notes…" wait feels on venue wifi.
- [x] **Off-topic turns** (D45). *A human must check:* how Milo sounds steering back by voice. His instant reply still comes from the unchanged agent prompt.
- [x] **A cheap check for prompt changes.** `scripts/regress/check.py`: eleven moments, about $1, prints what changed since the baseline.
- [x] **Cached turn instructions.** About 90% of each turn's input now comes from the prompt cache. Turn time about the same, cost much lower.
- [x] **Awkward students** (D50). Sixteen edge moments sent to the brain; "I'm done" now wraps up, "I don't know" draws nothing, and Milo's final summary is no longer swapped by mistake. Two of them are in `check.py` (13 cases, all pass). *A human must check:* how the wrap-up sounds by voice when a student says they are done.
- [x] **Voice keeps on target and reconnects** (D51, D52). Milo's voice is told the open gaps; the call reopens by itself if the first try fails. Spoken runs on Sun 15 Nov after the changes: cell, "I'm done", off topic and hint all ended as expected. *A human must check:* one session with a real microphone, and how often the first try fails in a real browser.
- [x] **No answer words** (D44). Unit tests in `scripts/line-check/test.cjs` (21 cases, `node scripts/line-check/test.cjs`). The brain never leaked in the sweep, so the swap has only been seen in those tests.

## Not doing

Points and streaks. Accounts. Mobile layout beyond not breaking. Any language other than English.
