# Milo: the design

**v3 final is the look.** It is decided. Build it as it is.

Live design: https://claude.ai/artifact/KAwE1srdFEsi4zZrdwsW3R?sk=u5se3NDV8fmoEE4lxJQz3w#page-717156d19b2e (page "v3, final". Ignore v1 and v2.)

Snapshot in this repo: `design/claude-design/*.dc.html`. Those files carry every size as an inline style. When this doc and a file disagree on a number, the live design wins.

## The idea behind it

It references ElevenLabs: near-white page, black ink, one soft grey panel holding white cards, pill buttons, generous space, no decoration. The interface stays quiet on purpose, because the two things with colour and personality are Milo and the crayon drawing. Anything else that draws the eye is competing with them.

## Tokens

**Colour**

| Name | Hex | Used for |
|---|---|---|
| bg | `#FBFAF8` | Page background |
| panel | `#F1EFEC` | The grey panel that holds cards, wells, Milo's speech bubble, inactive level chips |
| card | `#FFFFFF` | Cards, light pills |
| line | `#E5E2DD` | 1px borders on light pills, gap chips, history frames |
| ink | `#000000` | Text, dark pills, active level chip, selected frame border, waveform |
| ink hover | `#3D3D40` | Link hover |
| muted | `#636268` | Secondary text |
| faint | `#A9A7AC` | Dots on lesser gaps, progress bars on earlier turns |
| ok | `#188A55` | The "Listening" dot. Nothing else |
| miss | `#C8452B` | The dot on the biggest gap. Nothing else |
| milo | `#E4DEEE` | Behind Milo's picture while it loads (his pictures have a lavender background) |
| paper | `#FFFEFC` | Behind board thumbnails |

No other colours. No gradients.

**Type.** Instrument Sans, weights 400, 500, 600. Fallback `system-ui, sans-serif`.

| Use | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Start headline | 68px | 500 | -0.04em | 1.02 |
| Sheet title | 40px | 500 | -0.035em | 1.08 |
| Board title | 28px | 500 | -0.03em | 1.15 |
| Topic card title | 26px | 500 | -0.03em | 1.15 |
| Wordmark "Milo" | 20px | 600 | -0.02em | |
| Milo's line | 18px | 500 | | 1.5 |
| Card heading | 18px | 600 | -0.01em | |
| Body | 16px / 15px | 400 | | 1.5 |
| Label ("Crayon level", "History") | 15px | 600 | | |
| Pill text | 15px / 14px | 500 | | |
| Small and meta | 13px / 14px | 400 or 500 | | 1.4 |

Sentence case everywhere. No all-caps labels. Times use tabular numbers.

**Shape**

| Thing | Radius |
|---|---|
| Grey panel | 28px |
| Card | 20px |
| Well (the grey area behind the board) | 16px |
| History frame, Milo's picture | 14px |
| The paper itself | 10px |
| Level chip | 10px |
| Pills, mic button, status badges | fully round |
| Milo's speech bubble | 18px, bottom-left 4px |

Spacing: page padding 20px top, 28px sides, 24px bottom. Panel padding 12px, 12px gap between cards. Card padding 16 to 28px.

**Shadow.** One, on the paper only: `0 10px 30px rgba(42, 35, 64, 0.16)`. The paper is tilted `rotate(-0.6deg)`. Nothing else has a shadow.

## Screens

### Start (`StartV3.dc.html`)

- Header: wordmark "Milo" left. Light pill "Your revision sheets" right.
- Headline "What do you want to explain?" on the left. On the right, Milo aged 4 in a 128px circle, beside: "Explain it out loud, like you would to a friend who knows nothing. Milo draws what you say and grows up as you get it right."
- "Subject": four pills, Biology (selected, black), History, Chemistry, Physics. Every subject works: picking one swaps the four topic cards. "Give me four others" shows that subject's second set. Any card other than "How a cell works" is set up by Claude when picked and reads "Setting it up…" while that runs.
- "How much detail": three pills, Basics (default), Exam, Deep, with a one-line description of the chosen one beside them. Added after v3, in the same pill style.
- "Four topics to choose from", with a light pill "Give me four others" on the right.
- The grey panel holds four white topic cards, min height 190px, title at the top and a one-line description at the bottom:
  - How a cell works. "Every part, and what each one does."
  - How the heart pumps blood. "Four chambers and two loops."
  - How a neuron fires. "From a touch to a signal in the brain."
  - Photosynthesis. "How a leaf turns light into sugar."
- Under the four cards, inside the same grey panel, one white row: "Or your own", a text field and a dark pill "Explain this". Added after v3.
- Content max width 1180px, centred.

### Session (`MainV3.dc.html`)

Header: "Milo" and "Biology, how a cell works" left. Light pill "Open revision sheet" and dark pill "End session" right.

The grey panel holds two columns.

**Left column, Milo.** Max width 400px. Three white cards stacked:

1. Milo. His picture at 4:3 with a 14px radius. Top-left badge: green dot and "Listening" (white pill). Bottom-left badge: "Milo, age 7" (black pill). Under the picture his line in a grey speech bubble. Under that, small and muted: "Milo gives a hint at your biggest gap. He never gives the answer."
2. Crayon level. "Crayon level" left, "Turn 2 of about 4" right. Four chips in a row: Crayon, Sketching, Clearer, Mastered. The current one is black with white text. The rest are grey with muted text.
3. Microphone, pinned to the bottom of the column. A 48px black round mic button, a waveform of 3px black bars, and the session clock (`0:55`) in muted tabular numbers.

**Right column, the whiteboard.** One white card that takes the remaining width:

1. Title "How a cell works" left, "Redrawn after every turn" right, muted.
2. The board: a grey well with the paper centred in it. Max width 760px, 16:9, tilted, with the shadow. This is the biggest thing on the screen.
3. History. "History" and "Each frame is what you said and what Milo drew from it". On the right a light pill with a play triangle, "Replay". Below, a horizontal strip of frames. Each frame is one button: board thumbnail, "Turn 2" and the time, then what the student said in quotes. The selected frame has a 2px black border. The others have a 2px line-colour border. The last frame is labelled "Final sheet".
4. Gaps. "Gaps Milo still hears", then chips with a dot and the gap label. The first chip's dot is the miss colour, the rest are faint. With no gaps left the heading reads "No gaps left" and there are no chips.

Footer: one small muted credits line.

**Fit.** The design was drawn at 1440x1120. At 1440x900 the session screen needs a little scrolling once a turn is scored: Milo, his line and the crayon level stay in view, and the feed and the on/off bar are just below. Record the video in a 1440x1120 window.

**Milo is alive.** Decided Sat 14 Nov: the left column should feel like a live agent, not a photo with a caption. So in this column several small things may move at once, as long as the board stays the only big mover on the right.

- Milo's picture never sits still. He breathes when idle, sways while listening, tilts and bobs while thinking or drawing.
- His picture and the waveform move with the real voice level: the microphone while he listens, his own voice while he talks.
- A ring inside his picture thickens with the voice. Green (the ok colour) while he listens, black while he talks.
- When he levels up he shrinks back, overshoots and lands, with a short white flash, and the age badge pops.
- His line arrives word by word.
- Reaction bursts pop out of his picture in a crayon hand (Gaegu, used only for his bursts and his jotted note on the paper): "Ohh!" when an idea clicks, "Huh?!" when something is wrong, "I'm growing!" on a level-up, "I get it!" at the end.
- The student's last words sit in a black bubble on the right, above Milo's grey bubble on the left, so it reads as a conversation.
- He speaks once per student turn. He only speaks unprompted when the final board lands, or when he has sketched a hint.
- A hint sketch is blue dashed pencil with the handwritten word "hint". Its history frame is labelled "Milo's hint" and his burst reads "A hint!".
- When everything is clear Milo says his wrap-up and then switches himself off: the badge reads "Milo is off" and the bar reads "Milo is off. Press to switch him on".
- When the lesson is over (everything clear, or the student still stuck after a hint) the "Open revision sheet" pill turns black and pops, and "End session" turns light.
- "What Milo is doing" is a feed of the agent's real steps: Heard you, Checked 5 key ideas, Told Milo what to ask next, Redrawing the board. The running step shows a spinner and a ticking timer. A finished step shows a tick and how long it took. It only ever shows work that really happened.
- Under the level chips, one small bar per key idea: empty for missing, faint for vague, black for clear, the miss colour for wrong. It never names the ideas.
- Nobody presses anything to start. The session goes live when the page opens ("Waking Milo up…"). If the browser blocks sound because the page was opened directly, the bar reads "Tap anywhere to wake Milo". The round button switches Milo off and on again. It is not a mute button: black with a mic while he is on, white with a struck-through mic while he is off. The bar sits at the bottom of the column, under the crayon level card and the feed.

**Status badge states**

| State | Dot | Text |
|---|---|---|
| Listening | ok green, slow pulse | Listening |
| Thinking | faint | Thinking |
| Drawing | faint | Drawing |
| Speaking | ink | Milo is talking |
| Milo off | miss | Milo is off |
| Connecting | faint | Waking Milo up |

**The board while fal is drawing.** Keep the old board. About two and a half seconds after the student stops, Milo's jotted note appears on the paper: their words in quotes, in his crayon hand (Gaegu), on a paper-coloured strip along the bottom, with "Milo is drawing this…" under it. On an empty board the note sits in the middle, larger. Swap the image only when the new one has fully loaded, and remove the note with it.

**A wrong claim on the board** is small, grey pencil, with a red question mark and the student's words as its label. It must read as "not sure about this", never as part of the answer.

### Revision sheet (`SheetV3.dc.html`)

Header: "Milo" and "Revision sheets, biology" left. Light pill "Save sheet", dark pill "Explain it again" right.

The panel holds, on the left, one big white card: title "How a cell works", the line "Your revision sheet, built in the order you explained it.", and the final board (max width 820px, same tilt and shadow). On the right, max 420px, three cards:

1. "In your words": a numbered list of the student's own sentences, one per key idea.
2. "How you got here": one row per turn with a thin progress bar and the level name. Earlier turns use the faint colour. The last is black and bold.
3. Milo aged 18 in a 52px circle, with: "Milo is 18 now. He has stopped asking the dumb questions."

### History and slideshow (added after v3)

- **History** (`/sheets`): heading "Everything you have explained", then the grey panel with one white card per session: the final board, the topic, the level reached, the number of turns and when.
- **Revision sheet** gains two light pills beside the title: "Play slideshow" and "Make a film". A finished film sits under the board with a "Save film" link.
- **Slideshow**: full screen on the page background. Title and turn count at the top, one thin progress bar per slide, the board on the grey panel, the student's words in a black bubble and Milo's question in a grey one, and Back, Pause and Next pills. Arrow keys step, space pauses, Escape closes.

### Replay (`EvolutionV3.dc.html`)

The boards in order, one after another. In the Session screen this is the Replay button: it steps through the frames at 1.4 seconds each.

## Copy

Milo's lines in the scripted run:

| Turn | Student says | Milo says | Age |
|---|---|---|---|
| 1 | "The cell does stuff and keeps the body alive." | Wait, it does stuff? Like what, give me one thing it does. | 4 |
| 2 | "The cell takes in things and makes energy." | Ooh, it takes things in! Through what, is it like a wall or more like a door? | 7 |
| 3 | "The membrane controls what enters, and mitochondria make the energy." | Okay, so it has a door and a power bit. But who tells it what to do? | 11 |
| 4 | "DNA gives the instructions, ribosomes build the proteins, and the Golgi sends them out." | Ohh, I finally get it! The boss bit gives instructions, things get built, packed and sent out. | 18 |

Rules for any new text:

- Milo is a quick, warm, cheeky kid. He reacts to what was just said, then asks one small question you can answer in a sentence. He never explains and never uses the proper term before the student does. He never says "Mmhh".
- Interface text is plain and short. Say what a button does: "End session", "Open revision sheet", "Replay".
- Errors say what happened and what to do, in plain words and in ink, never in the miss colour: "The drawing did not come back. Keep talking, Milo will try again on your next turn." The technical reason goes to the console, not the screen.
- The credits line names only tools the run really used. The design shows "Voice by ElevenLabs. Face by Anam. Drawing by fal. Grading by Adaption." Remove "Face by Anam" and "Grading by Adaption" unless they are wired.

## 20 UX and motion rules

These are the classic principles, turned into rules for this app. The first twelve are about motion, the last eight about layout and behaviour.

| # | Principle | What it means in Milo |
|---|---|---|
| 1 | Squash and stretch | Pills and the mic button shrink to 0.96 while pressed. A level chip pops 0.9 → 1.06 → 1 when it becomes current. Never squash text or the board |
| 2 | Anticipation | Before a redraw lands, the paper lifts slightly and "Milo is drawing…" appears. The student should see the change coming |
| 3 | Staging | One thing moves at a time. During a redraw only the board moves. The board is the largest thing on the screen and nothing sits on top of it |
| 4 | Pose to pose | Milo has four ages and a few states. Cut or crossfade between them. No morphing, no wobbling in between |
| 5 | Follow through | The new paper lands a little past its resting tilt (-0.2°) and settles at -0.6°. The new history frame appears after the board has landed, not with it |
| 6 | Slow in and slow out | Things arriving ease out: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Things leaving ease in. Nothing moves at a constant speed except the waveform |
| 7 | Arcs | If something travels across the screen (a frame flying to the history strip), move it on a curve. If that is too much work, fade it instead. Never slide it in a straight diagonal |
| 8 | Secondary action | While Milo listens, the waveform moves and the green dot pulses. They are small and stay small. They never compete with the board |
| 9 | Snappy timing | A press responds within 100 ms. Interface transitions take 150 to 250 ms. The board swap takes under 400 ms. Only Replay is slower, at 1.4 s a frame |
| 10 | Exaggerated feedback | Levelling up is the one big moment: the chip pops, Milo's picture and age change. Everything else is quiet. No confetti |
| 11 | Solid drawing in 3D | Milo is a 3D render with soft light. The interface is flat. The only depth is the one shadow under the paper. No other shadows, no 3D effects on the interface |
| 12 | Overall appeal | The appeal is Milo's character and the crayon drawing. Don't add decoration to help: no gradients, no emoji, no illustrations in the interface |
| 13 | Fitts's law | Big targets close to where the eyes are. The mic button is 48px, at the bottom of Milo's column. Replay sits on the History row it controls |
| 14 | Bigger hit areas | Everything tappable is at least 44px tall. A history frame is one button, the whole card. Icon buttons are padded out to size |
| 15 | Hick's law | Few choices. Start: four subjects, four topics. Session: mute, replay, end. No settings, no menus |
| 16 | Miller's law | Small groups. Four levels, about four turns, at most four gaps shown, at most six labels on a board |
| 17 | Doherty threshold | Respond within 400 ms. fal takes 5 to 22 seconds, so show "Milo is drawing…" within 100 ms of the turn ending and keep the old board up. Never a blank board, never only a spinner |
| 18 | Postel's law | Accept messy input: ums, restarts, corrections mid-sentence, long pauses, ideas in the wrong order, speech-to-text slips. Be strict in what we show: labels spelled right, level names fixed |
| 19 | Jakob's law | Use what people know. A mic icon for the mic, a play triangle for replay, pills for choices, the layout of a video call: face on one side, shared board on the other |
| 20 | Frequency of use | What is used every turn is always visible and biggest: the board, Milo's line, the mic. What is used once (end, open sheet) is small and in the header. Nothing used every turn is behind a click |

**Reduced motion.** With `prefers-reduced-motion: reduce`, turn off every animation and transition. The board swaps instantly.

## Do not

- Add a colour, font, shadow or radius that is not listed above.
- Use gradients, emoji, glass effects or glow.
- Put all-caps labels or small "eyebrow" labels above headings.
- Show a spinner on its own, or an empty board.
- Animate more than one thing at once.
- Add a settings screen.
