import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "map-tile-function");

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page): Promise<Auth> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("TileQA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Controller authentication was not stored");
  return auth;
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function assertViewport(page: Page, filename: string): Promise<void> {
  await page.waitForTimeout(180);
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  if (Math.max(metrics.body, metrics.root) > metrics.viewport) throw new Error(`${filename} horizontal overflow: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: join(output, filename), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(`phone: ${message.text()}`); });
  phone.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  const auth = await startPhone(phone);

  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await phone.setViewportSize(viewport);
    await seed(auth, { kind: "tile-arrival", stage: "challenge" });
    await phone.getByRole("region", { name: /Ashen Chapel arrival resolution/i }).waitFor();
    await assertViewport(phone, `phone-tile-arrival-${viewport.width}x${viewport.height}.png`);
  }

  await phone.setViewportSize({ width: 390, height: 844 });
  const phoneStates: Array<[string, unknown, RegExp]> = [
    ["phone-fixed-hazard-390x844.png", { kind: "card-category", stage: "hazard-before" }, /Encounter command screen|battle command screen/i],
    ["phone-challenge-success-390x844.png", { kind: "card-category", stage: "hazard" }, /Encounter command screen|battle command screen/i],
    ["phone-challenge-failure-390x844.png", { kind: "card-category", stage: "hazard-failure" }, /Encounter command screen|battle command screen/i],
    ["phone-optional-shop-390x844.png", { kind: "tile-arrival", stage: "optional-shop" }, /Anchor Market arrival resolution/i],
    ["phone-salvage-payment-390x844.png", { kind: "salvage-resolution", stage: "payment" }, /command screen/i],
    ["phone-scar-follow-up-390x844.png", { kind: "scar-system", stage: "choice" }, /Choose Your Scar/i]
  ];
  for (const [filename, fixture, locator] of phoneStates) {
    await seed(auth, fixture);
    await phone.getByText(locator).first().waitFor({ timeout: 5_000 }).catch(() => phone.getByRole("main", { name: "Phone content" }).waitFor());
    await assertViewport(phone, filename);
  }
  await seed(auth, { kind: "tile-arrival", stage: "challenge" });
  await phone.goto(`${client}/?room=${auth.roomCode}`);
  await phone.getByRole("main", { name: "Phone content" }).waitFor();
  await phone.waitForTimeout(750);
  await assertViewport(phone, "phone-reconnect-tile-resolution-390x844.png");
  await seed(auth, { kind: "tile-arrival", stage: "single-next-turn" });
  await assertViewport(phone, "phone-single-player-next-turn-390x844.png");

  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(`tv: ${message.text()}`); });
  tv.on("pageerror", (error) => errors.push(`tv: ${error.message}`));
  await tv.goto(`${client}/tv?room=${auth.roomCode}`);
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    await tv.setViewportSize(viewport);
    await seed(auth, { kind: "tile-arrival", stage: "multi-effect" });
    await tv.getByText("Customs Gate", { exact: true }).first().waitFor();
    await assertViewport(tv, `tv-multi-effect-stack-${viewport.width}x${viewport.height}.png`);
  }

  const admin = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  admin.on("console", (message) => { if (message.type() === "error") errors.push(`admin: ${message.text()}`); });
  admin.on("pageerror", (error) => errors.push(`admin: ${error.message}`));
  await admin.goto(`${client}/tv?admin=map`);
  await admin.getByRole("region", { name: "Admin map inspector" }).waitFor();
  await admin.getByLabel("Search map archive").fill("ashen chapel");
  await admin.getByRole("listbox", { name: "Map search results" }).getByRole("button", { name: /ashen-chapel/i }).click();
  await assertViewport(admin, "admin-map-tile-functions-1920x1080.png");
  await admin.getByRole("button", { name: "Simulate arrival" }).click();
  await admin.getByText("SIMULATION ONLY").waitFor();
  await assertViewport(admin, "admin-detached-arrival-simulation-1920x1080.png");

  await browser.close();
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, captures: 17 }, null, 2));
}

await main();
