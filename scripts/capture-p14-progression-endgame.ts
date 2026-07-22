import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface RecordEntry {
  surface: "phone" | "waiting-phone" | "host";
  state: string;
  viewport: string;
  filename: string;
  horizontalOverflow: number;
  verticalClipping: number;
  reducedMotion: boolean;
}

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p14-progression-endgame");
const records: RecordEntry[] = [];
const consoleErrors: string[] = [];

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
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => consoleErrors.push(`${page.url()}: ${error.message}`));
}

async function joinPhone(page: Page, roomCode: string, displayName: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1&qaNetworkControls=1`, { waitUntil: "networkidle" });
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Missing auth for ${displayName}`);
  return auth;
}

async function startCoop(browser: Browser): Promise<{ session: SessionResponse; owner: Page; guest: Page; auth: Auth }> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 2
  });
  const owner = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const guest = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  watch(owner); watch(guest);
  const auth = await joinPhone(owner, session.roomCode, "Joel", /Bjornis/i);
  await joinPhone(guest, session.roomCode, "Mira", /Deepdale/i);
  await owner.getByRole("button", { name: "Start Game" }).click();
  await owner.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  return { session, owner, guest, auth };
}

async function seed(auth: Auth, stage: string): Promise<void> {
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "progression-endgame", stage }
  });
}

async function showObjectives(page: Page): Promise<void> {
  const reveal = page.getByRole("button", { name: /show tabs/i });
  if (await reveal.count() && await reveal.first().isVisible()) await reveal.first().click();
  const tab = page.getByRole("tab", { name: /objectives/i });
  if (await tab.count() && await tab.first().isVisible()) await tab.first().click();
}

async function capture(page: Page, surface: RecordEntry["surface"], state: string, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(surface === "host" ? 500 : 350);
  if (surface !== "host") await showObjectives(page);
  await page.evaluate(() => document.scrollingElement?.scrollTo(0, 0));
  const metrics = await page.evaluate(() => ({
    rootWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    rootHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
  }));
  const horizontalOverflow = Math.max(0, metrics.rootWidth - metrics.viewportWidth);
  if (horizontalOverflow > 0) throw new Error(`${surface}/${state}/${width}x${height} overflows ${horizontalOverflow}px horizontally`);
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const filename = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(directory, filename), fullPage: false });
  records.push({
    surface,
    state,
    viewport: `${width}x${height}`,
    filename,
    horizontalOverflow,
    verticalClipping: Math.max(0, metrics.rootHeight - metrics.viewportHeight),
    reducedMotion: metrics.reducedMotion
  });
}

async function capturePhoneStage(page: Page, auth: Auth, name: string, stage: string): Promise<void> {
  await seed(auth, stage);
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]] as const) await capture(page, "phone", name, width, height);
}

async function captureHostStage(page: Page, auth: Auth, name: string, stage: string): Promise<void> {
  await seed(auth, stage);
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) await capture(page, "host", name, width, height);
}

async function recordFlow(browser: Browser, auth: Auth, name: string, stages: string[], reducedMotion = false): Promise<void> {
  const directory = join(output, "recordings");
  await mkdir(directory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    recordVideo: { dir: join(directory, "raw"), size: { width: 390, height: 844 } }
  });
  await context.addInitScript((value) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(value)), auth);
  const page = await context.newPage();
  watch(page);
  await page.goto(`${client}/?room=${auth.roomCode}`, { waitUntil: "networkidle" });
  for (const stage of stages) {
    await seed(auth, stage);
    await page.waitForTimeout(reducedMotion ? 450 : 950);
  }
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Missing video for ${name}`);
  await video.saveAs(join(directory, `${name}.webm`));
  await context.close();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const coop = await startCoop(browser);
  const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  watch(tv);
  await tv.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, coop.session);
  await tv.goto(`${client}/tv?room=${coop.session.roomCode}`, { waitUntil: "networkidle" });

  const phoneStates: Array<[string, string]> = [
    ["early-progress", "early-progress"], ["near-victory", "near-win"], ["progress-gain", "progress-gain"],
    ["early-pressure", "early-pressure"], ["near-defeat", "near-loss"], ["pressure-gain", "pressure-gain"],
    ["critical-warning", "critical"], ["final-stage-entry", "final-stage"], ["final-objective", "final-stage"],
    ["coop-victory", "coop-victory"], ["coop-defeat", "coop-defeat"], ["solo-victory", "solo-victory"],
    ["solo-defeat", "solo-defeat"], ["rivalry-public-result", "rivalry-result"], ["nemesis-relay-result", "nemesis-result"],
    ["match-summary", "coop-victory"], ["return-to-lobby", "coop-victory"], ["leave-room", "coop-victory"],
    ["long-mission-title", "long-mission"], ["long-defeat-reason", "long-defeat"]
  ];
  for (const [name, stage] of phoneStates) await capturePhoneStage(coop.owner, coop.auth, name, stage);

  const hostStates: Array<[string, string]> = [
    ["early-progression", "early-progress"], ["near-win-state", "near-win"], ["progress-gain", "progress-gain"],
    ["near-loss-state", "near-loss"], ["pressure-gain", "pressure-gain"], ["critical-warning", "critical"],
    ["final-stage-announcement", "final-stage"], ["final-objective-on-board", "final-stage"],
    ["coop-victory", "coop-victory"], ["coop-defeat", "coop-defeat"], ["rivalry-winner", "rivalry-result"],
    ["rivalry-private-details-hidden", "rivalry-result"], ["nemesis-relay-result", "nemesis-result"],
    ["match-summary", "coop-victory"], ["missing-art-fallback", "long-mission"]
  ];
  for (const [name, stage] of hostStates) await captureHostStage(tv, coop.auth, name, stage);

  await seed(coop.auth, "reconnect-victory");
  await coop.owner.reload({ waitUntil: "networkidle" });
  await capture(coop.owner, "phone", "reconnect-during-victory", 390, 844);
  await coop.owner.emulateMedia({ reducedMotion: "reduce" });
  await seed(coop.auth, "coop-victory");
  await capture(coop.owner, "phone", "reduced-motion", 390, 844);
  await coop.owner.emulateMedia({ reducedMotion: "no-preference" });

  await seed(coop.auth, "reconnect-victory");
  await tv.reload({ waitUntil: "networkidle" });
  await capture(tv, "host", "reconnect-restored-result", 1920, 1080);
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(coop.auth, "coop-defeat");
  await capture(tv, "host", "reduced-motion-result", 1366, 768);
  await tv.emulateMedia({ reducedMotion: "no-preference" });

  for (const [name, stage] of [["public-progress", "early-progress"], ["threshold-warning", "critical"], ["final-stage", "final-stage"], ["rivalry-result-public-only", "rivalry-result"]] as const) {
    await seed(coop.auth, stage);
    await capture(coop.guest, "waiting-phone", name, 390, 844);
    const text = await coop.guest.locator("body").innerText();
    if (/Joel(?:'s)? private Agenda|Bjornis(?:'s)? private Agenda|seat-1/i.test(text)) {
      throw new Error(`Waiting phone leaked another player's private result during ${name}`);
    }
  }

  for (const [name, stages, reduced] of [
    ["progress-gain", ["early-progress", "progress-gain"], false],
    ["pressure-gain", ["early-pressure", "pressure-gain"], false],
    ["final-stage-transition", ["near-win", "final-stage"], false],
    ["coop-victory-flow", ["final-stage", "coop-victory"], false],
    ["coop-defeat-flow", ["critical", "coop-defeat"], false],
    ["rivalry-reveal-flow", ["final-stage", "rivalry-result"], false],
    ["return-to-lobby-state", ["coop-victory"], false],
    ["reconnect-result", ["reconnect-victory"], false],
    ["reduced-motion-endgame", ["final-stage", "coop-victory"], true]
  ] as const) {
    await recordFlow(browser, coop.auth, name, [...stages], reduced);
  }

  await writeFile(join(output, "capture-results.json"), JSON.stringify({
    captures: records,
    consoleErrors,
    timings: {
      progressUpdateMs: 420,
      pressureUpdateMs: 420,
      finalStageAnnouncementMs: 1100,
      resultRevealMs: 1200,
      postGameActionAvailableWithResult: true
    },
    unsupported: [
      "Canonical rematch is not implemented, so no Rematch action or screenshot was fabricated.",
      "Canonical aggregate Rivalry ranking/tie calculation is not implemented; P14 shows the shared result and owner-private Agenda conclusion only.",
      "Canonical draw result is not implemented; missing result data is never converted into a draw."
    ]
  }, null, 2));
  if (consoleErrors.length) throw new Error(`Browser errors:\n${consoleErrors.join("\n")}`);

  await Promise.all([coop.owner.close(), coop.guest.close(), tv.close()]);
  await browser.close();
  console.log(JSON.stringify({ captures: records.length, recordings: 9, consoleErrors: consoleErrors.length, output }, null, 2));
}

await main();
