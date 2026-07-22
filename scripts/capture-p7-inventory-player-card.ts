import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CaptureRecord { file: string; surface: string; state: string; viewport: string; overflow: number }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p7-inventory-player-card");
const captures: CaptureRecord[] = [];
const errors: string[] = [];
const timings: Record<string, number> = {};

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
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
}

async function joinPhone(page: Page, roomCode: string, name: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`No controller auth for ${name}`);
  return auth;
}

async function seed(auth: Auth, stage: string): Promise<void> {
  const start = performance.now();
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "inventory-player-card", stage }
  });
  timings[`fixture-${stage}`] = Math.round(performance.now() - start);
  // Let the authoritative WebSocket projection settle before deliberately
  // leaving the required-action tab for passive inspection.
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
}

async function openTab(page: Page, label: "Player Card" | "Inventory"): Promise<void> {
  const start = performance.now();
  if (label === "Inventory") {
    const combatCards = page.getByRole("button", { name: /Open Combat Cards/i });
    if (await combatCards.isVisible()) {
      await combatCards.click();
      await page.waitForTimeout(100);
      timings[`open-${label.toLowerCase()}`] = Math.round(performance.now() - start);
      return;
    }
  }
  const tabKey = label === "Player Card" ? "player" : "inventory";
  let button = page.locator(`button[data-tab="${tabKey}"]`);
  if (!(await button.isVisible())) {
    const showTabs = page.getByRole("button", { name: "Show Tabs", exact: true });
    if (await showTabs.isVisible()) await showTabs.click();
    button = page.locator(`button[data-tab="${tabKey}"]`);
  }
  if (await button.isVisible()) {
    await button.click();
    await page.waitForTimeout(100);
    if ((await button.getAttribute("aria-selected")) !== "true") await button.click();
  }
  await page.waitForTimeout(100);
  timings[`open-${label.toLowerCase().replace(" ", "-")}`] = Math.round(performance.now() - start);
}

async function capture(page: Page, surface: string, state: string, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(160);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>(".phone-portrait-scroll, .phone-action-content-root, .phone-sheet-actions").forEach((element) => { element.scrollTop = 0; });
  });
  const metrics = await page.evaluate(() => ({
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  const overflow = Math.max(metrics.root, metrics.body) - metrics.viewport;
  if (overflow > 0) throw new Error(`${surface}-${state} overflows by ${overflow}px`);
  const folder = join(output, surface);
  await mkdir(folder, { recursive: true });
  const file = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(folder, file), fullPage: false });
  captures.push({ file, surface, state, viewport: `${width}x${height}`, overflow });
}

async function phonePair(page: Page, surface: string, state: string): Promise<void> {
  await capture(page, surface, state, 390, 844);
  await capture(page, surface, state, 360, 800);
}

async function tvPair(page: Page, state: string): Promise<void> {
  await capture(page, "tv", state, 1920, 1080);
  await capture(page, "tv", state, 1366, 768);
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 2
  });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: join(output, "recordings", "raw"), size: { width: 390, height: 844 } } });
  const waitingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await tvContext.addInitScript(({ token }) => localStorage.setItem("ashenreach-tv-host-token", token), { token: session.hostToken });
  const owner = await ownerContext.newPage();
  const waiting = await waitingContext.newPage();
  const tv = await tvContext.newPage();
  [owner, waiting, tv].forEach(watch);
  const auth = await joinPhone(owner, session.roomCode, "P7Owner", /Bjornis/i);
  await joinPhone(waiting, session.roomCode, "P7Waiting", /Deepdale/i);
  await owner.getByRole("button", { name: "Start Game" }).click();
  await tv.goto(`${client}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });

  const playerStates = [
    ["basic", "basic-player-card"],
    ["battle", "relevant-battle-stat"],
    ["movement", "relevant-movement-stat"],
    ["wounds-scars", "wounds-and-scars"],
    ["equipped", "equipped-summary"]
  ] as const;
  for (const [stage, name] of playerStates) {
    await seed(auth, stage);
    await openTab(owner, "Player Card");
    await phonePair(owner, "phone", name);
  }

  const inventoryStates = [
    ["battle", "contextual-relevant-now"],
    ["none-relevant", "no-relevant-objects"],
    ["equipped", "equipped-equipment"],
    ["carried", "carried-equipment"],
    ["consumable", "consumable-item"],
    ["charged", "charged-item"],
    ["exhausted", "exhausted-item"],
    ["wrong-timing", "wrong-timing-item"],
    ["passive-artifact", "passive-artifact"],
    ["active-artifact", "active-artifact"],
    ["empty", "empty-inventory"],
    ["many", "many-owned-objects"],
    ["long-copy", "long-rules-and-lore"],
    ["missing-art", "missing-art"],
    ["relevant-one", "relevant-now-one"],
    ["relevant-many", "relevant-now-many"],
    ["use-result", "use-result"],
    ["reconnect", "reconnect-after-use"]
  ] as const;
  for (const [stage, name] of inventoryStates) {
    await seed(auth, stage);
    await openTab(owner, "Inventory");
    await phonePair(owner, "phone", name);
  }

  await seed(auth, "battle");
  await openTab(owner, "Inventory");
  await phonePair(owner, "phone", "return-to-required-action");
  await openTab(waiting, "Inventory");
  await phonePair(waiting, "waiting-phone", "own-inventory-during-wait");
  await tvPair(tv, "private-inventory-hidden");

  await owner.emulateMedia({ reducedMotion: "reduce" });
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(auth, "long-copy");
  await openTab(owner, "Inventory");
  await phonePair(owner, "phone", "reduced-motion-inspection");
  await tvPair(tv, "reduced-motion-summary");

  await seed(auth, "missing-art");
  await tvPair(tv, "missing-art-fallback");
  await seed(auth, "wounds-scars");
  await tvPair(tv, "public-wounds-and-scars");
  await seed(auth, "equipped");
  await tvPair(tv, "public-operative-summary");

  const video = owner.video();
  await owner.close();
  if (video) await video.saveAs(join(output, "recordings", "player-card-inventory-relevance.webm"));
  await waiting.close();
  await tv.close();
  await ownerContext.close();
  await waitingContext.close();
  await tvContext.close();
  await browser.close();

  await writeFile(join(output, "capture-index.json"), JSON.stringify({ captures, errors, timings }, null, 2), "utf8");
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, screenshots: captures.length, timings }, null, 2));
}

await main();
