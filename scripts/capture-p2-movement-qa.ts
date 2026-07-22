import { mkdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CaptureMetric { filename: string; width: number; height: number; overflow: number; browserErrors: number }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const root = resolve("docs", "qa", "p2-movement");
const screenshots = join(root, "screenshots");
const recordings = join(root, "recordings");
const metrics: CaptureMetric[] = [];
const errors: string[] = [];

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
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
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
  if (!auth) throw new Error(`No stored phone auth for ${name}`);
  return auth;
}

async function capture(page: Page, filename: string, transient = false): Promise<void> {
  if (!transient) {
    await page.waitForTimeout(120);
    await page.waitForFunction(() => Array.from(document.images)
      .filter((image) => image.offsetParent !== null)
      .every((image) => image.complete));
  }
  if (transient) {
    await page.evaluate(() => new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    }));
    await page.screenshot({ path: join(screenshots, filename), fullPage: false });
  }
  const result = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth
  }));
  if (result.overflow > 0) throw new Error(`${filename}: ${result.overflow}px horizontal overflow`);
  if (!transient) {
    await page.screenshot({ path: join(screenshots, filename), fullPage: false });
  }
  metrics.push({ filename, ...result, browserErrors: errors.length });
}

async function createSingle(browser: Browser): Promise<{ phone: Page; tv: Page; auth: Auth; roomCode: string }> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1
  });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(phone);
  const auth = await joinPhone(phone, session.roomCode, "Mara", /Bjornis/i);
  await phone.getByRole("button", { name: "Start Game" }).click();
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  watch(tv);
  await tv.goto(`${client}/tv?room=${session.roomCode}&qaArrivalHold=1`);
  await tv.waitForLoadState("networkidle");
  return { phone, tv, auth, roomCode: session.roomCode };
}

async function createCoop(browser: Browser): Promise<{ host: Page; guest: Page; auth: Auth; roomCode: string }> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 2
  });
  const host = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(host); watch(guest);
  const auth = await joinPhone(host, session.roomCode, "Mara", /Bjornis/i);
  await joinPhone(guest, session.roomCode, "Erik", /Deepdale/i);
  await host.getByRole("button", { name: "Start Game" }).click();
  return { host, guest, auth, roomCode: session.roomCode };
}

async function waitForDestinations(phone: Page): Promise<void> {
  await phone.getByTestId("movement-destination").first().waitFor();
  await phone.getByTestId("movement-primary-action").waitFor();
}

async function waitForMovementStage(page: Page, stage: "travel" | "arrival", timeout = 8_000): Promise<void> {
  try {
    await page.locator(`[data-testid="tv-movement-journey"][data-movement-stage="${stage}"]`).waitFor({ timeout });
  } catch (error) {
    const state = await page.evaluate(() => ({
      movementStage: document.querySelector<HTMLElement>('[data-testid="tv-movement-journey"]')?.dataset.movementStage ?? "detached",
      battleStage: document.querySelector<HTMLElement>('[data-testid="tv-host-battle-chamber"]')?.dataset.battleStage ?? null,
      arrivalStack: Boolean(document.querySelector('[data-testid="tv-board-arrival-stack"]'))
    }));
    throw new Error(`Timed out waiting for movement stage ${stage}: ${JSON.stringify(state)}`, { cause: error });
  }
}

async function waitForRoutePosition(page: Page, position: "intermediate" | "final", timeout = 8_000): Promise<void> {
  try {
    await page.waitForFunction((target) => {
      const current = document.querySelector<HTMLElement>('.tv-movement-journey__route li.is-current');
      if (!current) return false;
      const index = Number(current.dataset.routeStep ?? "-1");
      const total = document.querySelectorAll('.tv-movement-journey__route li').length;
      return target === "final" ? index === total - 1 : index > 0 && index < total - 1;
    }, position, { timeout });
  } catch (error) {
    const state = await page.evaluate(() => ({
      currentStep: document.querySelector<HTMLElement>('.tv-movement-journey__route li.is-current')?.dataset.routeStep ?? null,
      routeLength: document.querySelectorAll('.tv-movement-journey__route li').length,
      movementStage: document.querySelector<HTMLElement>('[data-testid="tv-movement-journey"]')?.dataset.movementStage ?? "detached"
    }));
    throw new Error(`Timed out waiting for ${position} route position: ${JSON.stringify(state)}`, { cause: error });
  }
}

async function selectFirst(phone: Page): Promise<void> {
  const existingConfirm = phone.getByTestId("movement-primary-action").filter({ hasText: /^Confirm / });
  if (await existingConfirm.isVisible().catch(() => false)) return;
  await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
  await phone.getByTestId("movement-primary-action").filter({ hasText: /^Confirm / }).waitFor();
}

async function recordRoute(browser: Browser, phone: Page, auth: Auth, roomCode: string, fixture: unknown, filename: string): Promise<void> {
  await seed(auth, fixture);
  await waitForDestinations(phone);
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: recordings, size: { width: 1920, height: 1080 } } });
  const tv = await context.newPage();
  watch(tv);
  await tv.goto(`${client}/tv?room=${roomCode}`);
  await tv.waitForLoadState("networkidle");
  await selectFirst(phone);
  await phone.getByTestId("movement-primary-action").click();
  await waitForMovementStage(tv, "travel");
  await waitForMovementStage(tv, "arrival", 12_000);
  await tv.getByTestId("tv-movement-journey").waitFor({ state: "detached", timeout: 12_000 });
  const video = tv.video();
  await context.close();
  const source = await video?.path();
  if (!source) throw new Error(`No video produced for ${filename}`);
  await rename(source, join(recordings, filename));
}

async function main(): Promise<void> {
  await mkdir(screenshots, { recursive: true });
  await mkdir(recordings, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const single = await createSingle(browser);

  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await single.phone.setViewportSize(size);
    await seed(single.auth, { kind: "phone-movement", stage: "four-routes" });
    await single.phone.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "available", label: "AVAILABLE" } })));
    await waitForDestinations(single.phone);
    await capture(single.phone, `phone-movement-result-${size.width}x${size.height}.png`);
    await capture(single.phone, `phone-many-legal-destinations-${size.width}x${size.height}.png`);
    await capture(single.phone, `phone-long-sector-names-${size.width}x${size.height}.png`);
    await selectFirst(single.phone);
    await capture(single.phone, `phone-destination-selected-${size.width}x${size.height}.png`);
    await single.phone.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "MOVING" } })));
    await capture(single.phone, `phone-destination-submitting-${size.width}x${size.height}.png`);
  }

  await single.phone.setViewportSize({ width: 390, height: 844 });
  await seed(single.auth, { kind: "map-transition", stage: "guardian-cleared" });
  await single.phone.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "available", label: "AVAILABLE" } })));
  await waitForDestinations(single.phone);
  await capture(single.phone, "phone-public-warning-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-public-warning-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });
  await single.phone.goto(`${client}/?room=${single.roomCode}&qaNetworkControls=1`);
  await waitForDestinations(single.phone);
  await capture(single.phone, "phone-reconnect-destination-selection-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-reconnect-destination-selection-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });

  await single.phone.emulateMedia({ reducedMotion: "reduce" });
  await capture(single.phone, "phone-reduced-motion-selection-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-reduced-motion-selection-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });
  await single.phone.emulateMedia({ reducedMotion: "no-preference" });

  await seed(single.auth, { kind: "phone-movement", stage: "long-routes" });
  await waitForDestinations(single.phone);
  await capture(single.phone, "phone-two-legal-destinations-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-two-legal-destinations-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });
  await single.tv.setViewportSize({ width: 1920, height: 1080 });
  await capture(single.tv, "tv-current-operative-1920x1080.png");
  await capture(single.tv, "tv-legal-destination-markers-1920x1080.png");
  await capture(single.tv, "tv-multiple-routes-1920x1080.png");
  await single.tv.setViewportSize({ width: 1366, height: 768 });
  await capture(single.tv, "tv-current-operative-1366x768.png");
  await capture(single.tv, "tv-legal-destination-markers-1366x768.png");
  await capture(single.tv, "tv-multiple-routes-1366x768.png");
  await selectFirst(single.phone);
  await capture(single.tv, "tv-selected-route-1366x768.png");
  await single.tv.setViewportSize({ width: 1920, height: 1080 });
  await capture(single.tv, "tv-selected-route-1920x1080.png");

  await single.phone.getByTestId("movement-primary-action").click();
  await waitForMovementStage(single.tv, "travel");
  await capture(single.phone, "phone-movement-in-progress-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-movement-in-progress-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });
  await capture(single.tv, "tv-first-movement-step-1920x1080.png");
  await waitForRoutePosition(single.tv, "intermediate");
  await capture(single.tv, "tv-intermediate-movement-step-1920x1080.png");
  const arrivalAt1920 = waitForMovementStage(single.tv, "arrival");
  await waitForRoutePosition(single.tv, "final");
  await capture(single.tv, "tv-final-movement-step-1920x1080.png");
  await arrivalAt1920;
  await capture(single.tv, "tv-arrival-emphasis-1920x1080.png", true);
  await single.tv.getByTestId("tv-movement-journey").waitFor({ state: "detached", timeout: 15_000 });
  await capture(single.tv, "tv-encounter-handoff-1920x1080.png");
  await single.phone.goto(`${client}/?room=${single.roomCode}&qaNetworkControls=1`);
  await capture(single.phone, "phone-reconnect-after-submission-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-reconnect-after-submission-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });

  await seed(single.auth, { kind: "phone-movement", stage: "long-routes" });
  await waitForDestinations(single.phone);
  await selectFirst(single.phone);
  await single.tv.setViewportSize({ width: 1366, height: 768 });
  await single.phone.getByTestId("movement-primary-action").click();
  await waitForMovementStage(single.tv, "travel");
  await capture(single.tv, "tv-first-movement-step-1366x768.png");
  await waitForRoutePosition(single.tv, "intermediate");
  await capture(single.tv, "tv-intermediate-movement-step-1366x768.png");
  const arrivalAt1366 = waitForMovementStage(single.tv, "arrival");
  await waitForRoutePosition(single.tv, "final");
  await capture(single.tv, "tv-final-movement-step-1366x768.png");
  await arrivalAt1366;
  await capture(single.tv, "tv-arrival-emphasis-1366x768.png", true);
  await single.tv.getByTestId("tv-movement-journey").waitFor({ state: "detached", timeout: 15_000 });
  await capture(single.tv, "tv-encounter-handoff-1366x768.png");

  await seed(single.auth, { kind: "phone-movement", stage: "long-routes" });
  await waitForDestinations(single.phone);
  await selectFirst(single.phone);
  await single.tv.setViewportSize({ width: 1600, height: 900 });
  await single.phone.getByTestId("movement-primary-action").click();
  await waitForMovementStage(single.tv, "travel");
  await capture(single.tv, "tv-first-movement-step-1600x900.png");
  await waitForRoutePosition(single.tv, "intermediate");
  await capture(single.tv, "tv-intermediate-movement-step-1600x900.png");
  const arrivalAt1600 = waitForMovementStage(single.tv, "arrival");
  await waitForRoutePosition(single.tv, "final");
  await capture(single.tv, "tv-final-movement-step-1600x900.png");
  await arrivalAt1600;
  await capture(single.tv, "tv-arrival-emphasis-1600x900.png", true);
  await single.tv.getByTestId("tv-movement-journey").waitFor({ state: "detached", timeout: 15_000 });
  await capture(single.tv, "tv-encounter-handoff-1600x900.png");

  await seed(single.auth, { kind: "map-transition", stage: "guardian-cleared" });
  await waitForDestinations(single.phone);
  await selectFirst(single.phone);
  await single.tv.setViewportSize({ width: 1920, height: 1080 });
  await capture(single.tv, "tv-special-connection-1920x1080.png");
  await single.tv.setViewportSize({ width: 1366, height: 768 });
  await capture(single.tv, "tv-special-connection-1366x768.png");

  await seed(single.auth, { kind: "phone-movement", stage: "four-routes" });
  await waitForDestinations(single.phone);
  await single.tv.reload();
  await single.tv.getByTestId("tv-movement-focus").waitFor();
  await single.tv.setViewportSize({ width: 1920, height: 1080 });
  await capture(single.tv, "tv-reconnect-restored-state-1920x1080.png");
  await single.tv.setViewportSize({ width: 1366, height: 768 });
  await capture(single.tv, "tv-reconnect-restored-state-1366x768.png");

  await single.tv.emulateMedia({ reducedMotion: "reduce" });
  await single.tv.setViewportSize({ width: 1920, height: 1080 });
  await selectFirst(single.phone);
  await single.phone.getByTestId("movement-primary-action").click();
  await waitForMovementStage(single.tv, "travel");
  await waitForMovementStage(single.tv, "arrival", 4_000);
  await capture(single.tv, "tv-reduced-motion-arrival-1920x1080.png");
  await single.tv.setViewportSize({ width: 1366, height: 768 });
  await capture(single.tv, "tv-reduced-motion-arrival-1366x768.png");
  await capture(single.phone, "phone-reduced-motion-arrival-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-reduced-motion-arrival-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });
  await single.tv.emulateMedia({ reducedMotion: "no-preference" });

  await seed(single.auth, { kind: "phone-movement", stage: "long-routes" });
  await waitForDestinations(single.phone);
  await single.phone.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-intent-rejected", { detail: { reason: "Movement revision is stale or unavailable" } })));
  await single.phone.getByRole("alert").waitFor();
  await capture(single.phone, "phone-stale-action-recovery-390x844.png");
  await single.phone.setViewportSize({ width: 360, height: 800 });
  await capture(single.phone, "phone-stale-action-recovery-360x800.png");
  await single.phone.setViewportSize({ width: 390, height: 844 });

  await recordRoute(browser, single.phone, single.auth, single.roomCode, { kind: "phone-movement", stage: "four-routes" }, "short-route-1920x1080.webm");
  await recordRoute(browser, single.phone, single.auth, single.roomCode, { kind: "phone-movement", stage: "medium-routes" }, "medium-route-1920x1080.webm");
  await recordRoute(browser, single.phone, single.auth, single.roomCode, { kind: "phone-movement", stage: "long-routes" }, "long-route-1920x1080.webm");
  await recordRoute(browser, single.phone, single.auth, single.roomCode, { kind: "map-transition", stage: "guardian-cleared" }, "special-connection-1920x1080.webm");

  const coop = await createCoop(browser);
  await seed(coop.auth, { kind: "phone-movement", stage: "four-routes" });
  await capture(coop.guest, "phone-waiting-selection-390x844.png");
  await coop.guest.setViewportSize({ width: 360, height: 800 });
  await capture(coop.guest, "phone-waiting-selection-360x800.png");
  await coop.guest.setViewportSize({ width: 390, height: 844 });
  await selectFirst(coop.host);
  await coop.host.getByTestId("movement-primary-action").click();
  await coop.guest.waitForTimeout(160);
  await capture(coop.guest, "phone-waiting-during-movement-390x844.png");
  await coop.guest.setViewportSize({ width: 360, height: 800 });
  await capture(coop.guest, "phone-waiting-during-movement-360x800.png");
  const coopTv = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  watch(coopTv);
  await coopTv.goto(`${client}/tv?room=${coop.roomCode}`);
  await coopTv.waitForLoadState("networkidle");
  await capture(coopTv, "tv-waiting-player-context-1366x768.png");
  await coopTv.setViewportSize({ width: 1920, height: 1080 });
  await capture(coopTv, "tv-waiting-player-context-1920x1080.png");

  await Promise.all([single.phone.close(), single.tv.close(), coop.host.close(), coop.guest.close(), coopTv.close()]);
  await browser.close();
  await writeFile(join(root, "capture-metrics.json"), JSON.stringify({ metrics, errors }, null, 2));
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ screenshots: metrics.length, recordings: 4, errors: 0, output: root }, null, 2));
}

await main();
