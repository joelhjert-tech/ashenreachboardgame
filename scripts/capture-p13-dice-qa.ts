import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CaptureRecord {
  filename: string;
  surface: "phone" | "waiting-phone" | "host";
  state: string;
  viewport: string;
  horizontalOverflow: number;
  diceValues: string[];
  reducedMotion: boolean;
}

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p13-dice");
const records: CaptureRecord[] = [];
const browserErrors: string[] = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`${page.url()}: ${error.message}`));
}

async function joinPhone(page: Page, roomCode: string, name: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1&qaNetworkControls=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Missing stored controller session for ${name}`);
  await page.evaluate((cleanRoomCode) => window.history.replaceState(null, "", `/?room=${cleanRoomCode}`), roomCode);
  return auth;
}

async function startSession(browser: Browser, players: 1 | 2): Promise<{
  session: SessionResponse;
  owner: Page;
  auth: Auth;
  guest?: Page;
}> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: players === 1 ? "single-player" : "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: players
  });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  watch(owner);
  const auth = await joinPhone(owner, session.roomCode, "DiceOwner", /Bjornis/i);
  let guest: Page | undefined;
  if (players === 2) {
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    guest = await guestContext.newPage();
    watch(guest);
    await joinPhone(guest, session.roomCode, "DiceWaiting", /Deepdale/i);
  }
  await owner.getByRole("button", { name: "Start Game" }).click();
  await owner.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  if (guest) await guest.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  return { session, owner, auth, guest };
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function capture(
  page: Page,
  surface: CaptureRecord["surface"],
  state: string,
  width: number,
  height: number
): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(state.includes("result") ? 1_100 : surface === "host" ? 350 : 600);
  await page.evaluate((captureState) => {
    if (captureState === "event-test-result") {
      document.querySelector<HTMLElement>('[data-testid="authoritative-dice-presentation"]')?.scrollIntoView({ block: "center" });
      return;
    }
    document.scrollingElement?.scrollTo(0, 0);
  }, state);
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    dice: Array.from(document.querySelectorAll<HTMLElement>("[data-die-value]"))
      .filter((die) => die.offsetParent !== null)
      .map((die) => die.dataset.dieValue ?? "pending"),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }));
  const horizontalOverflow = Math.max(metrics.body, metrics.root) - metrics.viewport;
  if (horizontalOverflow > 0) throw new Error(`${surface}-${state}-${width}x${height} overflows by ${horizontalOverflow}px`);
  const viewport = `${width}x${height}`;
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const filename = `${state}-${viewport}.png`;
  await page.screenshot({ path: join(directory, filename), fullPage: false });
  records.push({ filename, surface, state, viewport, horizontalOverflow, diceValues: metrics.dice, reducedMotion: metrics.reducedMotion });
}

async function capturePhoneState(page: Page, auth: Auth, state: string, fixture: unknown): Promise<void> {
  await seed(auth, fixture);
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]] as const) {
    await capture(page, "phone", state, width, height);
  }
}

async function captureHostState(page: Page, auth: Auth, state: string, fixture: unknown): Promise<void> {
  await seed(auth, fixture);
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await capture(page, "host", state, width, height);
  }
}

async function recordFlow(
  browser: Browser,
  auth: Auth,
  name: string,
  fixtures: unknown[],
  reducedMotion = false
): Promise<void> {
  const recordingDirectory = join(output, "recordings");
  await mkdir(recordingDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    recordVideo: { dir: join(recordingDirectory, "raw"), size: { width: 390, height: 844 } }
  });
  await context.addInitScript((storedAuth) => {
    localStorage.setItem("ashenreach.controllerSession", JSON.stringify(storedAuth));
  }, auth);
  const page = await context.newPage();
  watch(page);
  await page.goto(`${client}/?room=${auth.roomCode}`, { waitUntil: "networkidle" });
  for (const fixture of fixtures) {
    await seed(auth, fixture);
    await page.waitForTimeout(reducedMotion ? 450 : 900);
  }
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`No video produced for ${name}`);
  await video.saveAs(join(recordingDirectory, `${name}.webm`));
  await context.close();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const single = await startSession(browser, 1);

  await capturePhoneState(single.owner, single.auth, "movement-roll-ready", { kind: "phone-movement", stage: "roll-required" });
  await capturePhoneState(single.owner, single.auth, "movement-roll-result", { kind: "phone-movement", stage: "four-routes" });
  await capturePhoneState(single.owner, single.auth, "battle-roll-ready", { kind: "phone-battle", stage: "battle-setup" });
  await capturePhoneState(single.owner, single.auth, "battle-two-die-result", { kind: "phone-battle", stage: "rolled-result" });
  await capturePhoneState(single.owner, single.auth, "event-test-result", { kind: "card-category", stage: "hazard-failure" });

  await seed(single.auth, { kind: "phone-battle", stage: "rolled-result" });
  await single.owner.reload({ waitUntil: "networkidle" });
  await capture(single.owner, "phone", "reconnect-stable-result", 390, 844);
  await single.owner.emulateMedia({ reducedMotion: "reduce" });
  await seed(single.auth, { kind: "phone-battle", stage: "rolled-result" });
  await capture(single.owner, "phone", "reduced-motion-result", 390, 844);
  await single.owner.emulateMedia({ reducedMotion: "no-preference" });

  const coop = await startSession(browser, 2);
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvContext.newPage();
  watch(tv);
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: coop.session.hostToken });
  await tv.goto(`${client}/tv?room=${coop.session.roomCode}`, { waitUntil: "networkidle" });

  await captureHostState(tv, coop.auth, "movement-roll-result", { kind: "phone-movement", stage: "four-routes" });
  await captureHostState(tv, coop.auth, "battle-roll-ready", { kind: "phone-battle", stage: "battle-setup" });
  await captureHostState(tv, coop.auth, "battle-two-die-result", { kind: "phone-battle", stage: "rolled-result" });
  await captureHostState(tv, coop.auth, "event-test-result", { kind: "card-category", stage: "hazard-failure" });

  await seed(coop.auth, { kind: "phone-battle", stage: "rolled-result" });
  await tv.reload({ waitUntil: "networkidle" });
  await capture(tv, "host", "reconnect-stable-result", 1920, 1080);
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await captureHostState(tv, coop.auth, "reduced-motion-result", { kind: "phone-battle", stage: "rolled-result" });
  await tv.emulateMedia({ reducedMotion: "no-preference" });

  if (!coop.guest) throw new Error("Co-op waiting phone was not created");
  await seed(coop.auth, { kind: "phone-battle", stage: "battle-setup" });
  await capture(coop.guest, "waiting-phone", "waiting-for-owner-roll", 390, 844);
  const waitingText = await coop.guest.locator("body").innerText();
  if (/reroll die|roll combat|owner-only choice/i.test(waitingText)) {
    throw new Error("Waiting phone exposed an owner-only dice action");
  }

  await recordFlow(browser, coop.auth, "movement-ready-to-result", [
    { kind: "phone-movement", stage: "roll-required" },
    { kind: "phone-movement", stage: "four-routes" }
  ]);
  await recordFlow(browser, coop.auth, "battle-ready-to-result", [
    { kind: "phone-battle", stage: "battle-setup" },
    { kind: "phone-battle", stage: "rolled-result" }
  ]);
  await recordFlow(browser, coop.auth, "reroll-window", [
    { kind: "card-category", stage: "hazard-before" },
    { kind: "card-category", stage: "hazard-failure" }
  ]);
  await recordFlow(browser, coop.auth, "reduced-motion-battle", [
    { kind: "phone-battle", stage: "battle-setup" },
    { kind: "phone-battle", stage: "rolled-result" }
  ], true);

  await writeFile(join(output, "capture-results.json"), JSON.stringify({
    captures: records,
    browserErrors,
    unsupported: [
      "Three-or-more operative dice: no canonical current fixture resolves three operative dice; no synthetic roll was fabricated.",
      "Movement die on the TV before the authoritative result: the established map-first TV does not enter movement focus until a planner/result exists.",
      "Forced branch dice: P13 preserves canonical calculated outcomes and does not fabricate branch-only dice."
    ]
  }, null, 2));
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);

  await Promise.all([single.owner.close(), coop.owner.close(), coop.guest.close(), tv.close()]);
  await browser.close();
  console.log(JSON.stringify({ output, captures: records.length, recordings: 4, browserErrors: browserErrors.length }, null, 2));
}

await main();
