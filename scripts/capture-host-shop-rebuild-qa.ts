import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; hostToken: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "host-shop-qa");

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function joinAndStart(phone: Page, session: SessionResponse): Promise<Auth> {
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("Shopkeeper");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await phone.getByRole("button", { name: "Select Contract" }).first().click();
  await phone.getByRole("button", { name: "Ready" }).click();
  await phone.getByRole("button", { name: "Start Game" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Omit<Auth, "hostToken"> | null;
  if (!auth) throw new Error("Phone authentication was not stored");
  return { ...auth, hostToken: session.hostToken };
}

async function seed(auth: Auth, stage: string): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "host-shop", stage }
  });
}

async function capture(tv: Page, name: string, width: number, height: number): Promise<void> {
  await tv.setViewportSize({ width, height });
  await tv.getByTestId("host-shop-overlay").waitFor();
  await tv.waitForTimeout(650);
  const metrics = await tv.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    rootWidth: document.documentElement.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight
  }));
  if (Math.max(metrics.bodyWidth, metrics.rootWidth) > metrics.viewportWidth) {
    throw new Error(`${name} has horizontal overflow: ${JSON.stringify(metrics)}`);
  }
  const overlay = await tv.getByTestId("host-shop-overlay").boundingBox();
  if (!overlay || overlay.x > 1 || overlay.y > 1 || overlay.width < width - 2 || overlay.height < height - 2) {
    throw new Error(`${name} is not full screen: ${JSON.stringify({ overlay, metrics })}`);
  }
  await tv.screenshot({ path: join(output, `${name}-${width}x${height}.png`), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const page of [phone, tv]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  const auth = await joinAndStart(phone, session);
  await tv.goto(`${clientOrigin}/tv?room=${auth.roomCode}`);

  const states = [
    ["categories", "category-entrance", 1920, 1080],
    ["items", "items-carousel", 1920, 1080],
    ["equipment", "equipment-carousel", 1920, 1080],
    ["artifacts", "artifact-private-vault", 1920, 1080],
    ["locked", "locked-artifact-category", 1440, 900],
    ["insufficient", "insufficient-salvage", 1440, 900],
    ["long-lore", "long-lore", 1280, 720],
    ["single-category", "single-category", 1280, 720]
  ] as const;
  for (const [stage, name, width, height] of states) {
    await seed(auth, stage);
    await capture(tv, name, width, height);
  }

  await seed(auth, "equipment");
  await phone.getByRole("button", { name: "Buy" }).first().click();
  await phone.getByRole("button", { name: "Confirm Purchase" }).click();
  await tv.getByTestId("host-shop-transaction-focus").waitFor();
  await capture(tv, "successful-purchase", 1920, 1080);

  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(auth, "equipment");
  await capture(tv, "equipment-reduced-motion", 1280, 720);
  const animationName = await tv.getByTestId("host-shop-overlay").evaluate((element) => getComputedStyle(element).animationName);
  if (animationName !== "none") throw new Error(`Reduced motion still animates the shop: ${animationName}`);

  const tvText = await tv.locator("body").innerText();
  if (/Choose one Artifact|Confirm Artifact|Private inventory|Rivalry target/i.test(tvText)) {
    throw new Error("Private shop data leaked to the TV");
  }
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, screenshots: states.length + 2 }, null, 2));
}

await main();
