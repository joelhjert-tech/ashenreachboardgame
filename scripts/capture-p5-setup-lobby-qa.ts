import { mkdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface Capture { file: string; surface: "phone" | "tv"; state: string; viewport: string; overflow: number; primaryVisible: boolean; focusedControl: string | null }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p5-setup-lobby");
const captures: Capture[] = [];
const browserErrors: string[] = [];
const timings: Array<{ action: string; milliseconds: number; measurement: string }> = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => browserErrors.push(`${page.url()}: ${error.message}`));
}

async function capture(page: Page, surface: "phone" | "tv", state: string, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(220);
  const metrics = await page.evaluate(() => {
    const primary = Array.from(document.querySelectorAll("button")).find((button) =>
      /join game|confirm setup|select character|select mission|ready|start game/i.test(button.textContent ?? "") && !(button as HTMLButtonElement).disabled
    ) as HTMLElement | undefined;
    const rect = primary?.getBoundingClientRect();
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return {
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
      primaryVisible: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight),
      focusedControl: active && active !== document.body
        ? active.dataset.testid ?? Array.from(active.classList).find((name) => name.startsWith("phone-")) ?? active.textContent?.trim().slice(0, 48) ?? active.tagName
        : null
    };
  });
  if (metrics.overflow > 0) throw new Error(`${surface}-${state}-${width}x${height} overflows by ${metrics.overflow}px`);
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const file = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(directory, file), fullPage: false });
  captures.push({ file, surface, state, viewport: `${width}x${height}`, ...metrics });
}

async function phonePair(page: Page, state: string): Promise<void> {
  const expectedFocus: Record<string, string> = {
    "operative-selection": ".phone-character-option",
    "operative-selection-restored": ".phone-character-option",
    "mission-selection": ".phone-starting-mission-select",
    "ready-check": "[data-testid=phone-setup-ready-action]",
    "start-available": "[data-testid=phone-setup-start-action]"
  };
  if (expectedFocus[state]) {
    await page.waitForFunction((selector) => document.activeElement?.matches(selector) === true, expectedFocus[state], { timeout: 2_000 });
  }
  await capture(page, "phone", state, 390, 844);
  await capture(page, "phone", state, 360, 800);
}

async function tvPair(page: Page, state: string): Promise<void> {
  await capture(page, "tv", state, 1920, 1080);
  await capture(page, "tv", state, 1366, 768);
}

async function seed(auth: Auth, stage: string): Promise<void> {
  const startedAt = performance.now();
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "setup-flow", stage }
  });
  timings.push({ action: stage, milliseconds: Math.round(performance.now() - startedAt), measurement: "fixture request accepted by the authoritative server" });
}

async function recordSetupFlow(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  auth: Auth,
  name: string,
  stages: string[],
  reducedMotion: "reduce" | "no-preference" = "no-preference"
): Promise<void> {
  const recordingDirectory = join(output, "recordings", ".raw");
  await mkdir(recordingDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion,
    recordVideo: { dir: recordingDirectory, size: { width: 390, height: 844 } }
  });
  const page = await openStoredPhone(context, auth, reducedMotion);
  for (const stage of stages) {
    await seed(auth, stage);
    await page.waitForTimeout(reducedMotion === "reduce" ? 400 : 700);
  }
  if (name === "reconnect-during-setup") {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
  }
  const video = page.video();
  await page.close();
  const rawPath = await video?.path();
  await context.close();
  if (rawPath) {
    const target = join(output, "recordings", `${name}.webm`);
    await rename(rawPath, target);
  }
}

async function openStoredPhone(context: BrowserContext, auth: Auth, reducedMotion: "reduce" | "no-preference" = "no-preference"): Promise<Page> {
  await context.addInitScript((stored) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(stored)), auth);
  const page = await context.newPage();
  watch(page);
  await page.emulateMedia({ reducedMotion });
  await page.goto(`${client}/?room=${auth.roomCode}`, { waitUntil: "networkidle" });
  return page;
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const joinContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await joinContext.newPage();
  watch(phone);
  await phone.goto(`${client}/?resetAuth=1`, { waitUntil: "networkidle" });
  await phonePair(phone, "join-room");
  await phone.getByRole("textbox", { name: "Room code" }).fill("WRONG");
  await phone.getByRole("textbox", { name: "Player name" }).fill("Joel");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.locator(".error").waitFor();
  await phonePair(phone, "invalid-room");

  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 6
  });
  await phone.getByRole("textbox", { name: "Room code" }).fill(session.roomCode);
  const joinStartedAt = performance.now();
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  timings.push({ action: "join-room", milliseconds: Math.round(performance.now() - joinStartedAt), measurement: "Join submission to authoritative operative-selection projection" });
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Host Phone auth was not stored");
  await phonePair(phone, "operative-selection");

  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvContext.newPage();
  watch(tv);
  await tv.goto(`${client}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });
  await tvPair(tv, "one-joined-player");

  await seed(auth, "scenario-selection");
  await phone.getByRole("heading", { name: /Host Phone Setup/i }).waitFor();
  await phonePair(phone, "mode-selection");
  await tvPair(tv, "scenario-selection");
  await phone.getByRole("button", { name: "Multiplayer Co-op" }).click();
  await phonePair(phone, "co-op-selected");
  await phone.getByRole("button", { name: "Rivalry" }).click();
  await phonePair(phone, "rivalry-selected");
  await phone.getByRole("button", { name: "Single Player" }).click();
  await phonePair(phone, "single-player-selected");

  await seed(auth, "operative-selection");
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await phonePair(phone, "operative-selection-restored");

  for (const stage of ["mission-selection", "ready-check", "start-blocked", "start-available"] as const) {
    await seed(auth, stage);
    await phone.waitForTimeout(250);
    await phonePair(phone, stage);
    await tvPair(tv, stage);
  }

  await phone.reload({ waitUntil: "networkidle" });
  await phonePair(phone, "reconnect-start-available");

  await seed(auth, "maximum-players");
  await tvPair(tv, "maximum-player-slots");
  const rejectedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const rejected = await rejectedContext.newPage();
  // The deliberate full-room request returns HTTP 400; keep it out of the
  // unexpected browser-error ledger while still asserting the player copy.
  await rejected.goto(`${client}/?room=${session.roomCode}&resetAuth=1`, { waitUntil: "networkidle" });
  await rejected.getByRole("textbox", { name: "Player name" }).fill("Late Player");
  await rejected.getByRole("button", { name: "Join Game" }).click();
  await rejected.getByText(/room full/i).first().waitFor();
  await phonePair(rejected, "room-full");

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPhone = await openStoredPhone(reducedContext, auth, "reduce");
  await seed(auth, "ready-check");
  await phonePair(reducedPhone, "reduced-motion-ready");
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await tvPair(tv, "reduced-motion-lobby");

  await recordSetupFlow(browser, auth, "join-through-ready", ["operative-selection", "mission-selection", "ready-check"]);
  await recordSetupFlow(browser, auth, "mode-and-scenario-selection", ["scenario-selection", "operative-selection"]);
  await recordSetupFlow(browser, auth, "operative-selection", ["operative-selection", "mission-selection"]);
  await recordSetupFlow(browser, auth, "full-room-to-start", ["start-blocked", "start-available"]);
  await recordSetupFlow(browser, auth, "reconnect-during-setup", ["start-available"]);
  await recordSetupFlow(browser, auth, "reduced-motion-setup", ["ready-check", "start-available"], "reduce");

  await writeFile(join(output, "capture-results.json"), JSON.stringify({ captures, browserErrors, timings }, null, 2));
  await Promise.all([joinContext.close(), tvContext.close(), rejectedContext.close(), reducedContext.close()]);
  await browser.close();
  if (browserErrors.length) throw new Error(browserErrors.join("\n"));
  console.log(JSON.stringify({ output, captures: captures.length, browserErrors: browserErrors.length }, null, 2));
}

await main();
