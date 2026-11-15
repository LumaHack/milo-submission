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

## After the first spoken test

**D20. Milo is a conversation partner, not a "Mmhh… but" machine.** *(The "guesses wildly" part was dropped in D28.)* Ali spoke to the first version on Sat 14 Nov: the repeated "Mmhh… but" opener was annoying, and the vague questions left him not knowing what to say. Milo now reacts to what was said, asks one small concrete question, guesses wildly when the student is stuck, and never opens the same way twice. D4 still holds: he never explains and never gives the proper term.

**D21. Milo answers fast.** Turn-taking is Eager with speculative turn on, replacing Patient. Measured in a spoken test: he replies 1 to 2 seconds after the student stops. He does not jump in at a short pause mid-sentence (0.9 s was tried), and ElevenLabs has no setting to talk over someone. So we say "he answers fast", not "he interrupts". If the student goes quiet for 8 seconds he helps once, then waits.

**D22. Level of detail: Basics, Exam, Deep. Default Basics.** Reaching Mastered at exam strictness was too hard out loud. Basics marks the three core ideas and accepts everyday words. Exam and Deep are there for students who want to be pushed.

**D23. The round button switches Milo on and off.** It is not a mute button. Switching him back on starts a new voice conversation, so the app tells him what he has already heard.

**D24. Any topic.** The student can type a topic and Claude writes the key ideas. D3 still holds for the demo: we film "How a cell works", because that run is the one we have tested most.

**D25. History, slideshow and film.** Sessions are kept in the browser. A session can be replayed as a slideshow, or turned into a short fal video of the first board becoming the last. The film is only made on request, because it is slow and costs more than a redraw.

**D26. Fast mode for Claude.** The student is waiting on this call, and fast mode cut it from about 5 s to 2 to 3 s. It costs about twice as much per token. Haiku was tried and was slower.

**D27. No moving Milo.** fal's video model refused his picture as a possible likeness of a real person. He stays a still picture animated in the browser.

## After the stochastic calculus call

Ali ran a six-and-a-half-minute session on a typed topic on Sat 14 Nov. The pipeline held up (15 turns scored, 11 redraws, no errors). Milo's behaviour did not: he spoke 18 times to the student's 13, averaged 29 words a reply, opened 9 replies with his drawing, asked up to three questions at once, hid answers inside his questions, called the student by a misheard name, and had no way to finish.

**D28. Milo follows, he does not lead.** At most 20 words and one question per reply. He repeats back a few of the student's words and asks one small open question about them. No "is it X or Y?", no "…, right?", no numbers or ideas of his own. Only what the student says in their own words is scored, so a leading question only wastes time. This replaces the "silly guess" idea from D20.

**D29. One Milo turn per student turn.** He no longer announces every drawing. The board speaks for itself. He gets a cue to speak unprompted only on the final board and when he has sketched a hint.

**D30. Milo is also a teacher, at one moment.** Ali's call: when the student has tried the same gap twice and is still not there, Milo does not give up. He says they are not quite there but onto something, sketches a small hint on the paper in blue dashed pencil marked "hint", and asks them to build on it. This is a deliberate exception to D4 and D5. He helps once per gap, the hint never uses the technical term, and the idea only counts when the student says it themselves.

**D31. A way to finish.** If the student is still stuck on a gap after its hint, Milo wraps up: this is as far as we got, here is the bit to look up, your sheet is ready. The revision sheet lists what is still open under "Look these up next".

**D32. No names, no mumbles.** Milo never calls the student by a name. Turns of one or two words are not scored.

**D33. Fact check before drawing.** Ali's call after hearing Milo draw a wrong statement as if it were right. Every turn is checked for clearly false statements in the same Claude call that scores it, so it adds no waiting. A wrong claim goes on the paper small and grey with a red question mark, and Milo asks about it first. This replaces "a wrong idea is drawn literally" in D5. It is a model's judgement at school level, not a guarantee.

**D34. No flattery.** Milo praised and then backpedalled in the same breath, which felt fake. No compliments, no verdicts, no "nice… but", and one steady tone per reply.

**D35. The paper reacts in under three seconds.** A redraw still takes 5 to 9 seconds, because fal's edit has no faster setting. So Milo jots the student's words on the paper as soon as the brain answers (about 2.6 s), and the drawing replaces the note when it lands.

## Nolan

**D33. Nolan is its own product, in `nolan/`.** Ali's call on Sat 14 Nov, late evening. It replaces the "ten-second mention" in D1. Nolan takes witness accounts for an investigator: he interviews each witness alone, then shows where the accounts agree and differ. It is a separate Next.js app with its own dependencies, dev server (port 3001) and README, built from the "Nolan" design artifact. Milo's code does not import it and is not changed by it. Milo is still the submission unless the humans decide otherwise.

**D41. The Yusuf branch is Milo only.** Yusuf's call on Sun 15 Nov: the Yusuf branch takes everything from Ali's branch except `nolan/`. Nolan stays on Ali's branch.

## After the 23:10 cell call

Ali ran the cell at Basics by voice and nine boards came out. What went wrong, and what changed:

**D36. At Basics, names do not matter.** Ali said things get in "through the cell wall, it's semi-permeable". The brain held the idea back because "wall" is the wrong name, Milo asked the same thing again, and Ali said "I just told you". At Basics an idea is now clear once its job is described, with no name, a made-up name or a slightly wrong one. A wrong name is not a wrong claim at that level, and only the false part of a sentence is flagged (semi-permeable was right). Replayed with Ali's own words: Mastered on turn 6 instead of turn 9.

**D37. Two tries after a hint, enforced in code.** Milo said "this is as far as we got today" one turn after his hint, and the next answer took the board to Mastered. The engine now counts turns since the hint and ignores an early wrap-up, and never speaks a wrap-up line over a finished explanation.

**D38. Milo switches himself off when the lesson is done.** After Mastered he kept answering a side conversation about coffee. Once he has said his wrap-up he is switched off. He is also told not to join talk that is not about the topic.

**D39. No repeated questions and no "You said".** The app note now lists what is already clear, and Milo may not ask about it again. Opening with "You said…" or "The … you mentioned" is out.

**D40. Labels.** One board garbled a label, one showed "control center" twice, the hint was tiny with a stray quote mark, and the final sheet dropped names Ali had used. Drawing instructions now keep the student's part names, put each label once on its own line, and draw the hint a quarter of the sheet tall. Whenever a label changes, the instruction says to erase every word on the paper and lists all the labels again, because the fast fal model leaves old writing behind otherwise. Checked by eye on two replays of Ali's words: names kept and nothing garbled in both. Duplicates were gone in one and reduced in the other, so this is better, not guaranteed. The careful model was tried for the final sheet again: cleaner, but 20 s and it redraws the whole picture in another style, so Basics keeps the fast one.

## Overnight on the Yusuf branch (Sun 15 Nov)

Yusuf's goal: Milo should hold up on any topic, not only the filmed cell. A three-topic sweep (cell, Pythagoras, pyramids; `scripts/topic-sweep/sweep.py`) showed the pipeline already worked on typed topics, so the night went on these.

**D42. Explain your own notes.** Reverses "slide upload: not doing". The student uploads slides as PDF, notes, a transcript or photos of slides, and the notes become the marking scheme. Notes first with a safety net: a claim that contradicts the notes is flagged, a claim they don't mention is not scored, and anything clearly false is still flagged so Milo never draws a false fact. It sits alongside the suggested topics, behind `NEXT_PUBLIC_MILO_NOTES`. The files are never stored. The notes section of the prompt is only added when there are notes (checked byte for byte when it was added). The off-topic and answer-word rules (D44, D45) do change the prompt for every topic, the cell included; that was re-checked with typed turns only, not yet by voice.

**D43. Swapping two parts is wrong, even at Basics, when the notes are the marking scheme.** "The mitochondria hold the DNA" was first scored as a naming slip under D36 and marked the nucleus idea clear. With notes it is now flagged. Only in sessions from notes: the cell path keeps D36 as Ali tuned it.

**D44. Milo never says an answer word first.** Each key idea lists its terms. The brain is told not to use them, and the server checks Milo's lines and swaps a leaking one for a plain line. In the sweep the brain never needed the swap.

**D45. Off-topic turns are not part of the explanation.** Small talk, jokes, other subjects and "just tell me the answer" are flagged, not scored, not drawn, and dropped so they never count as a try towards a hint. Before this, "just tell me the answer" was marked as something to draw. Milo's ElevenLabs agent prompt is not changed: whether Ali's branch shares the same agent was not known.

**D46. Milo's voice stays on topic too.** Yusuf's ElevenLabs key is separate from Ali's, so the agent prompt was changed on this branch. Talk to Milo about something else and he does not answer it: one warm line back to the topic. Ask him to explain or to be someone else and he says he doesn't know, that is why he is asking. Checked by voice.

**D47. Milo skips a question that was just answered.** His instant reply uses the app note from the turn before, so he once asked "what tells everything what to do?" right after being told. The note now says to skip it if the student has just answered it. Fixed in one voice run, still seen once in another: the agent answers before the brain has scored the new turn, which is how approach A works.

**D48. The final sheet always gets the careful model.** Yusuf's call. Reverses the Basics part of D40. The fast model garbled "hypotenuse" on a Pythagoras final sheet. Redrawn with the careful model, the cell's final sheet kept the same paper, cell and style and spelled every label right. Pythagoras was spelled right but still repeated two labels: dense maths sheets stay imperfect. Costs about 10 s more, once, at the end. `MILO_CAREFUL_FINAL=0` undoes it.

**D49. Milo's voice stays on Claude Haiku 5.5.** Claude Sonnet 5.5 was tried on the voice agent with three voice runs. It answered a little slower (median 3.0 s, Haiku 2.7 s) and avoided the stale-question slip in both runs where it was tested, but it is two runs, so not enough to switch. `POST /api/elevenlabs/setup?llm=<model>` tries another model in development.

**D50. A student who asks to stop is wrapped up; "I don't know" draws nothing.** Sixteen awkward moments were sent to the brain on Sun 15 Nov (knows nothing, a perfect first answer at each level, one word, mic noise, rude, a role change, another language, "I'm done", talking on after Mastered). Three things were off and are fixed. (1) "That's all I know, I'm done" got another question: the brain now sets `wantsToStop`, and Milo says the wrap-up line straight away, without waiting for a hint and two more tries. (2) "I don't know" and filler made Milo draw a placeholder blob the student never described: `changed` is now false for them. (3) After a perfect answer the answer-word check replaced Milo's summary with the plain fallback, because he said "rough ER" where the student said "rough endoplasmic reticulum": the check now skips the words of ideas already marked clear. The rest already behaved: three "I don't know"s bring the hint sketch, a perfect first answer goes straight to Mastered at every level, rude and role-change turns are off topic.

**D51. Milo's voice is told which gaps are still open, and Milo always speaks English.** Milo's instant reply comes from his own prompt, one turn ahead of the brain (D21). In a spoken run on Sun 15 Nov his own questions wandered: he asked the student to repeat what they had just said, and asked about a detail nobody marks. The app note now also lists the gap labels still missing (they never contain an answer), and tells him to lead towards the next one instead of re-asking. Separately, a student who spoke Spanish was answered in Spanish by the brain while Milo's voice is English, so the brain now always writes Milo's lines in English and still marks the student fairly in any language. Typed topics were also tried with sixteen odd inputs: nonsense, unsafe, war, a real person and an instruction to ignore the rules are turned away with one plain line, and real topics in any subject are set up.

**D52. The app reopens Milo's call by itself when the first try fails.** On Sun 15 Nov Milo's call failed to open on the first try in 5 of 9 headless test sessions ("could not establish pc connection"), leaving "Milo's voice hit a problem" on screen until the student pressed the button. The session now tries again by itself, up to twice, before showing that line. In the two runs after the change the first try failed, the second connected, and both sessions reached Mastered. The cost is a late greeting, 16 to 20 s after the page opens, when the first try fails. Not known whether a real browser on venue wifi fails as often as the headless test browser does.

## Still open

| Question | Who can settle it |
|---|---|
| Is the two-minute video required? The website says no video is needed, Devpost says no video means not judged. We make the video either way | Ask an organiser |
| How long does an Adaption fine-tune take? Nobody has started one | Whoever takes Adaption |
| Does Anam accept a stylised 3D character as a custom avatar? | Whoever takes the live face |
| Do we enter the Figma prize? It needs a Figma file or Make link. The current Figma file has older screens, not v3 | Ali |
| The repo is private. It must be public, with a README, before Sunday 12:00 | Ali (repo admin) |
