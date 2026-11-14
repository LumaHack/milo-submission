# Decisions

What the team already decided, and why. Don't reopen one of these in the middle of a build. If you think one is wrong, raise it with the humans.

All dated Saturday 14 November 2026.

## Product

**D1. Milo is the submission.** One project per team is the rule. Nolan (the witness-interview mode) only gets built if Milo is solid by midnight Saturday, and then only as a ten-second mention.

**D2. Track 03: Voice, Vision and Generative Media.** Bounties: fal and ElevenLabs. Extras that do not count toward the two: Figma and Adaption. We use Anam if it helps but do not enter its bounty.

**D3. The demo topic is biology, "How a cell works".** The drawing can visibly evolve from a blob to a labelled cell. History was dropped: image models refuse some wartime imagery, and it is a risk in front of judges.

**D4. Milo never explains.** He only draws what was said and asks about the biggest gap. This is the whole idea. A version of Milo that teaches is a chatbot with a picture.

**D5. The drawing shows only what the student said.** A vague idea is drawn vaguely. A wrong idea is drawn wrong. Drawing a part they did not mention gives the answer away.

**D6. The level never drops within a session.** Milo does not shrink. A weak turn leaves things where they were.

## Design

**D7. v3 final is the design.** Layout from v1, real fal board images, Milo as a 3D character. It is not open for redesign. See [DESIGN.md](DESIGN.md).

**D8. Milo is 3D.** A stylised 3D boy who ages 4, 7, 11, 18. The earlier 2D monkey is gone.

**D9. Milo's face starts as four still images.** A live avatar (Anam) is a stretch goal. Four good stills that change with the level are enough for the video.

## Tech

**D10. fal models.** Fast model `google/nano-banana-2-lite` for the first board and levels 2 and 3. Careful model `fal-ai/nano-banana-pro/edit` for level 4. Reason: our test. The fast model takes 5 to 9 s and spells labels right but mislabelled the dense final sheet. The careful one takes 22 s and got it right. `fal-ai/flux-2/flash/edit` was rejected: it redrew the picture and misspelled labels. One run each, so re-time before the demo.

**D11. The board is edited, not regenerated.** Each board is an edit of the one before, so it stays the same sheet of paper and the same cell.

**D12. Claude writes the fal prompt.** Speech becomes text (ElevenLabs), Claude scores it and writes the drawing instruction in the style of our four tested prompts, fal draws. One structured call per turn.

**D13. Claude model: `claude-opus-5-5`, low effort.** How long the call takes is not measured yet. If it is too slow for a live turn, change the model setting. Don't change the design.

**D14. Voice is live, on every branch.** Milo is an ElevenLabs agent in a live, interruptible conversation. No branch builds a hold-to-talk version. The ElevenLabs bounty is judged on agent depth and interaction, and says simple TTS or STT is not enough. Plain STT and TTS is a last resort for Sunday morning only, if no live loop works.

**D15. Words we do not use.** "Full duplex": not in ElevenLabs' docs. Say "live and interruptible". "Emotion detection": speech-to-text does not return emotion. "Real-time drawing": a redraw takes 5 to 22 seconds. Say "redrawn after every turn".

**D16. No database, no accounts.** The session lives in the browser. The revision sheet can go in `localStorage`.

**D17. Keys stay on the server.** The browser gets short-lived tokens or calls our own routes.

## Team

**D18. Three branches, nobody pushes to main.** `Ali`, `Antoine`, `Yusuf`. Each is a separate attempt at a live voice loop. The one that first runs a full four-turn live session becomes the base, by pull request. See [BACKLOG.md](BACKLOG.md).

**D19. The credits on screen are true.** Only tools the run really used. The video says out loud what is mocked.

## Still open

| Question | Who can settle it |
|---|---|
| Is the two-minute video required? The website says no video is needed, Devpost says no video means not judged. We make the video either way | Ask an organiser |
| How long does an Adaption fine-tune take? Nobody has started one | Whoever takes Adaption |
| Does Anam accept a stylised 3D character as a custom avatar? | Whoever takes the live face |
| Do we enter the Figma prize? It needs a Figma file or Make link. The current Figma file has older screens, not v3 | Ali |
| The repo is private. It must be public, with a README, before Sunday 12:00 | Ali (repo admin) |
