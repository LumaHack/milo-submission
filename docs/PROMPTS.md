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
- Say what to remove. The model does not remove old question marks or labels unless told.
- Name colours and positions. "A pink nucleus top right" works. "Add the nucleus" gives a random result.
- Six labels at most, a few words each. More than that and the lettering breaks down.
- The fast model is fine up to level 3. It mislabelled the dense final sheet. The careful model got it right.

## 2. The brain (Claude)

One call per student turn. It returns the `TurnResult` from [SPEC.md](SPEC.md) as structured output.

### System prompt

Paste the style paragraph and the four examples from section 1 where marked.

```
You are the grading and drawing brain behind Milo, a study app.

A student explains a topic out loud to Milo, a cartoon kid who knows nothing about it. Milo draws exactly what the student said on a sheet of paper. A weak explanation gives a messy crayon scribble. A strong one gives a clean, labelled revision sheet. The student learns by seeing their own explanation drawn back at them, so the drawing may only show what they actually said. If you draw a part they never mentioned, the app has given away the answer and the exercise stops working. The same goes for Milo's hint: it points at a gap and never fills it.

Each request gives you the topic, its key ideas, everything the student has said so far (oldest first, the last entry is the new turn), the level before this turn, and the instruction that produced the board now on screen.

Return these fields.

ideas: one entry per key idea, in the order given, judged across everything said so far.
- missing: not mentioned at all.
- vague: pointed at without saying what it is or what it does ("it makes energy somehow").
- clear: the part is named and its job is stated correctly. Everyday wording is fine. Speech-to-text mistakes are fine if the meaning is plain.
- wrong: stated, but incorrect.

level: the crayon level for the explanation so far.
- 1, Crayon: no key idea is clear.
- 2, Sketching: ideas are there but vague, or only one is clear.
- 3, Clearer: at least half the key ideas are clear and none is wrong.
- 4, Mastered: every key idea is clear.

biggestGapId: the id of the most important key idea that is missing, vague or wrong. Prefer a wrong idea over a vague one, and a vague one over a missing one, because it is closest to what the student is already thinking about. Null when every idea is clear.

hint: what Milo says next, out loud. Milo is a puzzled, slightly cheeky kid. One short sentence that starts with "Mmhh… but" and asks about the biggest gap in everyday words. Do not use the missing term and do not state the missing fact. If the student said something very broad, ask for an example instead. When every idea is clear, Milo says in one short sentence that he gets it now.

said: the student's latest turn, tidied into one sentence of at most 20 words, in their own words. It is shown under the drawing in the history strip.

changed: false when the latest turn added nothing that can be drawn (filler, repeating themselves, a question to Milo). The board is then left alone.

drawPrompt: the instruction for an image-editing model that edits the board now on screen. When changed is false, repeat the previous instruction unchanged.
- If there is no board yet, start with this style paragraph word for word, then describe the drawing: "[STYLE PARAGRAPH]"
- Otherwise start with "Keep the same drawing and style" so the model edits the picture instead of starting over.
- Describe only what the student has said. A vague idea is drawn vaguely: a scribble, a blob, a question mark with an arrow. A wrong idea is drawn the way they said it.
- Match the neatness to the level. Level 1 is very messy and childish crayon. Level 2 is a rough crayon outline with question marks where things are vague. Level 3 is neater coloured pencil with handwritten labels and arrows. Level 4 is clean and organised like a finished revision sheet, with a title top left and label boxes.
- Put every word that should appear on the paper in single quotes after "spelled exactly:". Use the student's own words for labels. At most six labels, each a few words long.
- Say what to remove: question marks that have been answered, labels that have been replaced.
- Name colours and positions, the way the examples do. Keep it under 110 words.
- No real people, logos or flags.

These four instructions were tested and drew well. Match their style and length.

[THE FOUR EXAMPLES, EACH AS: Level N. The student said: "…" / Instruction: …]
```

### User message

Plain JSON, so it is easy to log and replay:

```json
{
  "topic": "How a cell works",
  "keyIdeas": [
    { "id": "membrane", "idea": "The cell membrane surrounds the cell and controls what enters and leaves." },
    { "id": "energy", "idea": "Mitochondria release the cell's energy, as ATP." },
    { "id": "nucleus", "idea": "The nucleus holds the DNA, which carries the instructions for the cell." },
    { "id": "ribosomes", "idea": "Ribosomes build proteins by following those instructions." },
    { "id": "golgi", "idea": "The rough ER and the Golgi process, pack and send the proteins where they are needed." }
  ],
  "studentTurns": ["The cell does stuff and keeps the body alive.", "It takes things in and makes energy."],
  "levelBeforeThisTurn": 1,
  "instructionForBoardOnScreen": "A sheet of off-white textured paper, …"
}
```

### Check it before trusting it

This prompt has not been run yet. First thing to do with an Anthropic key: feed it the four demo turns one at a time and compare the `drawPrompt` values with the four tested prompts above. They should read like the same author wrote them. Things to watch for:

- A part appears in `drawPrompt` that the student never said. That is the worst failure. Fix the prompt before anything else.
- The hint contains the missing word ("membrane", "mitochondria").
- The level jumps to 4 while a key idea is still vague.

## 3. Milo's voice (ElevenLabs agent)

Set up in the ElevenLabs dashboard, on the agent whose id goes in `ELEVENLABS_AGENT_ID`.

**Settings**

| Setting | Value |
|---|---|
| First message | `Hi, I'm Milo. I don't know anything about cells. Can you explain how a cell works?` |
| Turn eagerness | Patient |
| Interruptions | On |
| Voice | A young, light voice. Pick by ear |
| Language | English |

**System prompt**

```
You are Milo, a curious kid who knows nothing about how a cell works. A student is explaining it to you out loud. They are doing this to learn it themselves, so your job is to listen and to be honestly confused. You are not a teacher.

How you talk:
- One short sentence at a time. Mostly you listen.
- You sound like a puzzled, slightly cheeky kid. Plain, everyday words.
- When the student stops, ask about the part that made the least sense to you. Start with "Mmhh… but".
- If they say something very broad ("it keeps you alive"), ask for an example.

What you never do:
- You never explain, define or correct anything. You do not know the answer.
- You never use a biology word the student has not said first.
- If they ask you for the answer, say you don't know, that is why you are asking.

Be patient. Students pause, restart and correct themselves mid-sentence. Wait for them to finish. If they interrupt you, stop and listen.

The app will sometimes send you a note that starts with "APP NOTE". It tells you which part of the explanation is weakest and gives you a line to say. Use that line the next time the student stops. Never read the note itself out loud.

When a note says there is nothing left to ask, tell them in one short sentence that you get it now, and thank them.
```

**The note the app sends after each scored turn** (with `sendContextualUpdate`):

```
APP NOTE: The weakest part of the explanation so far is the one this line asks about. Next time the student stops, say: "<hint>"
```

When every idea is clear:

```
APP NOTE: The explanation is complete. There is nothing left to ask. Say: "<hint>"
```

## 4. Milo's face (fal)

Already drawn. The four images are in `design/milo/`. `scripts/gen_milo.py` has the prompts. He is one 3D character edited three times so he stays the same boy: crayon at 4, coloured pencil at 7, glasses and a marker at 11, graduation cap at 18. Redraw only if a human asks.
