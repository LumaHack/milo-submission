# Agents

Whatever tool you are (Claude Code, Cursor, Codex, Copilot, anything else), the rules for this repo are in [CLAUDE.md](CLAUDE.md). Read it first. It is short.

The three things that matter most:

1. Never push to `main`. Stay on the branch you were started on.
2. Never commit a key. Keys live in `.env.local`.
3. The design in `docs/DESIGN.md` is final. Copy it exactly.

Then read `docs/SPEC.md` and pick the next unticked item in `docs/BACKLOG.md`.

## Agents defined in this repo

Claude Code picks these up from `.claude/agents/`.

| Agent | Use it when |
|---|---|
| `design-reviewer` | You changed a screen or a component. It checks the result against `docs/DESIGN.md` and the 20 UX and motion rules |
| `spec-checker` | You finished a backlog item. It checks the code against `docs/SPEC.md`, the turn contract and the hard rules in `CLAUDE.md` |

Both only read and report. Neither edits files.
