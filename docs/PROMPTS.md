# Milo: the prompts

Three prompts run the product. Start from these. If you improve one, change it here in the same commit so the other branches get it.

## 1. The board prompts (fal)

These four were run on Sat 14 Nov and produced the images in `design/boards/`. They are the reference for style, wording and length.

**Style paragraph.** Opens the first board only. It is what makes every board look like the same sheet of paper.

```
A sheet of off-white textured paper, photographed flat, filling the frame. Hand-drawn with wax crayons and coloured pencils, like a student's notes. Handwritten marker lettering, spelled exactly as given. No other text.
```

**Level 1.** New image, `google/nano-banana-2-lite`. Student said: "The cell does stuff and keeps the body alive."

```
[style paragraph] Very messy and childish. One big pink crayon scribbled blob in the middle. Top left in pink crayon handwriting: 'The cell ?'. On the right in pink: 'does stuff ?' and 'keeps us alive ?'. Nothing else.
```

**Level 2.** Edit of level 1, `google/nano-banana-2-lite/edit`. Student said: "The cell takes in things and makes energy."

```
Keep the same paper and crayon style. Redraw the blob as a pink crayon outline of a cell. Inside it draw one squiggly mitochondrion with yellow rays, and a yellow lightning bolt leaving the cell. Small circles enter from the left with an arrow. Add two purple question marks with arrows. Remove the old words.
```

**Level 3.** Edit of level 2, same model. Student said: "The membrane controls what enters, and mitochondria make the energy."

```
Keep the same drawing and style, a bit neater. Make the cell outline purple with a hatched purple nucleus and two orange mitochondria. Add handwritten labels with arrows, spelled exactly: 'Cell membrane' and next to it on a purple highlighter patch 'controls what enters'; 'Mitochondria' and next to it on a yellow highlighter patch 'make energy (ATP)'. Remove the question marks.
```

**Level 4.** Edit of level 3, `fal-ai/nano-banana-pro/edit`. Student said: "DNA gives the instructions, ribosomes build the proteins, and the Golgi sends them out."

```
Keep the same drawing and style, now clean and organised like a finished revision sheet. Title top left: 'The cell: how it works'. Add a pink nucleus with a DNA helix, a blue rough ER with dots on it, a purple Golgi and a yellow star labelled 'ATP'. Yellow label boxes with black handwriting, spelled exactly: 'Nucleus', 'Ribosomes (build proteins)', 'Rough ER', 'Golgi (packs and sends)', 'Mitochondria (make ATP)'. Arrows show proteins moving from the rough ER to the Golgi.
```

Add "Remove the old labels and highlighter patches." to the end of level 4. The tested version did not say it, and it should.

### What we learned writing them

- Start every edit with "Keep the same drawing and style". Without it the model starts a new picture.
- Put every word that should appear on the paper in single quotes after "spelled exactly:". That is what got the spelling right.
- Old writing does not go away by itself. Whenever a label is added or changed, tell the model to erase every word on the paper and then list every label that should be there. Otherwise labels pile up and repeat.
- Name colours and positions. "A pink nucleus top right" works. "Add the nucleus" gives a random result.
- Six labels at most, a few words each. More than that and the lettering breaks down.
- The fast model is fine up to level 3. It mislabelled the dense final sheet. The careful model got it right.

## 2. The brain (Claude)

One call per student turn. It returns the `TurnResult` from [SPEC.md](SPEC.md) as structured output.

**The live text is in `src/lib/prompts.ts`** (`turnSystemPrompt`, `turnUserMessage`, `DETAIL_RULES`). Edit it there. What it tells Claude:

- **Scoring.** Each key idea is missing, vague, clear or wrong, judged across everything said so far. What counts as clear depends on the level of detail (below).
- **Level.** 1 no idea clear. 2 ideas vague, or one clear. 3 at least two clear and none wrong. 4 every idea clear.
- **Biggest gap.** Wrong before vague before missing, because that is closest to what the student is already thinking about.
- **Milo's line.** At most 20 words and one question. He repeats back a few of the student's words, then asks one small open question about the biggest gap. Never a question with the answer inside it ("is it X or Y?", "…, right?"), never the missing term, never his drawing. On a wrong idea he says what it made him picture, says it looks odd, and asks them to check.
- **Fact check.** Every turn, the brain lists statements that are clearly false at school level, in the student's words, whether or not they touch a key idea. If unsure, it leaves them out. A wrong claim is drawn small in grey pencil with a red question mark and never as a fact, and Milo's next line asks about it first.
- **No flattery.** No praise, no verdicts, no "nice… but". Milo's help line is plain too.
- **Help.** After two failed tries at the same gap (once per gap): his line becomes a teacher line of up to 40 words, and the drawing gains a small hint sketch in blue dashed pencil marked 'hint'. No technical term. The idea still only counts when the student says it.
- **Stuck.** Still not clear after the hint: he wraps up and names the gap to look up.
- **Drawing instruction.** Only what the student said. Vague ideas drawn vaguely, wrong ideas drawn literally. Starts with "Keep the same drawing and style" on edits. Words on the paper in single quotes after "spelled exactly:". Says what to remove. Ends with "Do not add any other parts, shapes or words."

### Level of detail

The student picks this on the Start screen. It changes which key ideas count and how strict "clear" is.

| Level | Key ideas marked | An idea is clear when |
|---|---|---|
| Basics (default) | The core ones only. For the cell: membrane, energy, nucleus | What the part does is described in everyday words. The name does not matter: none, a made-up one or a slightly wrong one ("cell wall" for the membrane) all count, and a wrong name is not flagged by the fact check |
| Exam | All of them | The part is named and its job is stated correctly |
| Deep | All of them | Named, job stated, and linked to at least one other part |

### What a good run looks like

From a test on Sat 14 Nov at Basics, with deliberately casual speech:

| Student | Milo |
|---|---|
| "um so a cell is like a tiny thing that's alive, everything is made of them" | "Ooh, tiny alive things that everything's made of, cool! So if I zoomed in on one, what's around the outside of it?" |
| "it's got like a skin around it that decides what gets in and out" | "Ooh, a skin that picks who gets in, like a bouncer! But once stuff's inside, where does the cell get the power to actually do things?" |
| "i don't know what else honestly" | "That's okay, your skin idea was great! … does it eat food like me, or plug into something like a phone charger?" |
| "there's little power stations inside that make the energy, and the middle bit has the DNA which tells it what to do" | "Whoa, power stations and a bossy middle bit, I finally get it! So a cell has a skin that decides what gets in and out, little power stations that make the energy, and a middle bit with DNA that tells it what to do!" |

Things to watch for when you change the prompt:

- A part appears in the drawing instruction that the student never said. That is the worst failure.
- Milo's line contains the missing word ("membrane", "mitochondria").
- Milo asks something the student cannot answer in a sentence.

## 3. Milo's voice (ElevenLabs agent)

**The live text is in `src/lib/prompts.ts`** (`MILO_AGENT_PROMPT`, `MILO_FIRST_MESSAGE`). After changing it, push it to the agent:

```bash
curl -X POST http://localhost:3000/api/elevenlabs/setup
```

That creates the agent the first time and updates it afterwards.

**Settings the setup route applies**

| Setting | Value | Why |
|---|---|---|
| First message | `{{milo_first_line}}`, filled in by the browser. On a new session: "Hi, I'm Milo! I know nothing about cells. Go on then, what even is a cell?". When Milo is switched back on mid-session: "Okay, I'm back! Where were we?" | A concrete first question, so the student knows where to start, and no second introduction after a restart |
| Turn timeout | 8 seconds | If the student goes quiet, Milo helps once with an easier question, then only says "Take your time". Five seconds cut into thinking time |
| Turn eagerness | Eager | Milo jumps in at the first small pause instead of waiting politely |
| Speculative turn | On | His reply starts generating during the pause, so he answers faster |
| Model | `claude-haiku-5-5` | He says a sentence or two at a time. Speed matters more than depth |
| Auth | On | A conversation needs the token from `/api/elevenlabs/token` |

**Who Milo is.** A warm, curious kid who follows the student. He does not praise and then backpedal: no compliments, no verdicts, one steady tone with no mood switches inside a reply. At most 20 words and exactly one question per reply. He repeats back their words and asks one small open question. He never puts an answer in a question, never uses a name, and never opens with his drawing. He speaks once per student turn. He teaches only when the app tells him he has sketched a hint.

**Every blank must be filled.** The prompt and first line use `{{topic_title}}`, `{{topic_about}}` and `{{milo_first_line}}`. If the browser does not send one of them, ElevenLabs closes the conversation at once ("Missing required dynamic variables"). The screen now shows that reason instead of failing silently.

**What ElevenLabs cannot do.** There is no setting that makes the agent talk over the student mid-word. Eager turn-taking is the closest: he comes in the moment the student pauses. The student can always interrupt him.

**The note the app sends after each scored turn** (with `sendContextualUpdate`):

```
APP NOTE: The weakest part of the explanation so far is the one this question is about. Ask it next, in your own words: "<hint>"
```

When every idea is clear:

```
APP NOTE: The explanation is complete. There is nothing left to ask. Say something like: "<hint>"
```

## 4. Milo's face (fal)

Already drawn. The four images are in `design/milo/`. `scripts/gen_milo.py` has the prompts. He is one 3D character edited three times so he stays the same boy: crayon at 4, coloured pencil at 7, glasses and a marker at 11, graduation cap at 18. Redraw only if a human asks.
