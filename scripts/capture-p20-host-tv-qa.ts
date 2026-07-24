import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "p20-host-tv-motion");
const videoOutput = join(output, "recordings");
const viewports = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 }
] as const;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function createSession(): Promise<SessionResponse> {
  return postJson(`${apiOrigin}/api/session/create`, {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
}

async function joinAndReady(phone: Page, session: SessionResponse): Promise<Auth> {
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("P20 Host QA");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await phone.getByRole("button", { name: "Select Mission" }).first().click();
  await phone.getByRole("button", { name: "Ready" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authorization was not stored");
  return auth;
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture
  });
}

async function assertHostSafe(page: Page, state: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight: document.documentElement.clientHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    canvasCount: document.querySelectorAll("canvas").length,
    text: document.body.innerText,
    cueCount: document.querySelectorAll("[data-testid=host-motion-cue]").length
  }));
  if (metrics.scrollWidth > metrics.viewportWidth) {
    throw new Error(`${state}: horizontal overflow ${JSON.stringify(metrics)}`);
  }
  if (metrics.scrollHeight > metrics.viewportHeight) {
    throw new Error(`${state}: vertical overflow ${JSON.stringify(metrics)}`);
  }
  if (metrics.canvasCount !== 0) throw new Error(`${state}: unexpected canvas`);
  if (metrics.cueCount > 1) throw new Error(`${state}: duplicate host motion cue`);
  if (/private agenda|choose one scar|secret option|seatToken|hostToken|sourceEventId/i.test(metrics.text)) {
    throw new Error(`${state}: private or internal information leaked`);
  }
}

async function capture(page: Page, state: string): Promise<void> {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(120);
    await assertHostSafe(page, `${state}-${viewport.name}`);
    await page.screenshot({ path: join(output, `${state}-${viewport.name}.png`), fullPage: false });
  }
  await page.setViewportSize(viewports[2]);
}

async function waitForMovementJourneyToFinish(page: Page): Promise<void> {
  const journey = page.getByTestId("tv-movement-journey");
  if (await journey.count()) {
    await journey.waitFor({ state: "detached", timeout: 15_000 });
  }
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  await mkdir(videoOutput, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: viewports[2],
    recordVideo: { dir: videoOutput, size: { width: 1920, height: 1080 } }
  });
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  const tv = await context.newPage();
  const consoleErrors: string[] = [];
  tv.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  tv.on("pageerror", (error) => consoleErrors.push(error.message));

  const timeline: Array<{ state: string; atMs: number }> = [];
  const startedAt = Date.now();
  const mark = async (state: string, settleMs = 220) => {
    timeline.push({ state, atMs: Date.now() - startedAt });
    await tv.waitForTimeout(settleMs);
    await capture(tv, state);
  };

  try {
    const session = await createSession();
    await tv.addInitScript(({ token }) => localStorage.setItem("ashen-reach-tv-host-token", token), { token: session.hostToken });
    const auth = await joinAndReady(phone, session);
    await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}&qaMovementHold=1&qaArrivalHold=1`);
    await tv.getByText("Ready to begin", { exact: true }).waitFor();
    await mark("01-lobby-ready");

    await phone.getByRole("button", { name: "Start Game" }).click();
    await tv.getByTestId("tv-command-main").waitFor();
    await mark("02-game-start-summary", 80);
    await mark("03-board-reveal", 720);

    await seed(auth, { kind: "waiting-handoff", stage: "next-turn" });
    await mark("04-turn-start");

    await seed(auth, { kind: "movement-journey", stage: "ashen-chapel" });
    await tv.getByTestId("tv-movement-focus").waitFor();
    await mark("05-movement-result");
    await mark("06-destinations");

    await seed(auth, { kind: "tile-arrival", stage: "multi-effect" });
    const movementJourney = tv.getByTestId("tv-movement-journey");
    await movementJourney.waitFor();
    await mark("07-route", 50);
    await movementJourney.locator(".tv-movement-journey__status").getByText(/Step 2 \//).waitFor({ timeout: 5_000 });
    await mark("08-intermediate-movement", 50);
    await tv.locator('[data-testid="tv-movement-journey"][data-movement-stage="arrival"]').waitFor({ timeout: 8_000 });
    await mark("09-arrival", 50);
    await waitForMovementJourneyToFinish(tv);

    const stableStates: Array<{ name: string; fixture: unknown }> = [
      { name: "10-encounter", fixture: { kind: "phone-battle", stage: "encounter" } },
      { name: "11-penalty", fixture: { kind: "phone-battle", stage: "defeat" } },
      { name: "12-reward", fixture: { kind: "phone-battle", stage: "success" } },
      { name: "13-combat-entry", fixture: { kind: "phone-battle", stage: "battle-setup" } },
      { name: "14-dice", fixture: { kind: "phone-battle", stage: "pending-enemy-roll" } },
      { name: "15-modifiers", fixture: { kind: "phone-battle", stage: "rolled-result" } },
      { name: "16-combat-result", fixture: { kind: "phone-battle", stage: "success" } },
      { name: "17-waiting", fixture: { kind: "waiting-handoff", stage: "private-choice" } },
      { name: "18-automated-public", fixture: { kind: "tile-arrival", stage: "multi-effect" } },
      { name: "19-end-turn-result", fixture: { kind: "waiting-handoff", stage: "end-turn" } },
      { name: "20-handoff", fixture: { kind: "waiting-handoff", stage: "handoff" } },
      { name: "21-progress", fixture: { kind: "progression-endgame", stage: "progress-gain" } },
      { name: "22-pressure", fixture: { kind: "progression-endgame", stage: "pressure-gain" } },
      { name: "23-final-stage", fixture: { kind: "progression-endgame", stage: "final-stage" } }
    ];

    for (const entry of stableStates) {
      await seed(auth, entry.fixture);
      await waitForMovementJourneyToFinish(tv);
      if (entry.name === "20-handoff") {
        await tv.locator('[data-testid="host-motion-cue"][data-motion-id^="handoff:"]').waitFor();
      }
      await mark(entry.name);
    }

    await seed(auth, { kind: "phone-battle", stage: "success" });
    await tv.waitForTimeout(220);
    await assertHostSafe(tv, "26-reconnect-before");
    const stableMotionId = await tv.getByTestId("host-motion-cue").getAttribute("data-motion-id");
    await tv.reload();
    await tv.getByTestId("host-motion-cue").waitFor();
    const restoredMotionId = await tv.getByTestId("host-motion-cue").getAttribute("data-motion-id");
    const restoredClass = await tv.getByTestId("host-motion-cue").getAttribute("class");
    if (stableMotionId !== restoredMotionId || !restoredClass?.includes("host-motion-cue--settled")) {
      throw new Error(`Reconnect replayed or changed the cue: ${stableMotionId} -> ${restoredMotionId} (${restoredClass})`);
    }
    await mark("26-reconnect");

    await tv.emulateMedia({ reducedMotion: "reduce" });
    await seed(auth, { kind: "phone-battle", stage: "defeat" });
    await mark("27-reduced-motion");
    const animationName = await tv.getByTestId("host-motion-cue").evaluate((element) => getComputedStyle(element).animationName);
    if (animationName !== "none") throw new Error(`Reduced-motion cue still animates: ${animationName}`);
    await tv.emulateMedia({ reducedMotion: "no-preference" });

    await seed(auth, { kind: "progression-endgame", stage: "coop-victory" });
    await mark("24-victory");
    await seed(auth, { kind: "progression-endgame", stage: "coop-defeat" });
    await mark("25-defeat");

    await tv.goto(`${clientOrigin}/tv?qaPresentation=p8&surface=tv`);
    await tv.getByTestId("shared-presentation-qa").waitFor();
    await tv.getByLabel("Missing enemy artwork").waitFor();
    await mark("29-long-text");
    await mark("30-missing-art");

    if (consoleErrors.length > 0) throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
  } finally {
    const rawVideoPath = await tv.video()?.path();
    await context.close();
    if (rawVideoPath) {
      await rename(rawVideoPath, join(videoOutput, "p20-complete-host-sequence.webm"));
    }
    await browser.close();
  }

  await writeFile(join(output, "p20-video-timeline.json"), `${JSON.stringify(timeline, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output,
    screenshots: timeline.length * viewports.length,
    states: timeline.length,
    recording: basename(join(videoOutput, "p20-complete-host-sequence.webm")),
    consoleErrors: 0
  }, null, 2));
}

await main();
