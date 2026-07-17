import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse {
  roomCode: string;
  hostToken: string;
}

interface StoredControllerAuth {
  roomCode: string;
  seatId: string;
  seatToken: string;
  displayName: string;
}

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function parseViewport(value: string): { width: number; height: number } {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`Invalid viewport ${value}; expected WIDTHxHEIGHT`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function createStartedPhone(page: Page, apiOrigin: string, clientOrigin: string): Promise<StoredControllerAuth> {
  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });

  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Player name").fill("Equipment QA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.getByText("Bjornis").first().waitFor();

  const auth = await page.evaluate(() => {
    const raw = window.localStorage.getItem("ashenreach.controllerSession");
    return raw ? JSON.parse(raw) : null;
  }) as StoredControllerAuth | null;
  if (!auth) throw new Error("Phone auth was not stored");
  return auth;
}

async function showTab(page: Page, name: "Player Card" | "Inventory"): Promise<void> {
  const showTabs = page.getByRole("button", { name: "Show Tabs" });
  if (await showTabs.isVisible().catch(() => false)) await showTabs.click();
  await page.getByRole("tab", { name, exact: true }).click();
  await page.getByRole("main", { name: "Phone content" }).waitFor({ state: "visible" });
}

async function assertNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<void> {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth
  }));
  if (Math.max(metrics.body, metrics.root) > viewportWidth) {
    throw new Error(`Horizontal overflow: ${JSON.stringify(metrics)} > ${viewportWidth}px`);
  }
}

async function assertChargeMeterFits(page: Page, viewportWidth: number): Promise<void> {
  const meter = page.getByRole("meter", { name: /charges remaining/i });
  await meter.waitFor({ state: "visible" });
  await meter.scrollIntoViewIfNeeded();
  const bounds = await meter.boundingBox();
  if (!bounds) throw new Error("Charge meter has no layout box");
  if (bounds.x < 0 || bounds.x + bounds.width > viewportWidth + 1) {
    throw new Error(`Charge meter clips the viewport: ${JSON.stringify(bounds)}`);
  }
}

async function main(): Promise<void> {
  const viewportValue = argument("--viewport", "390x844");
  const viewport = parseViewport(viewportValue);
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const outputRoot = resolve(argument("--output", join("reports", "ui", "equipment-phone")));
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const auth = await createStartedPhone(page, apiOrigin, clientOrigin);
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "movement-journey", stage: "ashen-chapel", withChoirLantern: true }
  });

  await showTab(page, "Player Card");
  await page.getByText("Equipped Gear", { exact: true }).waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(page, viewport.width);
  await page.screenshot({
    path: join(outputRoot, `${viewportValue}-player-card.png`),
    fullPage: false
  });
  await page.locator(".phone-player-equipped-grid").evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await assertNoHorizontalOverflow(page, viewport.width);
  await page.screenshot({
    path: join(outputRoot, `${viewportValue}-player-equipped.png`),
    fullPage: false
  });

  await showTab(page, "Inventory");
  await page.getByText("Choir Lantern", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Choir Lantern", { exact: true }).scrollIntoViewIfNeeded();
  await assertChargeMeterFits(page, viewport.width);
  await assertNoHorizontalOverflow(page, viewport.width);
  await page.screenshot({
    path: join(outputRoot, `${viewportValue}-inventory-charges.png`),
    fullPage: false
  });

  if (consoleErrors.length > 0) throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ outputRoot, viewport }, null, 2));
}

await main();
