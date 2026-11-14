# Backlog

Build in order. P0 is what the video needs. Don't start P1 while a P0 is not working end to end.

Tick items on your own branch as you finish them.

## How the three branches work

`Ali`, `Antoine` and `Yusuf` are three separate attempts at the same spec. Nobody pushes to `main`.

The screens, the prompts and the turn contract are the same for everyone. The part most likely to go wrong is the voice loop, so that is where the attempts should differ. A suggested split, swap as you like:

| Branch | Voice loop | Trade-off |
|---|---|---|
| `Ali` | **A. Live agent, scored on the side.** ElevenLabs agent talks to the student. The browser reads the transcript from `onMessage`, calls the brain, and sends Claude's hint back with `sendContextualUpdate` | Truly live and interruptible. Milo's first reply each turn comes from his own prompt, before Claude's hint arrives |
| `Antoine` | **B. Live agent with a client tool.** Same agent, but it calls a browser tool (for example `update_board`) when the student finishes a point, and the tool runs the brain and the drawing | The agent decides when to redraw. Depends on the agent's model passing the student's words to the tool correctly, which ElevenLabs' docs warn can be unreliable |
| `Yusuf` | **C. Turn-based fallback.** Hold to talk. ElevenLabs speech-to-text, then the brain, then ElevenLabs text-to-speech reads Claude's hint | Simplest and most predictable. Milo says exactly Claude's hint. Not live, and weaker for the ElevenLabs bounty |

**Picking the winner.** Saturday 20:30: whichever branch runs one full four-turn session on "How a cell works" becomes the base. Open a pull request from it to `main`, the other two review, then everyone branches from the new `main` for polish. If two work, take the one that is live. If none works by 20:30, everyone moves to the closest one.

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

- [ ] **App skeleton.** Next.js app on your branch, tokens and font from DESIGN.md, `.env.local` loading. *Done when:* the Start screen renders and matches the design.
- [ ] **Start screen.** *Done when:* it matches `StartV3` and "How a cell works" opens the session.
- [ ] **Session screen with scripted data.** The four demo turns from DESIGN.md with the images in `design/boards/` and `design/milo/`. Clicking a history frame shows that board, level, age, hint and gaps. Replay steps through them. *Done when:* it matches `MainV3` and a reviewer cannot tell it from the design.
- [ ] **Draw route.** DrawRequest in, DrawResult out, right model for the level. *Done when:* the four tested prompts in PROMPTS.md, sent in order, give four boards that look like `design/boards/`.
- [ ] **Brain route.** TurnRequest in, TurnResult out, structured output. *Done when:* the four demo turns give sensible levels (1, 2, 3, 4), hints that do not contain the answer, and drawing instructions with nothing the student did not say.
- [ ] **Brain plus drawing.** One turn of typed text goes through the brain and then fal, and the new board appears in the session screen with a new history frame. *Done when:* typing the four demo turns produces four evolving boards.
- [ ] **Voice.** Your branch's voice loop (A, B or C above). Create Milo's agent in the ElevenLabs dashboard with the prompt and settings in PROMPTS.md. *Done when:* you can explain the cell out loud across four turns, Milo answers each time without giving an answer, and the board redraws each time.
- [ ] **Drawing state.** "Milo is drawing…" shows within 100 ms, the old board stays, one redraw in flight, newest result wins. *Done when:* talking fast for 30 seconds never shows an empty or out-of-order board.
- [ ] **Failure handling.** fal slow or failing, Claude returning nothing usable, mic permission denied. *Done when:* each leaves the old board up with a plain message and the session carries on.

## P1: makes it good

- [ ] **Revision sheet screen.** Final board, "In your words", "How you got here". Save to `localStorage`. *Done when:* it matches `SheetV3` and survives a page reload.
- [ ] **Level-up moment.** Chip pop, Milo's picture and age change (rules 1, 5, 10 in DESIGN.md). *Done when:* levelling up is the one thing on screen you cannot miss.
- [ ] **Status badge.** Listening, Thinking, Drawing, Milo is talking, Mic is off, driven by the real state.
- [ ] **Live waveform.** The bars move with the microphone level while listening.
- [ ] **Scripted fallback mode.** A switch that runs the session from the reference images with no network. *Done when:* the demo can be filmed even if the venue wifi dies. Say in the video that it is the scripted run if you use it.
- [ ] **Time everything.** Brain call, each fal call, time from end of speech to new board. Write the numbers into SUBMISSION.md for the Q&A.

## P2: only if P0 and P1 are done

- [ ] **Live Milo face (Anam).** Make a custom avatar from `design/milo/stage-1.jpg` cropped square, hands out of frame. Not confirmed that Anam accepts a stylised 3D character. Free plan allows 3 minutes per conversation. If it works, add "Face by Anam" to the credits.
- [ ] **Adaption grader.** Fine-tune a model to label an explanation bad, mid or good, and use it for the crayon level. Training time unknown. If it ships, record the model ID for Devpost and add "Grading by Adaption" to the credits.
- [ ] **"Mm-hm" while the student talks.** ElevenLabs has no setting for it. Play a short clip ourselves during long student turns.
- [ ] **Figma.** Put the v3 screens in a Figma file for the Figma prize. The existing file has older screens.
- [ ] **A second topic.** Key ideas and a test run for "Photosynthesis".
- [ ] **Nolan.** Out of scope unless a human says so.

## Not doing

Slide upload. Points and streaks. Accounts. Mobile layout beyond not breaking. Any language other than English.
