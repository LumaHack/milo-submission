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

Record it at 10:30 on Sunday. Record a backup take with the scripted run in case the live one fails.

## What is real and what is mocked

Fill this in before recording. The video must match it.

| Part | Real or mocked | Notes |
|---|---|---|
| Milo's voice and listening | | |
| Scoring and drawing instruction (Claude) | | |
| Board redraw (fal) | | |
| Milo's face | Four fal images, swapped by level | Live avatar only if Anam is wired |
| Grading | Claude's level | Adaption only if the fine-tune is done |
| Topics other than the cell | Shown, not built | |

## Numbers for the questions

Fill in from your own runs.

| Measure | Value |
|---|---|
| Runs that worked out of 10 | |
| End of speech to Milo's reply | |
| Claude scoring one turn (`claude-opus-5-5`, low effort) | 3.9 to 7.9 s, five calls on Sat 14 Nov |
| fal, first board | 3.9 s, one run |
| fal, edit at levels 2 and 3 | 7.2 and 8.0 s |
| fal, final sheet (careful model) | 19.6 s, one run |
| End of speech to new board, levels 1 to 3 | not measured with voice. Typed: about 11 to 14 s (Claude plus fal) |
| End of speech to final sheet | not measured with voice. Typed: about 28 s |
| fal film of the first board becoming the last | 214 s, one run on Sat 14 Nov |
| Cost of one session | |

## Likely questions

- **Why not draw in real time?** A redraw takes 5 to 9 seconds. We redraw once per turn and keep the old board up, so it never blocks the conversation.
- **How do you stop it giving the answer?** The drawing instruction may only contain what the student said, and Milo's prompt forbids explaining or using a word the student has not used.
- **What does ElevenLabs do beyond text to speech?** Milo is an ElevenLabs agent: it handles turn-taking with patient timing, can be interrupted, and takes notes from the app mid-conversation about the student's weakest point.
- **Why fal?** The board is the feedback. Each board is an edit of the previous image, so the student watches the same drawing grow up.
- **Does it detect emotion?** No. We do not claim that.

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
