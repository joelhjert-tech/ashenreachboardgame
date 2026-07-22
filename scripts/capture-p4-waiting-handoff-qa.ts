import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface Capture { file: string; surface: string; state: string; viewport: string; overflow: number; text: string }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p4-waiting-handoff");
const captures: Capture[] = [];
const errors: string[] = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
}

async function joinPhone(page: Page, roomCode: string, name: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1&qaNetworkControls=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`No auth for ${name}`);
  return auth;
}

async function seed(auth: Auth, stage: string): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "waiting-handoff", stage } });
}

async function seedFixture(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function capture(page: Page, surface: string, state: string, width: number, height: number, fast = false): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(fast ? 100 : 350);
  const metrics = await page.evaluate(() => ({
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 500)
  }));
  const overflow = Math.max(metrics.root, metrics.body) - metrics.viewport;
  if (overflow > 0) throw new Error(`${surface}-${state} overflows by ${overflow}px`);
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const file = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(directory, file), fullPage: false });
  captures.push({ file, surface, state, viewport: `${width}x${height}`, overflow, text: metrics.text });
}

async function phonePair(page: Page, surface: string, state: string): Promise<void> {
  await capture(page, surface, state, 390, 844);
  await capture(page, surface, state, 360, 800);
}

async function tvPair(page: Page, state: string, fast = false): Promise<void> {
  await capture(page, "tv", state, 1920, 1080, fast);
  await capture(page, "tv", state, 1366, 768, fast);
}

async function recordFlow(browser: Browser, auth: Auth, name: string, stages: string[], reducedMotion = false): Promise<void> {
  const directory = join(output, "recordings");
  await mkdir(directory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    recordVideo: { dir: join(directory, "raw"), size: { width: 390, height: 844 } }
  });
  await context.addInitScript((storedAuth) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(storedAuth)), auth);
  const page = await context.newPage(); watch(page);
  await page.goto(`${client}/?room=${auth.roomCode}`, { waitUntil: "networkidle" });
  for (const stage of stages) {
    await seed(auth, stage);
    await page.waitForTimeout(700);
  }
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`No video for ${name}`);
  await video.saveAs(join(directory, `${name}.webm`));
  await context.close();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 2 });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  const guest = await guestContext.newPage();
  watch(owner); watch(guest);
  const auth = await joinPhone(owner, session.roomCode, "P4Owner", /Bjornis/i);
  await joinPhone(guest, session.roomCode, "P4Waiting", /Deepdale/i);
  await owner.getByRole("button", { name: "Start Game" }).click();
  await owner.getByTestId("phone-required-action-shell").waitFor();

  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await tvContext.addInitScript(({ token }) => localStorage.setItem("ashenreach-tv-host-token", token), { token: session.hostToken });
  const tv = await tvContext.newPage(); watch(tv);
  await tv.goto(`${client}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });

  for (const stage of ["result", "long-result"] as const) {
    await seed(auth, stage);
    await phonePair(owner, "phone", stage);
    await phonePair(guest, "waiting-phone", `waiting-${stage}`);
    await tvPair(tv, stage);
  }

  await seed(auth, "result");
  await phonePair(owner, "phone", "result-with-continue");
  await owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "CONTINUING" } })));
  await phonePair(owner, "phone", "continue-submitting");

  await seedFixture(auth, { kind: "discovery-equipment", stage: "equip-choice" });
  await phonePair(owner, "phone", "private-reward");
  await phonePair(guest, "waiting-phone", "private-reward-waiting");
  await seedFixture(auth, { kind: "phone-battle", stage: "defeat" });
  await phonePair(owner, "phone", "public-damage");
  await tvPair(tv, "public-consequence");

  await seed(auth, "private-choice");
  await phonePair(owner, "phone", "private-choice");
  await phonePair(guest, "waiting-phone", "private-choice-waiting");
  await tvPair(tv, "private-choice-public-safe");

  await seed(auth, "end-turn");
  await phonePair(owner, "phone", "end-turn-available");
  await owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "ENDING TURN" } })));
  await phonePair(owner, "phone", "end-turn-submitting");
  await phonePair(owner, "phone", "turn-closing");
  await phonePair(guest, "waiting-phone", "end-turn-submitting-waiting");

  await seed(auth, "handoff");
  await tvPair(tv, "turn-handoff", true);
  await phonePair(owner, "waiting-phone", "previous-player-waiting");
  await phonePair(guest, "phone", "next-turn-ready");
  await tv.waitForTimeout(1600);
  await tvPair(tv, "next-required-action");
  await tv.reload({ waitUntil: "networkidle" });
  if (await tv.getByTestId("tv-turn-handoff").count()) throw new Error("Handoff replayed after reconnect");
  await tvPair(tv, "reconnect-restored-handoff");

  await seed(auth, "result");
  await owner.reload({ waitUntil: "networkidle" });
  await phonePair(owner, "phone", "reconnect-result");
  await seed(auth, "end-turn");
  await owner.reload({ waitUntil: "networkidle" });
  await phonePair(owner, "phone", "reconnect-end-turn");

  await owner.emulateMedia({ reducedMotion: "reduce" });
  await seed(auth, "result");
  await phonePair(owner, "phone", "reduced-motion-result");
  await seed(auth, "handoff");
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await tvPair(tv, "reduced-motion-handoff", true);
  await tv.emulateMedia({ reducedMotion: "no-preference" });
  await owner.emulateMedia({ reducedMotion: "no-preference" });

  await seed(auth, "end-turn");
  await owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "blocked", label: "TURN ALREADY ADVANCED" } })));
  await phonePair(owner, "phone", "stale-end-turn-recovery");

  await seed(auth, "result");
  await owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "blocked", label: "RESULT ALREADY ADVANCED" } })));
  await phonePair(owner, "phone", "stale-continue-recovery");

  const tvText = await tv.locator("body").innerText();
  if (/candidateIds|private mission|rivalry target|internal id/i.test(tvText)) throw new Error("Private data leaked to TV");
  await recordFlow(browser, auth, "result-to-continue", ["result", "long-result"]);
  await recordFlow(browser, auth, "result-to-end-turn", ["result", "end-turn"]);
  await recordFlow(browser, auth, "human-to-human-handoff", ["end-turn", "handoff", "next-turn"]);
  await recordFlow(browser, auth, "reduced-motion-handoff", ["end-turn", "handoff"], true);
  await writeFile(join(output, "capture-results.json"), JSON.stringify({ captures, errors, unavailable: ["AI turn: no canonical AI-seat turn system exists; no state was fabricated."] }, null, 2));
  if (errors.length) throw new Error(errors.join("\n"));
  await Promise.all([ownerContext.close(), guestContext.close(), tvContext.close()]);
  await browser.close();
  console.log(JSON.stringify({ output, captures: captures.length, errors: errors.length }, null, 2));
}

await main();
