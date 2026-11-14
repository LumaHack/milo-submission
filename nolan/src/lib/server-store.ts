// Server only. Where cases live: one JSON file on the machine that runs Nolan.
// It is a file and not a browser store so that a witness can open their interview link on their own
// device and the investigator's screen sees the interview happen. There are still no accounts.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { CaseFile, Fact, Turn, Witness } from "./nolan";

const FILE = path.join(process.cwd(), ".data", "cases.json");
const MAX_CASES = 24;

let memory: CaseFile[] | null = null;

function load(): CaseFile[] {
  if (memory) return memory;
  try {
    const stored = JSON.parse(fs.readFileSync(FILE, "utf8")) as unknown;
    memory = Array.isArray(stored) ? (stored as CaseFile[]) : [];
  } catch {
    memory = [];
  }
  return memory;
}

function save(cases: CaseFile[]) {
  memory = cases;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cases));
  } catch (error) {
    // A read-only disk, such as a serverless host. The cases then last as long as this process does.
    console.error("Nolan could not write its case file:", error);
  }
}

/** Every case, newest first. */
export function listCases(): CaseFile[] {
  return load();
}

/**
 * Stores what the investigator's screen sends. What a witness said belongs to the interview, so for a
 * witness already on file the stored turns, notes, clock and status are kept, whatever the screen sent.
 */
export function putCase(incoming: CaseFile): CaseFile {
  const cases = load();
  const existing = cases.find((entry) => entry.id === incoming.id);
  const witnesses: Witness[] = incoming.witnesses.map((witness) => {
    const stored = existing?.witnesses.find((entry) => entry.id === witness.id);
    return stored
      ? { ...witness, token: stored.token, status: stored.status, turns: stored.turns, facts: stored.facts, seconds: stored.seconds }
      : witness;
  });
  const merged: CaseFile = { ...incoming, witnesses };
  save([merged, ...cases.filter((entry) => entry.id !== incoming.id)].slice(0, MAX_CASES));
  return merged;
}

export function removeCase(id: string) {
  save(load().filter((entry) => entry.id !== id));
}

/** The case and witness an interview link belongs to. */
export function findWitness(token: string): { file: CaseFile; witness: Witness; position: number } | null {
  for (const file of load()) {
    const index = file.witnesses.findIndex((witness) => witness.token === token);
    if (index >= 0) return { file, witness: file.witnesses[index], position: index + 1 };
  }
  return null;
}

/** Stores what the interview sends: the witness's own turns, notes, clock and status. */
export function patchWitness(
  token: string,
  patch: { turns: Turn[]; facts: Fact[]; seconds: number; status: Witness["status"] },
): Witness | null {
  const found = findWitness(token);
  if (!found) return null;
  const updated: Witness = { ...found.witness, ...patch };
  save(
    load().map((file) =>
      file.id === found.file.id
        ? { ...file, witnesses: file.witnesses.map((witness) => (witness.token === token ? updated : witness)) }
        : file,
    ),
  );
  return updated;
}

function hostName(request: Request): string {
  const host = request.headers.get("host") ?? "";
  // "[::1]:3001" and "localhost:3001" both lose their port here.
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
}

/**
 * The case file, the comparison and the scenes are for the investigator. They are only served to the
 * machine Nolan runs on. A witness who opens their link on another device reaches the interview and
 * nothing else. This is a demo-grade guard, not a login: see README.md.
 */
export function investigatorOnly(request: Request): Response | null {
  if (process.env.NOLAN_OPEN === "1") return null;
  const host = hostName(request);
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return null;
  return Response.json({ error: "This is for the investigator. Open Nolan on the machine it runs on." }, { status: 403 });
}

/**
 * The address an interview link starts with. NOLAN_PUBLIC_URL when set (an https address, so a phone
 * can use its microphone), otherwise this machine's address on the local network.
 */
export function linkBase(request: Request): string {
  const fixed = process.env.NOLAN_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const port = (request.headers.get("host") ?? "").split(":").pop();
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((entry) => entry && entry.family === "IPv4" && !entry.internal)?.address;
  return `http://${lan ?? "localhost"}${port && /^\d+$/.test(port) ? `:${port}` : ""}`;
}

/**
 * The interview's own routes (the voice token and the notes) are open to a witness's device, and each call
 * costs money. They only answer a request that carries an interview link that is on file.
 */
export function witnessOnly(request: Request): Response | null {
  const token = request.headers.get("x-nolan-witness");
  if (token && findWitness(token)) return null;
  return Response.json({ error: "This needs an interview link that is on file." }, { status: 403 });
}
