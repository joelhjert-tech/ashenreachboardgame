import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const web = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "live-play-ui-repair-qa");

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page) {
  const session = await post<{ roomCode: string; hostToken: string }>("/api/session/create", { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${web}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Joel");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("button", { name: "Select Contract" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as { roomCode: string; seatId: string; seatToken: string };
  return { ...auth, hostToken: session.hostToken };
}

async function seed(auth: { roomCode: string; seatToken: string }, fixture: unknown) {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function capture(page: Page, name: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth);
  if (overflow) throw new Error(`${name} has horizontal overflow at ${width}x${height}`);
  await page.screenshot({ path: join(output, `${name}-${width}x${height}.png`), fullPage: false });
}

async function main() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  for (const page of [phone, tv]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }
  const auth = await startPhone(phone);

  await seed(auth, { kind: "shop", stage: "valid-first" });
  await phone.getByRole("button", { name: /Browse Equipment/i }).click();
  for (const variant of ["requisition", "market"] as const) {
    await tv.goto(`${web}/tv?room=${auth.roomCode}&shopUi=${variant}`);
    await tv.getByTestId(`host-shop-prototype-${variant}`).waitFor();
    await capture(tv, `shop-${variant}`, 1920, 1080);
    await capture(tv, `shop-${variant}`, 1366, 768);
  }

  await tv.goto(`${web}/tv?room=${auth.roomCode}`);
  await seed(auth, { kind: "phone-battle", stage: "battle-setup" });
  await tv.getByTestId("tv-host-encounter-header").waitFor();
  await capture(tv, "encounter-header-battle", 1920, 1080);
  await capture(tv, "encounter-header-battle", 1366, 768);

  await seed(auth, { kind: "map-transition", stage: "guardian-cleared" });
  await tv.goto(`${web}/tv?room=${auth.roomCode}`);
  await tv.getByTestId("tv-command-main").waitFor();
  await capture(tv, "cross-ring-route", 1920, 1080);
  await capture(tv, "cross-ring-route", 1366, 768);

  await browser.close();
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  console.log(`Captured live-play repair QA in ${output}`);
}

void main();
