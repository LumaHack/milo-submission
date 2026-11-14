# Design files

The live design is here: https://claude.ai/artifact/KAwE1srdFEsi4zZrdwsW3R?sk=u5se3NDV8fmoEE4lxJQz3w#page-717156d19b2e (page "v3, final").

This folder is a snapshot taken on Saturday 14 November. If the live design has changed since, the live design wins.

## boards/

The whiteboard at each crayon level. Real fal output from `scripts/fal_speed_test.py`. Use them as placeholder images while building, and as the target for what your own fal calls should produce.

| File | Level | Model | Time |
|---|---|---|---|
| `level-1.jpg` | 1, Crayon | `google/nano-banana-2-lite` | 5.2 s |
| `level-2.jpg` | 2, Sketching | `google/nano-banana-2-lite/edit` | 9.2 s |
| `level-3.jpg` | 3, Clearer | `google/nano-banana-2-lite/edit` | 7.5 s |
| `level-4.jpg` | 4, Mastered | `fal-ai/nano-banana-pro/edit` | 22.1 s |
| `rejected-fast-model-level-4.jpg` | 4 | `google/nano-banana-2-lite/edit` | 7.5 s. Labels wrong, which is why level 4 uses the careful model |
| `rejected-flux-flash-level-3.jpg` | 3 | `fal-ai/flux-2/flash/edit` | 4.9 s. Redrew the picture and misspelled labels |

## milo/

Milo at four ages. Real fal output from `scripts/gen_milo.py`. One character, edited three times, so he stays the same boy.

| File | Age | Shown at level |
|---|---|---|
| `stage-1.jpg` | 4, with a crayon | 1 |
| `stage-2.jpg` | 7, with a coloured pencil | 2 |
| `stage-3.jpg` | 11, glasses and a marker | 3 |
| `stage-4.jpg` | 18, graduation cap | 4 |

They are 4:3. Crop with `object-fit: cover` and `object-position: 50% 25%` to keep his face in frame, including in the round crops.

## claude-design/

The v3 screens, exported from Claude Design. They will not render on their own (they need the Claude Design runtime). Read them for exact inline styles: sizes, spacing, radius, copy.

| File | Screen |
|---|---|
| `StartV3.dc.html` | Start |
| `MainV3.dc.html` | Session. The script at the bottom holds the copy for all four turns |
| `SheetV3.dc.html` | Revision sheet |
| `EvolutionV3.dc.html` | Replay |
| `BoardV3.dc.html` | The board, by level. Its image ids map to `boards/level-1..4.jpg` |
| `MiloPic.dc.html` | Milo, by level. Its image ids map to `milo/stage-1..4.jpg` |

In these files, `<dc-import name="BoardV3">` means "the board image goes here", `<sc-if>` is a conditional, `<sc-for>` is a loop, and `{{ name }}` is a value from the script at the bottom of the file.
