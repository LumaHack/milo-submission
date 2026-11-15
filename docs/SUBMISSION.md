# Submission

Imperial AI Hack, Huxley Building. Everything here is from the hackathon site and its Devpost page, read on Saturday 14 November.

## Deadlines

| When | What |
|---|---|
| Sat 21:00 | Building closes for the night |
| Sun 10:00 | Building reopens |
| **Sun 12:00** | **Submissions close, sharp. Last commit must be before this** |
| Sun 13:00 to 16:30 | Judging in Huxley 308: the video, then 6 minutes of questions. No slides, no live demo |
| Sun about 15:50 | Live final for the top two of each panel |
| Sun 17:00 | Main stage |
| Sun 17:30 | Prizes |

## Rules that can sink us

- One project and one track per team.
- At most two bounties, both from our own track. Figma and Adaption do not count toward the two.
- All code written after Saturday 12:10. Nothing reused from older projects.
- A public GitHub repo with a README. Ours has been public since Sun 15 Nov, about 10:40. All four branches were scanned for keys first and none were found.
- Every team member on the Devpost entry with full name, Luma email and university email.
- A demo video of two minutes or less. Devpost says no video means the project is not judged. The website says no video is needed. Make the video.
- Entering Adaption needs the model ID. Entering Figma needs the Figma file or Make link.

## What we are entering

| Prize | Amount | How it is judged |
|---|---|---|
| Track 03, Voice, Vision and Generative Media | £500 first, £200 second | See marks below |
| fal bounty | $1,000 and merch | How central fal is to the product |
| ElevenLabs bounty | Scale tier | Agent depth, interaction design, technical integration, novelty. Plain TTS or STT is not enough |
| Adaption (optional) | $1,000 credits each | Win rate against the base model |
| Figma (optional) | £960 | Needs the file or Make link |

## Track marks

| Marks | For |
|---|---|
| 25 | Technical integration |
| 25 | Experience |
| 20 | Creativity |
| 15 | Usefulness |
| 15 | Video and answers |

## The two-minute video

| Time | Show | Say |
|---|---|---|
| 0:00 to 0:15 | The Start screen | The problem and a named user: a first-year biology student the night before a test, who has read the chapter three times and still cannot explain it |
| 0:15 to 1:30 | One real run, uncut if possible | Explain the cell badly, then better, across four turns. Let the board and Milo do the talking. This section carries most of the marks. Say out loud anything that is mocked |
| 1:30 to 1:50 | The revision sheet, then a simple diagram | How it is built: ElevenLabs agent hears and speaks as Milo, Claude scores each turn and writes the drawing instruction, fal edits the same board every turn |
| 1:50 to 2:00 | Back on Milo aged 18 | The closest product (flashcard and quiz apps), how Milo differs (you build the explanation, it shows the gap instead of telling you), and how often the run works out of ten |

Record it in a 1440x1120 browser window, the size the design was drawn at. Record it at 10:30 on Sunday. Record a backup take with the scripted run in case the live one fails.

## What is real and what is mocked

Fill this in before recording. The video must match it.

| Part | Real or mocked | Notes |
|---|---|---|
| Milo's voice and listening | Real | ElevenLabs agent, live |
| Scoring and drawing instruction (Claude) | Real | One call per turn. It also writes Milo's line for that turn |
| Board redraw (fal) | Real | One edit at a time. Turns that arrive while fal is drawing go into the next edit together |
| Milo's face | Four fal images, swapped by level | Live avatar only if Anam is wired |
| Grading | Claude's level | Adaption only if the fine-tune is done |
| Topics other than the cell | Real, less tested | Set up by Claude when picked. Film the cell |
| `/demo` | Scripted | Stored boards, no voice, no calls. Its own credits line says so |

## Numbers for the questions

Fill in from your own runs.

| Measure | Value |
|---|---|
| Runs that worked out of 10 | |
| End of speech to Milo's reply | 1.3 to 2.7 s after the transcript, spoken test on Sun 15 Nov. He waits for Claude's line, so this is about a second slower than on Saturday |
| Claude scoring one turn (`claude-opus-5-5`, low effort, fast mode) | Streamed. Milo's line is ready after 1.0 to 1.8 s, the full result after 1.8 to 3 s, once or twice 5 s. At standard speed the full result took 3.9 to 7.9 s |
| fal, first board | 3.9 s, one run |
| fal, edit at levels 2 and 3 | 7.2 and 8.0 s |
| fal, final sheet (careful model) | 19.6 s, one run |
| End of speech to new board, levels 1 to 3 | not measured with voice. Typed: about 11 to 14 s (Claude plus fal) |
| End of speech to final sheet | not measured with voice. Typed: about 28 s |
| fal film of the first board becoming the last | 214 s, one run on Sat 14 Nov |
| Cost of one session | About $0.70 for a five-turn, two-minute session. An estimate from list prices on Sun 15 Nov, not from a bill: Claude about $0.05 a turn (fast mode, $8 in and $40 out per million tokens, about 3,500 in and 500 out), fal about $0.05 a board if a board is about 1,300 image tokens (fal prices by token and does not give the count), ElevenLabs $0.08 a minute |

## What has been tested, and how

| Part | Tested | How |
|---|---|---|
| Claude scoring and drawing instruction | Yes | Many typed runs on Sat 14 Nov, on the cell and on a typed topic |
| fal board redraws | Yes | Same runs. One early run drew a part nobody mentioned, before the "add nothing else" rule |
| Milo's agent: asking the app for his line (`next_line` tool), announcing his drawing, switching off and on | Yes, in text mode | The real ElevenLabs agent, driven with typed turns through the same code as voice. Rechecked on Sun 15 Nov after the tool went in: every reply was Claude's line for that turn |
| Spoken conversation | Yes, automated | `scripts/voice-test/talk.js` plays recorded speech into the page's microphone. Three full runs on Sat 14 Nov: both sentences transcribed word for word, Mastered in two turns. One more run on Sun 15 Nov with the `next_line` tool. Nobody on the team has called this build by voice yet |
| Milo answering after the student stops | Yes | 1.3 to 2.7 s after the transcript on Sun 15 Nov |
| Milo cutting in mid-sentence | He does not | A 0.9 s pause in the middle of a sentence did not make him jump in. Eager turn-taking means he answers fast once you stop, not that he talks over you |
| The nudge when the student goes quiet | Yes | After about 8 s of silence he helps with an easier question, then just says "Take your time" |
| Milo wrapping up on the last board | Yes | He says once that he finally gets it and repeats the explanation back in the student's words. When the last board lands he adds one sentence that the drawing is done and the sheet is ready, with no second recap |
| Fact check and the grey question-mark drawing | Yes, by voice | Two spoken wrong answers ("the energy comes from the skin", "from the air") each came out small and grey with a red question mark. One label repeated a word ("from from") |
| The hint after two failed tries | Yes, by voice | `node scripts/voice-test/talk.js hint`. Wrong twice about the energy: Milo said "Not quite yet, but you're onto something… I sketched a hint: little beans inside giving off sparks. What might they do?", and the student's next answer made the idea clear. One run on Sat 14 Nov. That call dropped near its end, and the screen said so. Run again on Sun 15 Nov with the new flow: "I have no clue" made him say "One second, let me sketch something for you", then the teacher line when the sketch landed. Five boards, Mastered, no alert |
| Never asking the same thing twice, and leaving a gap | Yes, by replay and typed | Ali's own words from two Sunday calls (volcano, pyramids) replayed against the scoring route: no question came twice, the hint came after two asks, and after one more miss Milo said "Okay, let's leave that bit" and moved on. These limits are counted in the app, not left to the model |
| Custom topic, history, slideshow | Yes | In the browser |
| Film | Yes | Started from the button, survived a reload, played in the page. 214 s for the first one |

## Likely questions

- **Why not draw in real time?** A redraw takes 5 to 9 seconds. We redraw once per turn and keep the old board up, so it never blocks the conversation.
- **How do you stop it giving the answer?** The drawing instruction may only contain what the student said, and Milo's prompt forbids explaining or using a word the student has not used. The one exception is the hint: after two tries at the same gap he sketches a small clue in blue dashed pencil. It only counts once the student says the idea in their own words.
- **What does ElevenLabs do beyond text to speech?** Milo is an ElevenLabs agent: it handles turn-taking, answers a second or two after you stop, can be interrupted, and speaks up by itself when he finishes a drawing or you go quiet. Before each reply the agent calls a client tool in the browser, `next_line`, which waits for Claude's verdict on that exact turn and hands back Milo's line. So the voice never answers from a stale turn.
- **Why fal?** The board is the feedback. Each board is an edit of the previous image, so the student watches the same drawing grow up.
- **Does it detect emotion?** No. We do not claim that.

## Devpost checklist

- [x] Repo public
- [ ] README on `main` up to date. `main` is 26 commits behind `Ali` until pull request 3 is merged
- [ ] Last commit before Sunday 12:00
- [ ] Video uploaded, two minutes or less
- [ ] Track 03 selected
- [ ] Bounties selected: fal, ElevenLabs
- [ ] Every member added with full name, Luma email, university email
- [ ] Adaption model ID, if entering
- [ ] Figma file or Make link, if entering
- [ ] "What is real and what is mocked" matches the video
