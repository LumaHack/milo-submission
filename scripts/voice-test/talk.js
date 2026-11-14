// Speaks to Milo for real, with no human and no microphone.
// It opens the app in headless Chrome, replaces the page's microphone with a stream it can play
// recorded speech into, says two sentences about the cell, and prints a timeline of what Milo did.
//
// Needs: the dev server on http://localhost:3000, Google Chrome, and three WAV files made by
// make_voice.py (which needs ffmpeg and the ElevenLabs key in .env.local).
//
//   python3 scripts/voice-test/make_voice.py
//   npm install --no-save puppeteer-core
//   node scripts/voice-test/talk.js          two sentences, straight to Mastered
//   node scripts/voice-test/talk.js hint     wrong twice about the energy, so Milo sketches a hint
//
// It talks to the real agent, so each run uses a little ElevenLabs, Claude and fal credit.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
    userDataDir: "/tmp/milo-voice-test-profile",
    args: ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => {
    const ctx = new AudioContext({ sampleRate: 48000 });
    const dest = ctx.createMediaStreamDestination();
    window.__clips = {};
    window.__ctxState = () => ctx.state;
    window.__load = async (name, b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      window.__clips[name] = await ctx.decodeAudioData(bin.buffer);
    };
    window.__say = (name) => new Promise((done) => {
      const src = ctx.createBufferSource(); src.buffer = window.__clips[name]; src.connect(dest); src.onended = done; src.start();
    });
    window.__gum = 0;
    MediaDevices.prototype.getUserMedia = async function (constraints) {
      window.__gum += 1;
      window.__gumArgs = JSON.stringify(constraints).slice(0, 200);
      await ctx.resume();
      // A fresh track each time, so stopping one copy does not silence the next.
      return new MediaStream(dest.stream.getAudioTracks().map((t) => t.clone()));
    };

  });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  const run = process.argv[2] === "hint" ? "hint" : "cell";
  for (const name of run === "hint" ? ["h1", "h2", "h3", "h4", "h5"] : ["a1", "a2", "b"]) {
    await page.evaluate((n, b64) => window.__load(n, b64), name, fs.readFileSync(`${__dirname}/out/${name}.wav`).toString("base64"));
  }
  // A real mouse click, so the browser counts it as the student's gesture.
  const card = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("How a cell works")));
  await card.asElement().click();
  await page.waitForFunction(() => location.pathname === "/session", { timeout: 15000 });
  const t0 = Date.now();
  const marks = [];
  const mark = (what) => marks.push({ who: "TEST", at: Date.now(), text: what });
  const badge = () => page.evaluate(() => document.querySelector("[aria-live=polite]")?.textContent ?? null);
  const vol = () => page.evaluate(() => getComputedStyle(document.querySelector("section[aria-label=Milo]")).getPropertyValue("--vol"));
  const say = async (name) => {
    mark(`student starts saying ${name}`);
    const playing = page.evaluate((n) => window.__say(n), name);
    await wait(900);
    mark(`mic level the app sees mid-speech: ${await vol()}`);
    await playing;
    mark(`student stops (${name})`);
  };
  const quietFor = async (ms, label) => { mark(label); await wait(ms); };

  // Wait for Milo's greeting to finish.
  await page.waitForFunction(() => (window.miloLog || []).some((m) => m.who === "agent"), { timeout: 30000 });
  // Let him finish: wait until he has been "Listening" for a full second.
  for (let quiet = 0, i = 0; i < 120 && quiet < 4; i++) { quiet = (await badge()) === "Listening" ? quiet + 1 : 0; await wait(250); }
  console.log("audio context:", await page.evaluate(() => window.__ctxState()), "| getUserMedia calls:", await page.evaluate(() => window.__gum + " " + (window.__gumArgs || "")));

  // Wait until Milo has finished thinking, drawing and talking, and has been listening for two seconds.
  const settle = async (label) => {
    mark(label);
    for (let quiet = 0, i = 0; i < 240 && quiet < 8; i++) { quiet = (await badge()) === "Listening" ? quiet + 1 : 0; await wait(250); }
  };

  if (run === "hint") {
    await say("h1");
    await settle("waiting for Milo");
    await say("h2"); // first wrong try at the energy
    await settle("waiting for Milo");
    await say("h3"); // second wrong try: Milo should sketch a hint and say his teacher line
    await wait(4000);
    await settle("waiting for the hint");
    await wait(6000);
    await settle("waiting for Milo to finish");
    await say("h4"); // building on the hint
    await settle("waiting for Milo");
    await say("h5");
    await quietFor(24000, "student goes quiet");
  } else {
    await say("a1");
    await wait(900); // a pause mid-sentence: does Milo jump in?
    await say("a2");
    await quietFor(14000, "student goes quiet");
    await say("b");
    await quietFor(24000, "student goes quiet");
  }

  const out = await page.evaluate(() => ({
    log: (window.miloLog || []).map((m) => ({ who: m.who, at: m.at, text: m.text })),
    feed: [...document.querySelectorAll("ol li")].map((li) => li.textContent),
    alert: document.querySelector("[role=alert]")?.textContent ?? null,
    bubble: document.querySelector("section[aria-label=Milo] p.mr-auto")?.textContent ?? null,
    frames: (JSON.parse(localStorage.getItem("milo.history") || "[]")[0]?.frames || []).map((f) => ({ level: f.level, at: Math.round(f.at), hinted: Boolean(f.hinted), said: f.said, image: f.imageUrl })),
    level: [...document.querySelectorAll(".bg-ink.text-white")].map((e) => e.textContent).filter((t) => /Crayon|Sketching|Clearer|Mastered/.test(t)),
  }));
  await page.screenshot({ path: `${__dirname}/out/end.png` });
  await browser.close();
  const all = [...out.log, ...marks].sort((x, y) => (x.at || 0) - (y.at || 0));
  console.log("TIMELINE (seconds since the session page opened):");
  for (const m of all) console.log("  " + (((m.at || t0) - t0) / 1000).toFixed(1).padStart(5) + "s  " + m.who.toUpperCase().padEnd(6) + m.text.slice(0, 260));
  console.log("FEED:", out.feed);
  console.log("FRAMES:", JSON.stringify(out.frames));
  console.log("LEVEL:", out.level, "| BUBBLE:", out.bubble, "| ALERT:", out.alert);
})().catch((e) => { console.error("TEST FAILED:", e.message); process.exit(1); });
