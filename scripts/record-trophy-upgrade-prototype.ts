import { spawnSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "trophy-upgrade-prototype");
const temporaryRecordingDir = join(tmpdir(), `ashenreach-trophy-upgrade-${process.pid}`);
const rawVideo = join(temporaryRecordingDir, "trophy-upgrade-tv-prototype-raw.webm");
const encodedVideo = join(temporaryRecordingDir, "trophy-upgrade-tv-prototype-1920x1080.mp4");
const finalVideo = join(output, "trophy-upgrade-tv-prototype-1920x1080.mp4");
const browserErrors: string[] = [];
const metrics: Array<Record<string, unknown>> = [];

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page, surface: string): void {
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`${surface}: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`${surface}: ${error.message}`));
}

async function joinAndStart(phone: Page, session: SessionResponse): Promise<Auth> {
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`, { waitUntil: "networkidle" });
  await phone.getByLabel("Player name").fill("Trophy QA");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Choose Piece" }).waitFor();
  await phone.getByRole("button", { name: "Continue to Operative" }).click();
  await phone.getByRole("heading", { name: "Choose Operative" }).waitFor();
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await phone.getByRole("button", { name: "Select Contract" }).first().click();
  for (let provision = 0; provision < 2; provision += 1) {
    const chooseProvision = phone.getByRole("button", { name: /Choose (Equipment|Follower)/ }).first();
    await chooseProvision.waitFor();
    await chooseProvision.click();
  }
  await phone.getByRole("button", { name: "Ready" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authorization was not stored");
  await phone.getByRole("button", { name: "Start Game" }).click();
  return auth;
}

async function seedFixture(auth: Auth): Promise<void> {
  await postJson("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "trophy-upgrade", stage: "three-card" }
  });
}

async function openProgression(phone: Page): Promise<void> {
  const inventory = phone.locator('button[aria-label^="Inventory"]');
  await inventory.waitFor({ state: "visible" });
  await inventory.click();
  const progression = phone.getByRole("button", { name: /Progression/i });
  if (await progression.isVisible()) await progression.click();
  await phone.getByTestId("phone-inventory-progression").waitFor();
  await phone.getByRole("button", { name: /Signal 5/ }).click();
  await phone.getByRole("button", { name: "Confirm Signal" }).waitFor();
}

async function inspectTv(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight: document.documentElement.clientHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    canvasCount: document.querySelectorAll("canvas").length,
    overlayCount: document.querySelectorAll('[data-testid="signal-trophy-upgrade"]').length,
    cardCount: document.querySelectorAll(".signal-trophy-upgrade__receipt").length,
    privateLeak: /seatToken|hostToken|private agenda|secret option/i.test(document.body.innerText)
  }));
  metrics.push({ label, ...result });
  if (result.scrollWidth > result.viewportWidth || result.scrollHeight > result.viewportHeight) {
    throw new Error(`${label} overflow: ${JSON.stringify(result)}`);
  }
  if (result.canvasCount !== 0 || result.overlayCount !== 1 || result.cardCount !== 3 || result.privateLeak) {
    throw new Error(`${label} failed TV safety checks: ${JSON.stringify(result)}`);
  }
}

async function waitForReceiptArt(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".signal-trophy-upgrade__receipt-art img"));
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  });
}

async function runCeremony(
  browser: Browser,
  viewport: { width: number; height: number },
  options: { record: boolean; reducedMotion: boolean }
): Promise<{ trimStartSeconds: number | null }> {
  const session = await postJson<SessionResponse>("/api/session/create", {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await phoneContext.newPage();
  watch(phone, "phone");
  const auth = await joinAndStart(phone, session);
  await seedFixture(auth);
  await openProgression(phone);

  const videoStartedAt = performance.now();
  const tvContext = await browser.newContext({
    viewport,
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
    ...(options.record ? { recordVideo: { dir: temporaryRecordingDir, size: viewport } } : {})
  });
  await tvContext.addInitScript(({ token }) => localStorage.setItem("ashen-reach-tv-host-token", token), { token: session.hostToken });
  const tv = await tvContext.newPage();
  watch(tv, `tv-${viewport.width}x${viewport.height}`);
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });
  await tv.getByTestId("signal-theatre-host").waitFor();
  const trimStartSeconds = options.record ? Math.max(0, (performance.now() - videoStartedAt) / 1000 - 0.2) : null;

  await phone.getByRole("button", { name: "Confirm Signal" }).click();
  const phoneHold = phone.getByTestId("tv-presentation-gate");
  await phoneHold.waitFor();
  const phoneHoldState = await phone.evaluate(() => ({
    holdCount: document.querySelectorAll('[data-testid="tv-presentation-gate"]').length,
    identityVisible: Boolean(document.querySelector('[data-testid="signal-phone-identity"]')),
    navigationVisible: Boolean(document.querySelector('nav[aria-label="More phone controls"]')),
    inventoryContentMounted: Boolean(document.querySelector('[data-testid="phone-inventory-progression"]')),
    contentInert: document.querySelector('main[aria-label="Phone content"]')?.hasAttribute("inert") ?? false
  }));
  metrics.push({ label: `phone-hold-${viewport.width}x${viewport.height}`, ...phoneHoldState });
  if (
    phoneHoldState.holdCount !== 1
    || !phoneHoldState.identityVisible
    || !phoneHoldState.navigationVisible
    || !phoneHoldState.inventoryContentMounted
    || !phoneHoldState.contentInert
  ) {
    throw new Error(`Phone did not enter the TV hold cleanly: ${JSON.stringify(phoneHoldState)}`);
  }
  const overlay = tv.getByTestId("signal-trophy-upgrade");
  await overlay.waitFor();

  if (options.reducedMotion) {
    await tv.locator('[data-testid="signal-trophy-upgrade"][data-stage="trophy-display"]').waitFor();
    await waitForReceiptArt(tv);
    await inspectTv(tv, `reduced-${viewport.width}x${viewport.height}`);
    await tv.screenshot({ path: join(output, `04-reduced-motion-${viewport.width}x${viewport.height}.png`) });
  } else {
    await tv.locator('[data-testid="signal-trophy-upgrade"][data-stage="summon"]').waitFor();
    await inspectTv(tv, `summon-${viewport.width}x${viewport.height}`);
    if (options.record) await tv.screenshot({ path: join(output, "01-tv-summon-1920x1080.png") });

    await tv.locator('[data-testid="signal-trophy-upgrade"][data-stage="trophy-display"]').waitFor();
    await waitForReceiptArt(tv);
    await inspectTv(tv, `display-${viewport.width}x${viewport.height}`);
    if (options.record) await tv.screenshot({ path: join(output, "02-trophy-display-1920x1080.png") });

    await tv.locator('[data-testid="signal-trophy-upgrade"][data-stage="trophy-burn"]').waitFor();
    await inspectTv(tv, `burn-${viewport.width}x${viewport.height}`);

    await tv.locator('[data-testid="signal-trophy-upgrade"][data-stage="flip"]').waitFor();
    await tv.waitForTimeout(360);
    await inspectTv(tv, `flip-${viewport.width}x${viewport.height}`);
    if (options.record) await tv.screenshot({ path: join(output, "03-flip-and-upgrade-1920x1080.png") });
  }

  await overlay.waitFor({ state: "detached", timeout: 12_000 });
  await phoneHold.waitFor({ state: "detached", timeout: 3_000 });
  const phoneReleaseState = await phone.evaluate(() => ({
    holdCount: document.querySelectorAll('[data-testid="tv-presentation-gate"]').length,
    inventoryContentVisible: Boolean(document.querySelector('[data-testid="phone-inventory-progression"]')),
    contentInert: document.querySelector('main[aria-label="Phone content"]')?.hasAttribute("inert") ?? false,
    selectedInventory: document.querySelector('button[aria-label^="Inventory"]')?.getAttribute("aria-selected")
  }));
  metrics.push({ label: `phone-released-${viewport.width}x${viewport.height}`, ...phoneReleaseState });
  if (
    phoneReleaseState.holdCount !== 0
    || !phoneReleaseState.inventoryContentVisible
    || phoneReleaseState.contentInert
    || phoneReleaseState.selectedInventory !== "true"
  ) {
    throw new Error(`Phone did not resume the previous screen: ${JSON.stringify(phoneReleaseState)}`);
  }
  await tv.waitForTimeout(420);
  const settledCanvasCount = await tv.locator("canvas").count();
  const replayBeforeReload = await tv.getByTestId("signal-trophy-upgrade").count();
  await tv.reload({ waitUntil: "networkidle" });
  await tv.getByTestId("signal-theatre-host").waitFor();
  const replayAfterReload = await tv.getByTestId("signal-trophy-upgrade").count();
  metrics.push({ label: `settled-${viewport.width}x${viewport.height}`, settledCanvasCount, replayBeforeReload, replayAfterReload });
  if (settledCanvasCount !== 0 || replayBeforeReload !== 0 || replayAfterReload !== 0) {
    throw new Error(`Reconnect replay or canvas detected at ${viewport.width}x${viewport.height}`);
  }

  const video = tv.video();
  await tv.close();
  if (options.record && video) await video.saveAs(rawVideo);
  await phone.close();
  await tvContext.close();
  await phoneContext.close();
  return { trimStartSeconds };
}

async function main(): Promise<void> {
  await mkdir(join(output, ".recording"), { recursive: true });
  await mkdir(temporaryRecordingDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const recorded = await runCeremony(browser, { width: 1920, height: 1080 }, { record: true, reducedMotion: false });
    await runCeremony(browser, { width: 1366, height: 768 }, { record: false, reducedMotion: false });
    await runCeremony(browser, { width: 1920, height: 1080 }, { record: false, reducedMotion: true });
    if (recorded.trimStartSeconds === null) throw new Error("Missing video trim start");

    const ffmpeg = spawnSync("ffmpeg", [
      "-y",
      "-ss", recorded.trimStartSeconds.toFixed(3),
      "-i", rawVideo,
      "-t", "8.8",
      "-an",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      encodedVideo
    ], { encoding: "utf8" });
    if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed: ${ffmpeg.stderr}`);
    await copyFile(encodedVideo, finalVideo);
  } finally {
    await browser.close();
  }

  await writeFile(join(output, "trophy-upgrade-qa.json"), `${JSON.stringify({ metrics, browserErrors }, null, 2)}\n`, "utf8");
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
  console.log(JSON.stringify({ output, video: finalVideo, stills: 4, metrics: metrics.length, browserErrors: 0 }, null, 2));
}

await main();
