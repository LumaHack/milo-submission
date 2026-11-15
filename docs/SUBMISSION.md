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
- A public GitHub repo with a README. **Ours is private right now. Make it public before submitting.**
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
| Scoring and drawing instruction (Claude) | Real | One call per turn |
| Board redraw (fal) | Real | One edit per turn |
| Milo's face | Four fal images, swapped by level | Live avatar only if Anam is wired |
| Grading | Claude's level | Adaption only if the fine-tune is done |
| Topics other than the cell | Real, less tested | Set up by Claude when picked. Swept on Sun 15 Nov: Pythagoras and the pyramids climbed 1 to 4 like the cell |
| Topics from uploaded notes | Real | `/api/notes`, tested on our own 8-slide test notes (`scripts/notes-test/`, written for testing, not real course material). Say so if they appear in the video |
| `/demo` | Scripted | Stored boards, no voice, no calls. Its own credits line says so |

## Numbers for the questions

Fill in from your own runs.

| Measure | Value |
|---|---|
| Runs that worked out of 10 | |
| End of speech to Milo's reply | 1.7 to 3.4 s (headless voice runs, Sun 15 Nov) |
| Claude scoring one turn (`claude-opus-5-5`, low effort, fast mode) | 1.9 to 2.9 s. At standard speed it was 3.9 to 7.9 s |
| fal, first board | 3.9 s, one run |
| fal, edit at levels 2 and 3 | 7.2 and 8.0 s |
| fal, final sheet (careful model) | 19.6 s, one run |
| End of speech to new board, levels 1 to 3 | 8 to 12 s (headless voice runs, Sun 15 Nov) |
| End of speech to final sheet | not measured with voice. Typed: about 28 s |
| fal film of the first board becoming the last | 214 s, one run on Sat 14 Nov |
| Cost of one session | Claude: about $0.03 a turn at fast-mode list prices, so about $0.20 for six turns (`scripts/regress/check.py` prints it). fal not counted |

## What has been tested, and how

| Part | Tested | How |
|---|---|---|
| Claude scoring and drawing instruction | Yes | Many typed runs on Sat 14 Nov, on the cell and on a typed topic |
| fal board redraws | Yes | Same runs. One early run drew a part nobody mentioned, before the "add nothing else" rule |
| Milo's agent: replies, app notes, announcing his drawing, switching off and on | Yes, in text mode | The real ElevenLabs agent, driven with typed turns through the same code as voice |
| Spoken conversation | Yes, automated | `scripts/voice-test/talk.js` plays recorded speech into the page's microphone. Three full runs on Sat 14 Nov: both sentences transcribed word for word, Mastered in two turns |
| Milo answering after the student stops | Yes | He replied 1 to 2 s after the speech ended |
| Milo cutting in mid-sentence | He does not | A 0.9 s pause in the middle of a sentence did not make him jump in. Eager turn-taking means he answers fast once you stop, not that he talks over you |
| The nudge when the student goes quiet | Yes | After about 8 s of silence he helps with an easier question, then just says "Take your time" |
| Milo wrapping up on the last board | Yes | He says he finally gets it and repeats the explanation back in the student's words |
| Fact check and the grey question-mark drawing | Yes, by voice | Two spoken wrong answers ("the energy comes from the skin", "from the air") each came out small and grey with a red question mark. One label repeated a word ("from from") |
| The hint after two failed tries | Yes, by voice | `node scripts/voice-test/talk.js hint`. Wrong twice about the energy: Milo said "Not quite yet, but you're onto something… I sketched a hint: little beans inside giving off sparks. What might they do?", and the student's next answer made the idea clear. One run. That call dropped near its end, and the screen said so |
| Custom topic, history, slideshow | Yes | In the browser |
| Film | Yes | Started from the button, survived a reload, played in the page. 214 s for the first one |
| Notes upload | Yes, typed, Sun 15 Nov | 8-slide PDF read in 7 to 11 s into two topics, every slide reference right. A .pptx, a 25 MB file, a shopping list, an empty form and a title-slide photo each got a plain message. An injected "ignore all previous instructions" line was ignored. Not yet tried by voice |
| Notes as the marking scheme | Yes, typed | `sweep.py notes`: a matching turn was clear, a part swap was flagged, a true claim not in the notes was ignored, "made of tiny bits of metal" was flagged, the fix reached Mastered. Turns 2.1 to 4.4 s |
| Off-topic turns | Yes, typed | Football, "just tell me the answer" and a cat joke, mid-session on three topics: all flagged, none drawn, none counted as a try. Not yet tried by voice |
| Voice, after the overnight changes | Yes, automated, Sun 15 Nov | `talk.js` with the Mac's own voice: cell (Mastered in two turns), hint (sketch after two misses, then Mastered, twice), off topic and notes. All reached Mastered. Recorded speech in headless Chrome, not a person at a microphone |
| Off topic, by voice | Yes, automated | "Favourite football team?" got "Back to cells! …", "just tell me the answer" got "I don't know, that's why I'm asking." Neither was scored or drawn |
| Notes, by voice | Yes, automated | Uploaded the test PDF, the part swap was flagged, the correction reached Mastered, Milo used the notes' word "battery packs" |
| Answer-word check | Unit tests only | `node scripts/line-check/test.cjs`: 21 cases pass. The brain never leaked in the sweep, so the swap never fired for real |

## Likely questions

- **Why not draw in real time?** A redraw takes 5 to 9 seconds. We redraw once per turn and keep the old board up, so it never blocks the conversation.
- **How do you stop it giving the answer?** The drawing instruction may only contain what the student said, and Milo's prompt forbids explaining or using a word the student has not used.
- **What does ElevenLabs do beyond text to speech?** Milo is an ElevenLabs agent: it handles turn-taking, answers a second or two after you stop, can be interrupted, speaks up by itself when he finishes a drawing or you go quiet, and takes notes from the app mid-conversation about the student's weakest point.
- **Why fal?** The board is the feedback. Each board is an edit of the previous image, so the student watches the same drawing grow up.
- **Does it detect emotion?** No. We do not claim that.
- **Does it work for my course?** Upload the slides as a PDF: Milo marks you only against them, and tells you which slide to look at for what you missed.
- **What if I talk about something else?** It isn't scored or drawn, and Milo brings you back to the gap.

## Devpost checklist

- [ ] Repo public, README up to date
- [ ] Last commit before Sunday 12:00
- [ ] Video uploaded, two minutes or less
- [ ] Track 03 selected
- [ ] Bounties selected: fal, ElevenLabs
- [ ] Every member added with full name, Luma email, university email
- [ ] Adaption model ID, if entering
- [ ] Figma file or Make link, if entering
- [ ] "What is real and what is mocked" matches the video
