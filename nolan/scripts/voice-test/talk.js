// Gives Nolan a spoken interview, with no human and no microphone.
// It opens a witness's interview link in headless Chrome, replaces the page's microphone with a stream
// it can play recorded speech into, agrees to the interview, says four things, ends it, and prints what
// Nolan heard, said and wrote down.
//
// Needs: the dev server on http://localhost:3001 with a case that has a witness still waiting,
// Google Chrome, and the WAV files made by make_voice.py (which needs ffmpeg and the ElevenLabs key).
//
//   python3 scripts/voice-test/make_voice.py
//   npm install --no-save puppeteer-core      (anywhere on NODE_PATH)
//   node scripts/voice-test/talk.js
//
// It talks to the real agent, so each run uses a little ElevenLabs and Claude credit.
const puppeteer = require("puppeteer-core");
const fs = require("fs");

// The investigator's address. Set NOLAN_VIA_LINK=1 to open the interview at the address a sent link uses
// (NOLAN_PUBLIC_URL on the server), the way a witness's own device would.
const BASE = process.env.NOLAN_URL || "http://localhost:3001";
const CLIPS = ["w1", "w2", "w3", "w4"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { cases, linkBase } = await (await fetch(`${BASE}/api/cases`)).json();
  const PAGE = process.env.NOLAN_VIA_LINK === "1" ? linkBase : BASE;
  const file = cases.find((entry) => entry.witnesses.some((witness) => witness.status === "waiting"));
  if (!file) throw new Error("No case has a witness still waiting. Add one on the case file first.");
  const witness = file.witnesses.find((entry) => entry.status === "waiting");
  const account = async () => (await (await fetch(`${BASE}/api/witness/${witness.token}`)).json()).witness;
  console.log(`case: ${file.title} | witness ${file.witnesses.indexOf(witness) + 1} (${witness.where}) | interview opened at ${PAGE}`);

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    userDataDir: "/tmp/nolan-voice-test-profile",
    // The last flag accepts the self-signed certificate of `pnpm dev:https`, as a person does by choosing "Proceed".
    args: ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--window-size=1440,1000", "--ignore-certificate-errors"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => {
    const ctx = new AudioContext({ sampleRate: 48000 });
    const dest = ctx.createMediaStreamDestination();
    window.__clips = {};
    window.__load = async (name, b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      window.__clips[name] = await ctx.decodeAudioData(bin.buffer);
    };
    window.__say = (name) =>
      new Promise((done) => {
        const src = ctx.createBufferSource();
        src.buffer = window.__clips[name];
        src.connect(dest);
        src.onended = done;
        src.start();
      });
    window.__gum = 0;
    MediaDevices.prototype.getUserMedia = async function () {
      window.__gum += 1;
      await ctx.resume();
      // A fresh track each time, so stopping one copy does not silence the next.
      return new MediaStream(dest.stream.getAudioTracks().map((t) => t.clone()));
    };
  });
  await page.goto(`${PAGE}/interview/${witness.token}`, { waitUntil: "domcontentloaded" });
  // Can a witness's device reach the investigator's material from here? And does this address get a microphone?
  const reach = await page.evaluate(async () => (await fetch("/api/cases")).status);
  const secure = await page.evaluate(() => `${location.origin} secure context: ${window.isSecureContext}, microphone API: ${typeof navigator.mediaDevices}`);
  for (const name of CLIPS) {
    await page.evaluate((n, b64) => window.__load(n, b64), name, fs.readFileSync(`${__dirname}/out/${name}.wav`).toString("base64"));
  }

  const t0 = Date.now();
  const marks = [];
  const mark = (text) => {
    marks.push(`${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${text}`);
  };
  const badge = () => page.evaluate(() => document.querySelector(".badge.top")?.textContent ?? null);
  const nolanLines = async () => (await account()).turns.filter((turn) => turn.who === "nolan").length;
  // Wait until Nolan has stopped talking and writing, and has been listening for two seconds.
  // While he talks, the app's level meter follows his voice. The loudest reading shows his audio really arrived.
  let loudest = 0;
  const settle = async () => {
    for (let quiet = 0, i = 0; i < 240 && quiet < 8; i++) {
      const state = await badge();
      if (state === "Nolan is talking") {
        const level = Number(await page.evaluate(() => getComputedStyle(document.querySelector(".nolan-card")).getPropertyValue("--vol")));
        if (level > loudest) loudest = level;
      }
      quiet = state === "Listening" ? quiet + 1 : 0;
      await wait(250);
    }
  };

  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("I agree")), { timeout: 20000 });
  // A real mouse click, so the browser counts it as the witness's own gesture.
  const agree = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("I agree")));
  await agree.asElement().click();
  mark("witness agrees");
  for (let i = 0; i < 120 && (await nolanLines()) === 0; i++) await wait(250);
  await settle();
  mark(`Nolan has opened. Microphone requests: ${await page.evaluate(() => window.__gum)}`);

  for (const name of CLIPS) {
    const before = await nolanLines();
    mark(`witness starts ${name}`);
    const playing = page.evaluate((n) => window.__say(n), name);
    await wait(900);
    mark(`mic level the app sees mid-speech: ${await page.evaluate(() => getComputedStyle(document.querySelector(".nolan-card")).getPropertyValue("--vol"))}`);
    await playing;
    mark(`witness stops ${name}`);
    // Patient turn-taking: Nolan waits a moment before he answers.
    for (let i = 0; i < 120 && (await nolanLines()) === before; i++) await wait(250);
    mark("Nolan answered");
    await settle();
  }

  const alert = await page.evaluate(() => document.querySelector("[role=alert]")?.textContent ?? null);
  const notes = await page.evaluate(() => document.querySelector(".notes")?.innerText ?? "");
  await page.screenshot({ path: `${__dirname}/out/end.png` });
  const end = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("End interview")));
  await end.asElement().click();
  await wait(1500);
  const final = await account();
  await browser.close();

  console.log("TIMELINE:");
  for (const line of marks) console.log("  " + line);
  console.log("TRANSCRIPT, as Nolan heard it:");
  for (const turn of final.turns) console.log(`  ${turn.who.toUpperCase().padEnd(8)}${turn.text}`);
  console.log("NOTES ON SCREEN:");
  for (const line of notes.split("\n").filter(Boolean)) console.log("  " + line);
  console.log("FACTS ON FILE:", JSON.stringify(final.facts.map((fact) => [fact.value, fact.sure, fact.struck])));
  console.log(`STATUS: ${final.status} | CLOCK: ${final.seconds}s | ALERT: ${alert}`);
  console.log(`NOLAN'S VOICE: loudest level while he talked ${loudest.toFixed(3)} (0 would mean no sound arrived)`);
  console.log(`ADDRESS: ${secure}`);
  console.log(`CASE FILE FROM THE INTERVIEW'S ADDRESS: HTTP ${reach} (403 means it is refused, as it should be for a witness)`);
})().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
