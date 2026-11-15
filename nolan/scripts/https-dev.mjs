// Runs Nolan over https on this machine's network address, so a witness's phone on the same Wi-Fi can
// open their interview link and use its microphone. Browsers only allow a microphone on https or localhost.
//
//   pnpm dev:https        then open https://localhost:3443
//
// The certificate is made here, for this machine only, and is not signed by anyone a browser trusts.
// So the investigator's browser and each witness's phone show a warning once: choose "Advanced", then
// "Proceed". Nothing leaves the local network. Needs openssl on the path.

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.PORT || "3443";
const dir = path.join(process.cwd(), ".cert");
const key = path.join(dir, "key.pem");
const cert = path.join(dir, "cert.pem");
const stamp = path.join(dir, "addresses.txt");

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry.address);

// A certificate names the addresses it is for. Make a new one when this machine's address has changed.
const wanted = addresses.join(",");
if (!fs.existsSync(key) || !fs.existsSync(cert) || !fs.existsSync(stamp) || fs.readFileSync(stamp, "utf8") !== wanted) {
  fs.mkdirSync(dir, { recursive: true });
  const names = ["DNS:localhost", "IP:127.0.0.1", ...addresses.map((address) => `IP:${address}`)].join(",");
  execFileSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30", "-keyout", key, "-out", cert, "-subj", "/CN=Nolan on this machine", "-addext", `subjectAltName=${names}`],
    { stdio: "ignore" },
  );
  fs.writeFileSync(stamp, wanted);
}

console.log(`Nolan over https: https://localhost:${PORT} (investigator)${addresses.map((address) => `, https://${address}:${PORT} (witness links)`).join("")}`);

const next = spawn(
  "pnpm",
  ["exec", "next", "dev", "--port", PORT, "--experimental-https", "--experimental-https-key", key, "--experimental-https-cert", cert],
  { stdio: "inherit", env: { ...process.env, NOLAN_HTTPS: "1" } },
);
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));
