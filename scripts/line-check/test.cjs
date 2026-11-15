// Unit tests for src/lib/line-check.ts: Milo never says an answer word before the student does.
// No test framework: it compiles the file with the project's own TypeScript and checks fixed cases.
//
//   node scripts/line-check/test.cjs
//
// No network and no keys. Exits with code 1 if any case fails.

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "..", "..", "src", "lib", "line-check.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", compiled)(mod, mod.exports, require);
const { findLeaks, checkLines } = mod.exports;
console.info = () => {}; // checkLines logs each swap on the server.

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${detail}`}`);
}

// findLeaks: which terms appear in a line that nobody has said or shown yet.
const terms = ["membrane", "mitochondria", "mitochondrion", "ATP", "nucleus", "DNA", "ribosome", "Golgi", "rough ER", "ER"];
const onScreen = ["What lets things in", "Where the energy comes from", "Who gives the instructions", "How a cell works"];
const leakCases = [
  ["names the missing part", "So does the mitochondria make the energy?", ["The cell takes in things."], ["mitochondria"]],
  ["the student said it first", "The mitochondria you mentioned: what do they make?", ["Mitochondria make stuff."], []],
  ["a clean question", "Those things the cell takes in: how do they get inside?", ["The cell takes in things."], []],
  ["a plural", "What do the membranes do?", ["It has a skin."], ["membrane"]],
  ["a plural the student said", "And the membrane?", ["The membranes let stuff in."], []],
  ["an acronym", "Where does the ATP come from?", ["It makes energy."], ["ATP"]],
  ["a spoken 'er' is not the acronym ER", "Er, what does it do next?", ["um"], []],
  ["a multi-word term", "Does the rough  ER pack them?", ["proteins get made"], ["rough ER", "ER"]],
  ["part of a longer word", "What is in the nucleolar region?", ["x"], []],
  ["a word in a gap label", "Where the energy comes from: what do you think?", ["x"], []],
  ["an acronym not yet said", "Who holds the DNA?", ["the boss bit"], ["DNA"]],
  ["an acronym the student said", "Who holds the DNA?", ["the DNA is in there"], []],
  ["an empty line", "", ["x"], []],
];
for (const [name, line, said, want] of leakCases) {
  const got = findLeaks(line, terms, [...said, ...onScreen]);
  check(`findLeaks: ${name}`, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// checkLines: a leaking line is swapped for a plain one that cannot give anything away.
const request = (studentTurns = ["The cell takes in things."]) => ({
  topic: {
    title: "How a cell works",
    keyIdeas: [
      { id: "membrane", idea: "x", gap: "What lets things in", terms: ["membrane"] },
      { id: "energy", idea: "x", gap: "Where the energy comes from", terms: ["mitochondria", "ATP"], where: "slide 3" },
    ],
  },
  detail: "basics",
  studentTurns,
  helpedGapIds: [],
  turnsSinceHint: null,
  previousLevel: null,
  previousDrawPrompt: null,
});
const base = { help: false, stuck: false, biggestGapId: "energy", drew: "" };
const swapCases = [
  ["a question", { ...base, hint: "Do the mitochondria make it?" }, "I can't picture this bit yet: where the energy comes from?"],
  ["a teacher line", { ...base, help: true, hint: "I drew the mitochondria as a hint, build on it?" }, "I sketched a little hint on your paper. Can you build on it?"],
  ["a wrap-up, with the slide", { ...base, stuck: true, hint: "Look up the mitochondria." }, "That's as far as we got today. Look up where the energy comes from, it's on slide 3 of your notes. Your sheet is ready."],
  ["the final summary", { ...base, biggestGapId: null, hint: "I get it: membrane and ATP!" }, "I finally get it. That all fits together now."],
  ["a clean line is kept", { ...base, hint: "Those things: how do they get inside?" }, "Those things: how do they get inside?"],
];
for (const [name, result, want] of swapCases) {
  checkLines(result, request());
  check(`checkLines swaps ${name}`, result.hint === want, `got "${result.hint}"`);
}
const drew = { ...base, hint: "What makes the energy?", drew: "I drew your mitochondria!" };
checkLines(drew, request());
check("checkLines swaps a leaking drew line and never empties it", drew.drew.length > 0 && !/mitochondria/i.test(drew.drew) && drew.hint === "What makes the energy?", `got "${drew.drew}"`);
const said = { ...base, hint: "The mitochondria you said: what do they make?" };
checkLines(said, request(["Mitochondria do something."]));
check("checkLines keeps a term the student has said", said.hint.startsWith("The mitochondria"), `got "${said.hint}"`);
const noTerms = { ...base, hint: "Do the mitochondria make it?" };
const result = checkLines(noTerms, { ...request(), topic: { title: "x", keyIdeas: [{ id: "a", idea: "x", gap: "y" }] } });
check("checkLines leaves topics without terms alone", !result.fallback && noTerms.hint === "Do the mitochondria make it?");

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
