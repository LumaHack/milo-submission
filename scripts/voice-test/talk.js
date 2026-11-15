// Speaks to Milo for real, with no human and no microphone.
// It opens the app in headless Chrome, replaces the page's microphone with a stream it can play
// recorded speech into, says two sentences about the cell, and prints a timeline of what Milo did.
//
// Needs: the dev server on http://localhost:3000, Google Chrome, and three WAV files made by
// make_voice.py (which needs ffmpeg and the ElevenLabs key in .env.local).
//
//   python3 scripts/voice-test/make_voice.py          (or --mac for the Mac's own voice, if the ElevenLabs key may only run agents)
//   npm install --prefix /some/other/folder puppeteer-core   (outside the repo: this repo uses pnpm)
//   then run with NODE_PATH=/some/other/folder/node_modules
//   node scripts/voice-test/talk.js          two sentences, straight to Mastered
//   node scripts/voice-test/talk.js hint     wrong twice about the energy, so Milo sketches a hint
//   node scripts/voice-test/talk.js offtopic small talk and "just tell me the answer" mid-session
//   node scripts/voice-test/talk.js done     one idea, "I don't know", then "I'm done": Milo wraps up
//   node scripts/voice-test/talk.js notes    uploads scripts/notes-test/cell-notes.pdf, then a part swap and a fix
//
// It talks to the real agent, so each run uses a little ElevenLabs, Claude and fal credit.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
    userDataDir: "/tmp/milo-voice-test-profile",
    args: ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") problems.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => problems.push(String(e.message).slice(0, 300)));
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
    // Keep what the brain decided each turn, so the run can be checked afterwards.
    window.__turns = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = async (url, init) => {
      const response = await realFetch(url, init);
      if (String(url).includes("/api/turn")) {
        response.clone().json().then((d) => window.__turns.push({
          at: Date.now(), offTopic: d.offTopic, level: d.level, wrong: d.wrongClaims, help: d.help, stuck: d.stuck,
          changed: d.changed, hint: d.hint, checked: d.checked, seconds: d.seconds, cacheRead: d.usage?.cacheRead,
        })).catch(() => {});
      }
      return response;
    };
    MediaDevices.prototype.getUserMedia = async function (constraints) {
      window.__gum += 1;
      window.__gumArgs = JSON.stringify(constraints).slice(0, 200);
      await ctx.resume();
      // A fresh track each time, so stopping one copy does not silence the next.
      return new MediaStream(dest.stream.getAudioTracks().map((t) => t.clone()));
    };

  });
  // Start from empty storage, then load again so the page starts the way a first-time student sees it.
  // On a freshly started dev server React takes several seconds to start, so wait for it.
  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load", timeout: 60000 });
  // React has started once the page's buttons carry its handlers.
  await page.waitForFunction(() => Object.keys(document.querySelector("main button") || {}).some((k) => k.startsWith("__react")), { timeout: 60000 });
  const run = ["hint", "offtopic", "notes", "done"].includes(process.argv[2]) ? process.argv[2] : "cell";
  const clips = { hint: ["h1", "h2", "h3", "h4", "h5"], offtopic: ["h1", "o2", "o3", "b"], done: ["h1", "d2", "d3"], notes: ["n1", "n2", "n3"], cell: ["a1", "a2", "b"] }[run];
  if (run === "notes") {
    // Upload the test notes the way a student would, then wait for Milo to set up the topics.
    await page.waitForSelector("input[type=file]");
    const input = await page.$("input[type=file]");
    await input.uploadFile(path.resolve(__dirname, "..", "notes-test", "cell-notes.pdf"));
    await page.waitForFunction(() => document.body.innerText.includes("Topics in your notes"), { timeout: 90000 });
    console.log("notes read:", await page.evaluate(() => [...document.querySelectorAll("main button")].map((b) => b.innerText.split("\n")[0]).slice(-4)));
  }
  for (const name of clips) {
    await page.evaluate((n, b64) => window.__load(n, b64), name, fs.readFileSync(`${__dirname}/out/${name}.wav`).toString("base64"));
  }
  // The topic cards appear once the page has read this browser's storage. Wait for them.
  await page.waitForFunction(
    (notes) => [...document.querySelectorAll("main button")].some((b) => (notes ? /Slides|slide/ : /How a cell works/).test(b.textContent)),
    { timeout: 20000 },
    run === "notes",
  );
  // A real mouse click, so the browser counts it as the student's gesture. The cards are on the page
  // before React has started on a freshly started dev server, and a click then does nothing, so retry.
  for (let tries = 0; ; tries++) {
    const card = await page.evaluateHandle((notes) => {
      const buttons = [...document.querySelectorAll("main button")];
      return notes ? buttons.find((b) => /Slides|slide/.test(b.textContent)) : buttons.find((b) => b.textContent.includes("How a cell works"));
    }, run === "notes");
    await card.asElement()?.click().catch(() => {});
    const opened = await page.waitForFunction(() => location.pathname === "/session", { timeout: 3000 }).then(() => true, () => false);
    if (opened) break;
    if (tries >= 10) throw new Error("Clicking the topic card never opened the session.");
  }
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
  await page.waitForFunction(() => (window.miloLog || []).some((m) => m.who === "agent"), { timeout: 30000 }).catch(async (error) => {
    // Say what the page shows, so a voice failure can be told apart from a test failure.
    console.log("NO GREETING. Page says:", await page.evaluate(() => ({
      badge: document.querySelector("[aria-live=polite]")?.textContent ?? null,
      alert: document.querySelector("[role=alert]")?.textContent ?? null,
      log: window.miloLog || [], mic: window.__gum, audio: window.__ctxState(),
    })));
    console.log("Page errors:", problems.slice(-8));
    throw error;
  });
  // Let him finish: wait until he has been "Listening" for a full second.
  for (let quiet = 0, i = 0; i < 120 && quiet < 4; i++) { quiet = (await badge()) === "Listening" ? quiet + 1 : 0; await wait(250); }
  console.log("audio context:", await page.evaluate(() => window.__ctxState()), "| getUserMedia calls:", await page.evaluate(() => window.__gum + " " + (window.__gumArgs || "")));

  // Wait until Milo has finished thinking, drawing and talking, and has been listening for two seconds.
  const settle = async (label) => {
    mark(label);
    for (let quiet = 0, i = 0; i < 240 && quiet < 8; i++) { quiet = (await badge()) === "Listening" ? quiet + 1 : 0; await wait(250); }
  };

  // Say something, then wait for Milo to answer it and fall quiet, so each sentence is its own turn.
  const agentLines = () => page.evaluate(() => (window.miloLog || []).filter((m) => m.who === "agent").length);
  const sayAndWait = async (name) => {
    const before = await agentLines();
    await say(name);
    for (let i = 0; i < 80 && (await agentLines()) === before; i++) await wait(250);
    await settle("waiting for Milo to finish");
  };

  if (run === "hint") {
    await sayAndWait("h1");
    await sayAndWait("h2"); // first wrong try at the energy
    await sayAndWait("h3"); // second wrong try: Milo should sketch a hint and say his teacher line
    await wait(12000); // the hint sketch takes a few seconds to draw, then he points at it
    await settle("waiting for the hint");
    await sayAndWait("h4"); // building on the hint
    await say("h5");
    await quietFor(24000, "student goes quiet");
  } else if (run === "offtopic") {
    await sayAndWait("h1");
    await sayAndWait("o2"); // small talk: not scored, not drawn, Milo steers back
    await sayAndWait("o3"); // asking for the answer: "I don't know, that's why I'm asking you."
    await say("b");
    await quietFor(40000, "student goes quiet"); // long enough for the final sheet to land and Milo to show it
  } else if (run === "done") {
    await sayAndWait("h1");
    await sayAndWait("d2"); // an honest "I don't know": a smaller question, nothing drawn
    await say("d3"); // asking to stop: Milo wraps up and names what to look up
    await quietFor(20000, "student goes quiet");
  } else if (run === "notes") {
    await sayAndWait("n1");
    await sayAndWait("n2"); // two parts swapped: should be flagged and drawn grey with a question mark
    await say("n3");
    await quietFor(26000, "student goes quiet");
  } else {
    await say("a1");
    await wait(900); // a pause mid-sentence: does Milo jump in?
    await say("a2");
    await quietFor(14000, "student goes quiet");
    await say("b");
    await quietFor(40000, "student goes quiet"); // long enough for the final sheet to land and Milo to show it
  }

  const out = await page.evaluate(() => ({
    log: (window.miloLog || []).map((m) => ({ who: m.who, at: m.at, text: m.text })),
    feed: [...document.querySelectorAll("ol li")].map((li) => li.textContent),
    alert: document.querySelector("[role=alert]")?.textContent ?? null,
    bubble: document.querySelector("section[aria-label=Milo] p.mr-auto")?.textContent ?? null,
    frames: (JSON.parse(localStorage.getItem("milo.history") || "[]")[0]?.frames || []).map((f) => ({ level: f.level, at: Math.round(f.at), hinted: Boolean(f.hinted), said: f.said, image: f.imageUrl })),
    level: [...document.querySelectorAll(".bg-ink.text-white")].map((e) => e.textContent).filter((t) => /Crayon|Sketching|Clearer|Mastered/.test(t)),
    turns: window.__turns || [],
    header: document.querySelector("header")?.innerText ?? null,
  }));
  await page.screenshot({ path: `${__dirname}/out/end-${run}.png` });
  await browser.close();
  const all = [...out.log, ...marks].sort((x, y) => (x.at || 0) - (y.at || 0));
  console.log("TIMELINE (seconds since the session page opened):");
  for (const m of all) console.log("  " + (((m.at || t0) - t0) / 1000).toFixed(1).padStart(5) + "s  " + m.who.toUpperCase().padEnd(6) + m.text.slice(0, 260));
  console.log("FEED:", out.feed);
  console.log("FRAMES:", JSON.stringify(out.frames));
  console.log("LEVEL:", out.level, "| BUBBLE:", out.bubble, "| ALERT:", out.alert);
  console.log("HEADER:", out.header);
  console.log("BRAIN, per scored turn:");
  for (const t of out.turns) {
    console.log(`  +${((t.at - t0) / 1000).toFixed(1)}s level ${t.level}${t.offTopic ? " OFF-TOPIC" : ""}${t.wrong?.length ? ` wrong=${JSON.stringify(t.wrong)}` : ""}${t.help ? " HELP" : ""}${t.stuck ? " STUCK" : ""}${t.checked?.fallback ? ` SWAPPED ${t.checked.leaks}` : ""} (${t.seconds}s, cache ${t.cacheRead})  "${t.hint}"`);
  }
})().catch((e) => { console.error("TEST FAILED:", e.stack); process.exit(1); });
