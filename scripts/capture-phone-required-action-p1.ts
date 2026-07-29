import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CaptureResult { filename: string; width: number; height: number; horizontalOverflow: number; shellStatus: string | null; buttons: string[] }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "phone-required-action-p1");
const results: CaptureResult[] = [];
const browserErrors: string[] = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
}

async function joinPhone(page: Page, roomCode: string, displayName: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1&qaNetworkControls=1`);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Missing stored controller session for ${displayName}`);
  return auth;
}

async function startSingle(browser: Browser): Promise<{ page: Page; auth: Auth }> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(page);
  const auth = await joinPhone(page, session.roomCode, "P1Host", /Bjornis/i);
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  return { page, auth };
}

async function startCoop(browser: Browser): Promise<{ host: Page; guest: Page; hostAuth: Auth; roomCode: string }> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 2 });
  const host = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(host); watch(guest);
  const hostAuth = await joinPhone(host, session.roomCode, "P1Host", /Bjornis/i);
  await joinPhone(guest, session.roomCode, "P1Guest", /Deepdale/i);
  await host.getByRole("button", { name: "Start Game" }).click();
  await host.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  await guest.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  return { host, guest, hostAuth, roomCode: session.roomCode };
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function capture(page: Page, state: string, width: number, height: number, surface = "phone"): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    document.scrollingElement?.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>("main, [class*='scroll'], [class*='content']").forEach((element) => { element.scrollTop = 0; });
  });
  const filename = `${surface}-${state}-${width}x${height}.png`;
  const metrics = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-testid='phone-required-action-shell']");
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);
    return {
      body: document.body.scrollWidth,
      root: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      shellStatus: shell?.dataset.actionStatus ?? null,
      buttons
    };
  });
  const horizontalOverflow = Math.max(metrics.body, metrics.root) - metrics.viewport;
  if (horizontalOverflow > 0) throw new Error(`${filename} horizontal overflow: ${horizontalOverflow}px`);
  await page.screenshot({ path: join(output, filename), fullPage: false });
  results.push({ filename, width, height, horizontalOverflow, shellStatus: metrics.shellStatus, buttons: metrics.buttons });
}

async function captureBoth(page: Page, state: string): Promise<void> {
  await capture(page, state, 390, 844);
  await capture(page, state, 360, 800);
}

async function seededCapture(page: Page, auth: Auth, state: string, fixture: unknown): Promise<void> {
  await seed(auth, fixture);
  await page.getByTestId("phone-required-action-shell").waitFor({ timeout: 8_000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "available", label: "AVAILABLE" } })));
  await captureBoth(page, state);
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const single = await startSingle(browser);

  await seededCapture(single.page, single.auth, "dice-ready", { kind: "phone-movement", stage: "roll-required" });
  await seed(single.auth, { kind: "phone-movement", stage: "roll-required" });
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "ROLLING" } })));
  await captureBoth(single.page, "dice-submitting");
  await seed(single.auth, { kind: "phone-movement", stage: "confirmed" });
  await single.page.waitForTimeout(120);
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "resolving", label: "RESOLVING" } })));
  await captureBoth(single.page, "dice-resolving");
  await seededCapture(single.page, single.auth, "movement-selection", { kind: "phone-movement", stage: "four-routes" });
  await seed(single.auth, { kind: "phone-movement", stage: "four-routes" });
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "available", label: "AVAILABLE" } })));
  await single.page.getByTestId("movement-destination").first().getByRole("button").click();
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "submitting", label: "MOVING" } })));
  await captureBoth(single.page, "movement-submitting");
  await seededCapture(single.page, single.auth, "battle-decision", { kind: "phone-battle", stage: "battle-setup" });
  await seededCapture(single.page, single.auth, "battle-result", { kind: "phone-battle", stage: "success" });
  await seededCapture(single.page, single.auth, "event-long-rules", { kind: "phone-action", stage: "event-ready" });
  await seededCapture(single.page, single.auth, "end-turn", { kind: "phone-action", stage: "free-action" });
  await seed(single.auth, { kind: "host-shop", stage: "equipment" });
  await single.page.getByTestId("phone-required-action-shell").waitFor({ timeout: 8_000 });
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-required-action-state", { detail: { status: "available", label: "AVAILABLE" } })));
  await single.page.getByRole("button", { name: /^Buy$/ }).first().click();
  await single.page.getByRole("dialog", { name: /confirm purchase/i }).waitFor();
  await captureBoth(single.page, "shop-purchase");
  await seededCapture(single.page, single.auth, "reward-selection", { kind: "discovery-equipment", stage: "equip-choice" });

  await seed(single.auth, { kind: "phone-movement", stage: "roll-required" });
  await single.page.waitForTimeout(150);
  await single.page.evaluate(() => window.dispatchEvent(new Event("ashenreach:qa-disconnect")));
  await single.page.waitForTimeout(120);
  await captureBoth(single.page, "reconnecting");
  await single.page.waitForTimeout(1_400);

  await seed(single.auth, { kind: "phone-movement", stage: "roll-required" });
  await single.page.waitForTimeout(120);
  await single.page.evaluate(() => document.querySelector<HTMLButtonElement>("[data-testid='movement-primary-action']")?.click());
  await single.page.waitForTimeout(250);
  await single.page.evaluate(() => window.dispatchEvent(new CustomEvent("ashenreach:qa-intent-rejected", { detail: { reason: "Movement revision is stale or unavailable" } })));
  await single.page.getByRole("alert").waitFor({ timeout: 5_000 });
  await captureBoth(single.page, "stale-action-recovery");
  await seededCapture(single.page, single.auth, "scar-choice", { kind: "scar-system", stage: "choice" });

  const coop = await startCoop(browser);
  await seed(coop.hostAuth, { kind: "phone-movement", stage: "roll-required" });
  await captureBoth(coop.guest, "waiting-dice");
  await seed(coop.hostAuth, { kind: "phone-movement", stage: "four-routes" });
  await captureBoth(coop.guest, "waiting-movement");
  await seed(coop.hostAuth, { kind: "phone-battle", stage: "battle-setup" });
  await captureBoth(coop.guest, "waiting-battle");

  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  watch(tv);
  await tv.goto(`${client}/tv?room=${coop.roomCode}`);
  await tv.waitForLoadState("networkidle");
  await capture(tv, "waiting-player-action", 1920, 1080, "tv");
  await seed(coop.hostAuth, { kind: "phone-battle", stage: "pending-enemy-roll" });
  await capture(tv, "resolving", 1920, 1080, "tv");
  await seed(coop.hostAuth, { kind: "phone-battle", stage: "success" });
  await capture(tv, "public-result", 1920, 1080, "tv");

  await Promise.all([single.page.close(), coop.host.close(), coop.guest.close(), tv.close()]);
  await browser.close();
  await writeFile(join(output, "capture-results.json"), JSON.stringify({ captures: results, browserErrors }, null, 2));
  if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
  console.log(JSON.stringify({ output, captures: results.length, browserErrors: browserErrors.length }, null, 2));
}

await main();
