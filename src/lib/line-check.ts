// Checks that Milo never says a word that would give the answer away before the student has said it.
// Each key idea can list its "terms": the proper names and technical words for it ("mitochondria", "ATP").
// A term is fine once the student has used it, or when it is already on screen in a gap label or the title.
// Pure functions, no dependencies, so the server and the browser can both use them.

import type { TurnRequest, TurnResult } from "./turn";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches the term as a whole word or phrase, with an optional plural ending. Short acronyms keep their case. */
function termPattern(term: string): RegExp {
  const acronym = term.length <= 4 && term === term.toUpperCase() && /[A-Z]/.test(term);
  const words = escape(term.trim()).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${words}(?:s|es)?(?![\\p{L}\\p{N}])`, acronym ? "u" : "iu");
}

/**
 * The terms that appear in the line but that nobody has said or shown yet.
 * @param line what Milo is about to say
 * @param terms every key idea's terms
 * @param allowed text the student has said, plus the gap labels and the title on screen
 */
export function findLeaks(line: string, terms: string[], allowed: string[]): string[] {
  if (!line.trim()) return [];
  const seen = allowed.join("\n");
  const leaks: string[] = [];
  for (const term of terms) {
    if (!term.trim()) continue;
    const pattern = termPattern(term);
    if (pattern.test(line) && !pattern.test(seen) && !leaks.includes(term)) leaks.push(term);
  }
  return leaks;
}

/**
 * Checks Milo's spoken lines for answer words the student has not said yet, and swaps a line that has
 * one for a plain line that cannot give anything away. The board labels are not checked here: the
 * drawing instruction already uses only the student's own words.
 */
export function checkLines(result: TurnResult, request: TurnRequest): { leaks: string[]; fallback: boolean } {
  // Only ideas the student has not got yet can be given away. Once an idea is clear, its words are theirs:
  // "rough ER" is not a leak after the student said "rough endoplasmic reticulum".
  const clear = new Set(result.ideas.filter((idea) => idea.status === "clear").map((idea) => idea.id));
  const terms = request.topic.keyIdeas.filter((idea) => !clear.has(idea.id)).flatMap((idea) => idea.terms ?? []);
  const allowed = [...request.studentTurns, request.topic.title, ...request.topic.keyIdeas.map((idea) => idea.gap ?? "")];
  if (terms.length === 0) return { leaks: [], fallback: false };

  const hintLeaks = findLeaks(result.hint, terms, allowed);
  const drewLeaks = findLeaks(result.drew, terms, allowed);
  if (hintLeaks.length > 0) {
    const gap = request.topic.keyIdeas.find((idea) => idea.id === result.biggestGapId);
    const gapPhrase = gap?.gap ? gap.gap.replace(/[?.!\s]+$/, "") : null;
    const lower = gapPhrase ? gapPhrase.charAt(0).toLowerCase() + gapPhrase.slice(1) : null;
    if (result.help) {
      result.hint = "I sketched a little hint on your paper. Can you build on it?";
    } else if (result.stuck && lower) {
      result.hint = `That's as far as we got today. Look up ${lower}${gap?.where ? `, it's on ${gap.where} of your notes` : ""}. Your sheet is ready.`;
    } else if (!result.biggestGapId) {
      result.hint = "I finally get it. That all fits together now.";
    } else {
      result.hint = lower ? `I can't picture this bit yet: ${lower}?` : "Can you tell me a bit more about that?";
    }
  }
  // Swapped, never emptied: the final-board cue that makes Milo wrap up needs this line.
  if (drewLeaks.length > 0) result.drew = "Look, I drew what you told me. Did I get it right?";

  const leaks = [...new Set([...hintLeaks, ...drewLeaks])];
  if (leaks.length > 0) console.info(`/api/turn: swapped a line that would have said ${leaks.join(", ")}`);
  return { leaks, fallback: leaks.length > 0 };
}
