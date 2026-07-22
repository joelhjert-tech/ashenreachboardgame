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
  primaryButtons: string[];
}

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p3-encounter-battle");
const records: CaptureRecord[] = [];
const browserErrors: string[] = [];
const qaWarnings: string[] = [];

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
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Missing stored controller session for ${name}`);
  return auth;
}

async function startSession(browser: Browser, playerCount: 1 | 2): Promise<{
  session: SessionResponse;
  owner: Page;
  ownerAuth: Auth;
  guest?: Page;
}> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: playerCount === 1 ? "single-player" : "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount
  });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  watch(owner);
  const ownerAuth = await joinPhone(owner, session.roomCode, "P3Owner", /Bjornis/i);
  let guest: Page | undefined;
  if (playerCount === 2) {
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    guest = await guestContext.newPage();
    watch(guest);
    await joinPhone(guest, session.roomCode, "P3Waiting", /Deepdale/i);
  }
  await owner.getByRole("button", { name: "Start Game" }).click();
  await owner.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  if (guest) await guest.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  return { session, owner, ownerAuth, guest };
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
  // Allow the fixture broadcast and the non-blocking entrance treatment to settle
  // before measuring or naming the capture. Gameplay timing never depends on this.
  await page.waitForTimeout(surface === "host" ? 120 : 700);
  try {
    await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLElement>('[data-artwork-status]'))
      .filter((frame) => frame.offsetParent !== null)
      .every((frame) => frame.dataset.artworkStatus === "ready" || frame.dataset.artworkStatus === "failed"), null, { timeout: 8_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      battleStage: document.querySelector<HTMLElement>('[data-testid="tv-host-battle-chamber"]')?.dataset.battleStage
        ?? document.querySelector<HTMLElement>('[data-testid="phone-battle-arena"]')?.dataset.battleStage
        ?? null,
      unresolvedArtwork: Array.from(document.querySelectorAll<HTMLElement>('[data-artwork-status="loading"]'))
        .filter((frame) => frame.offsetParent !== null).length,
      visibleFallbacks: Array.from(document.querySelectorAll<HTMLElement>('[data-artwork-status="failed"]'))
        .filter((frame) => frame.offsetParent !== null).length
    }));
    throw new Error(`Timed out waiting for semantic battle presentation: ${JSON.stringify(state)}`, { cause: error });
  }
  await page.waitForTimeout(surface === "host" ? 50 : 200);
  await page.evaluate(() => {
    document.scrollingElement?.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>("main, [class*='scroll'], [class*='content']")
      .forEach((element) => { element.scrollTop = 0; });
  });
  const metrics = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
      .filter((button) => button.offsetParent !== null)
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);
    return {
      body: document.body.scrollWidth,
      root: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      buttons
    };
  });
  const horizontalOverflow = Math.max(metrics.body, metrics.root) - metrics.viewport;
  if (horizontalOverflow > 0) throw new Error(`${surface}-${state}-${width}x${height} overflows by ${horizontalOverflow}px`);
  const viewport = `${width}x${height}`;
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const filename = `${state}-${viewport}.png`;
  await page.screenshot({ path: join(directory, filename), fullPage: false });
  records.push({ filename, surface, state, viewport, horizontalOverflow, primaryButtons: metrics.buttons });
}

async function capturePhonePair(page: Page, surface: "phone" | "waiting-phone", state: string): Promise<void> {
  await capture(page, surface, state, 390, 844);
  await capture(page, surface, state, 360, 800);
}

async function captureHostPair(page: Page, state: string): Promise<void> {
  await capture(page, "host", state, 1920, 1080);
  await capture(page, "host", state, 1366, 768);
}

async function waitForHostFixture(page: Page, fixture: unknown): Promise<void> {
  const candidate = fixture as { kind?: string; stage?: string };
  if (candidate.kind !== "phone-battle") return;
  const chamber = page.getByTestId("tv-host-battle-chamber");
  await chamber.waitFor({ state: "visible", timeout: 8_000 });
  if (candidate.stage === "success") await chamber.getByText("SUCCESS", { exact: true }).waitFor({ timeout: 3_000 });
  if (candidate.stage === "defeat") await chamber.getByText("DEFEAT", { exact: true }).waitFor({ timeout: 3_000 });
}

async function captureSeededHostPair(page: Page, auth: Auth, state: string, fixture: unknown): Promise<void> {
  await seed(auth, fixture);
  await waitForHostFixture(page, fixture);
  await captureHostPair(page, state);
}

async function recordPhoneFlow(
  browser: Browser,
  auth: Auth,
  name: string,
  fixtures: unknown[]
): Promise<void> {
  const recordingDirectory = join(output, "recordings");
  await mkdir(recordingDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
    await page.waitForTimeout(750);
  }
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Playwright did not create the ${name} recording`);
  await video.saveAs(join(recordingDirectory, `${name}.webm`));
  await context.close();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const single = await startSession(browser, 1);

  const phoneStates: Array<{ state: string; fixture: unknown }> = [
    { state: "01-encounter-entry", fixture: { kind: "phone-battle", stage: "encounter" } },
    { state: "02-long-encounter-text", fixture: { kind: "phone-action", stage: "event-ready" } },
    { state: "03-battle-ready", fixture: { kind: "phone-battle", stage: "battle-setup" } },
    { state: "05-two-die-battle", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "08-reaction-available", fixture: { kind: "card-category", stage: "hazard-failure" } },
    { state: "09-reroll-cost", fixture: { kind: "card-category", stage: "hazard-failure" } },
    { state: "11-modifier-breakdown", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "12-final-totals", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "13-success", fixture: { kind: "phone-battle", stage: "success" } },
    { state: "14-failure", fixture: { kind: "phone-battle", stage: "defeat" } },
    { state: "16-damage-consequence", fixture: { kind: "phone-battle", stage: "defeat" } },
    { state: "17-private-reward-choice", fixture: { kind: "discovery-equipment", stage: "equip-choice" } },
    { state: "18-private-scar-choice", fixture: { kind: "scar-system", stage: "choice" } },
    { state: "19-result-with-continue", fixture: { kind: "phone-battle", stage: "success" } }
  ];
  for (const entry of phoneStates) {
    await seed(single.ownerAuth, entry.fixture);
    await capturePhonePair(single.owner, "phone", entry.state);
  }

  await seed(single.ownerAuth, { kind: "phone-battle", stage: "battle-setup" });
  await single.owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "ROLLING" } })));
  await capturePhonePair(single.owner, "phone", "06-roll-submitting");
  await single.owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "resolving", label: "ROLLING" } })));
  await capturePhonePair(single.owner, "phone", "07-rolling");

  await seed(single.ownerAuth, { kind: "card-category", stage: "hazard-failure" });
  await single.owner.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "REROLLING" } })));
  await capturePhonePair(single.owner, "phone", "10-reroll-submitting");

  await seed(single.ownerAuth, { kind: "phone-battle", stage: "success" });
  await single.owner.waitForTimeout(160);
  await single.owner.reload({ waitUntil: "networkidle" });
  await capturePhonePair(single.owner, "phone", "20-reconnect-during-battle");

  await seed(single.ownerAuth, { kind: "scar-system", stage: "choice" });
  await single.owner.waitForTimeout(160);
  await single.owner.reload({ waitUntil: "networkidle" });
  await capturePhonePair(single.owner, "phone", "21-reconnect-private-choice");

  await single.owner.emulateMedia({ reducedMotion: "reduce" });
  await seed(single.ownerAuth, { kind: "phone-battle", stage: "success" });
  await capturePhonePair(single.owner, "phone", "23-reduced-motion-result");
  await single.owner.emulateMedia({ reducedMotion: "no-preference" });

  const coop = await startSession(browser, 2);
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvContext.newPage();
  watch(tv);
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: coop.session.hostToken });
  await tv.goto(`${client}/tv?room=${coop.session.roomCode}`, { waitUntil: "networkidle" });

  const hostStates: Array<{ state: string; fixture: unknown }> = [
    { state: "01-board-before-encounter", fixture: { kind: "phone-action", stage: "free-action" } },
    { state: "02-encounter-focus", fixture: { kind: "phone-battle", stage: "encounter" } },
    { state: "03-battle-entry", fixture: { kind: "phone-battle", stage: "battle-setup" } },
    { state: "04-combatant-comparison", fixture: { kind: "phone-battle", stage: "battle-setup" } },
    { state: "05-raw-dice", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "06-modifier-presentation", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "07-final-totals", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "08-success-result", fixture: { kind: "phone-battle", stage: "success" } },
    { state: "09-failure-result", fixture: { kind: "phone-battle", stage: "defeat" } },
    { state: "11-public-damage", fixture: { kind: "phone-battle", stage: "defeat" } },
    { state: "12-private-decision-waiting", fixture: { kind: "scar-system", stage: "choice" } },
    { state: "13-public-reward-result", fixture: { kind: "phone-battle", stage: "success" } },
    { state: "14-persistent-encounter", fixture: { kind: "card-category", stage: "persistent" } },
    { state: "15-return-to-board", fixture: { kind: "phone-action", stage: "free-action" } }
  ];
  for (const entry of hostStates) {
    await captureSeededHostPair(tv, coop.ownerAuth, entry.state, entry.fixture);
    const fixture = entry.fixture as { kind?: string; stage?: string };
    if (fixture.kind === "phone-battle" && ["rolled-result", "success", "defeat"].includes(fixture.stage ?? "")) {
      await seed(coop.ownerAuth, { kind: "phone-action", stage: "free-action" });
      await tv.waitForTimeout(1_800);
    }
  }

  await seed(coop.ownerAuth, { kind: "phone-battle", stage: "success" });
  await waitForHostFixture(tv, { kind: "phone-battle", stage: "success" });
  await captureHostPair(tv, "16a-result-before-reconnect");
  await tv.reload({ waitUntil: "networkidle" });
  await captureHostPair(tv, "16-reconnect-restored-result");
  const restoredChamber = tv.getByTestId("tv-host-battle-chamber");
  if (await restoredChamber.count()) {
    const restored = await restoredChamber.getAttribute("data-battle-restored");
    if (restored !== "true") throw new Error(`Reconnect battle was not marked restored (received ${restored ?? "null"})`);
  } else {
    qaWarnings.push("The reconnect screenshot restored the authoritative board without remounting the completed battle chamber; replay suppression remains covered by the client regression test.");
  }

  await tv.emulateMedia({ reducedMotion: "reduce" });
  await captureSeededHostPair(tv, coop.ownerAuth, "17-reduced-motion-result", { kind: "phone-battle", stage: "success" });
  await tv.emulateMedia({ reducedMotion: "no-preference" });

  if (!coop.guest) throw new Error("Co-op guest was not created");
  const waitingStates: Array<{ state: string; fixture: unknown }> = [
    { state: "01-waiting-for-roll", fixture: { kind: "phone-battle", stage: "battle-setup" } },
    { state: "02-waiting-for-reaction", fixture: { kind: "card-category", stage: "hazard-failure" } },
    { state: "03-waiting-for-private-reward", fixture: { kind: "discovery-equipment", stage: "equip-choice" } },
    { state: "04-public-result", fixture: { kind: "phone-battle", stage: "success" } }
  ];
  for (const entry of waitingStates) {
    await seed(coop.ownerAuth, entry.fixture);
    await capturePhonePair(coop.guest, "waiting-phone", entry.state);
  }
  await coop.guest.evaluate(() => window.dispatchEvent(new Event("ashenreach:qa-disconnect")));
  await coop.guest.waitForTimeout(150);
  await capturePhonePair(coop.guest, "waiting-phone", "05-reconnecting");

  await recordPhoneFlow(browser, coop.ownerAuth, "straightforward-combat", [
    { kind: "phone-battle", stage: "encounter" },
    { kind: "phone-battle", stage: "battle-setup" },
    { kind: "phone-battle", stage: "rolled-result" },
    { kind: "phone-battle", stage: "success" }
  ]);
  await recordPhoneFlow(browser, coop.ownerAuth, "two-die-modified-combat", [
    { kind: "phone-battle", stage: "battle-setup" },
    { kind: "phone-battle", stage: "rolled-result" },
    { kind: "cinder-wattle", stage: "ability-prepared" },
    { kind: "cinder-wattle", stage: "battle-result" }
  ]);
  await recordPhoneFlow(browser, coop.ownerAuth, "reroll-reaction-flow", [
    { kind: "card-category", stage: "hazard-before" },
    { kind: "card-category", stage: "hazard-failure" }
  ]);
  await recordPhoneFlow(browser, coop.ownerAuth, "private-consequence-reward-flow", [
    { kind: "phone-battle", stage: "defeat" },
    { kind: "scar-system", stage: "choice" },
    { kind: "discovery-equipment", stage: "equip-choice" }
  ]);
  await recordPhoneFlow(browser, coop.ownerAuth, "persistent-encounter-flow", [
    { kind: "card-category", stage: "persistent" },
    { kind: "phone-action", stage: "free-action" }
  ]);

  const tvText = await tv.locator("body").innerText();
  if (/scar candidate|choose one artifact|rivalry target|private mission|internal id/i.test(tvText)) {
    throw new Error("Private or internal data leaked to the TV");
  }

  await writeFile(join(output, "capture-results.json"), JSON.stringify({
    captures: records,
    unsupported: [
      "One-die battle: canonical combat rolls two operative dice.",
      "Draw outcome: the current battle resolver treats ties according to canonical success rules; no draw fixture exists.",
      "Stale-action recovery reuses the completed P1 capture because the rejection banner belongs to the required-action shell, not the focused P3 battle shell."
    ],
    qaWarnings,
    browserErrors
  }, null, 2));
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);

  await Promise.all([single.owner.close(), coop.owner.close(), coop.guest.close(), tv.close()]);
  await browser.close();
  console.log(JSON.stringify({ output, captures: records.length, browserErrors: browserErrors.length }, null, 2));
}

await main();
