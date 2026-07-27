import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "host-image-qa");
const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1600x700", width: 1600, height: 700 }
] as const;

let capturedStates = 0;
let capturedScreenshots = 0;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function assertContainment(page: Page, state: string): Promise<void> {
  const audit = await page.evaluate(() => {
    const tolerance = 1.5;
    const failures: Array<{ alt: string; frame: DOMRect; image: DOMRect }> = [];
    for (const frame of Array.from(document.querySelectorAll<HTMLElement>(".host-image-frame"))) {
      const image = frame.querySelector("img");
      if (!image) continue;
      const frameBox = frame.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      if (imageBox.left < frameBox.left - tolerance || imageBox.top < frameBox.top - tolerance || imageBox.right > frameBox.right + tolerance || imageBox.bottom > frameBox.bottom + tolerance) {
        failures.push({ alt: image.alt, frame: frameBox, image: imageBox });
      }
    }
    return {
      failures,
      bodyWidth: document.body.scrollWidth,
      rootWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  });
  if (audit.failures.length) throw new Error(`${state} image overflow: ${JSON.stringify(audit.failures)}`);
  if (Math.max(audit.bodyWidth, audit.rootWidth) > audit.viewportWidth) throw new Error(`${state} horizontal overflow: ${JSON.stringify(audit)}`);
}

async function captureAll(page: Page, state: string): Promise<void> {
  capturedStates += 1;
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(260);
    await assertContainment(page, `${state}-${viewport.name}`);
    await page.screenshot({ path: join(output, `${state}-${viewport.name}.png`), fullPage: false });
    capturedScreenshots += 1;
  }
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function main(): Promise<void> {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const tv = await browser.newPage({ viewport: viewports[0] });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [tv, phone]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  const lobbySession = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, { sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 2 });
  const lobby = await browser.newPage({ viewport: viewports[0] });
  lobby.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  lobby.on("pageerror", (error) => errors.push(error.message));
  await lobby.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: lobbySession.hostToken });
  await lobby.goto(`${clientOrigin}/tv?room=${lobbySession.roomCode}`);
  await lobby.getByText("Waiting for Host Phone", { exact: false }).first().waitFor();
  await captureAll(lobby, "lobby");
  await lobby.close();
  const admin = await browser.newPage({ viewport: viewports[0] });
  admin.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  admin.on("pageerror", (error) => errors.push(error.message));
  await admin.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, lobbySession);
  await admin.goto(`${clientOrigin}/tv?room=${lobbySession.roomCode}&admin=library`);
  await admin.getByRole("heading", { name: "Card Library" }).waitFor();
  await captureAll(admin, "admin-library");
  await admin.getByRole("button", { name: /Missing Artwork/i }).click();
  const missingCard = admin.locator("button[data-library-card]").first();
  if (await missingCard.count()) {
    await missingCard.click();
    await admin.getByText(/art unavailable/i).first().waitFor();
    await captureAll(admin, "admin-library-missing-art");
  }
  await admin.goto(`${clientOrigin}/tv?room=${lobbySession.roomCode}&admin=map`);
  await admin.getByRole("heading", { name: "Map Inspector" }).waitFor();
  await captureAll(admin, "admin-map-inspector");
  await admin.close();

  await tv.goto(`${clientOrigin}/tv?resetAuth=1`);
  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("ImageQA");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await captureAll(tv, "character-selection");
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await phone.getByRole("button", { name: "Select Mission" }).first().click();
  await phone.getByRole("button", { name: "Ready" }).click();
  await phone.getByRole("button", { name: "Start Game" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authentication was not stored");
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await tv.getByTestId("tv-command-main").waitFor();
  await captureAll(tv, "main-board");

  await seed(auth, { kind: "phone-battle", stage: "battle-setup" });
  await tv.getByTestId("tv-host-battle-chamber").waitFor();
  await captureAll(tv, "battle");
  await seed(auth, { kind: "phone-battle", stage: "encounter" });
  await captureAll(tv, "encounter-card");
  await seed(auth, { kind: "host-shop", stage: "categories" });
  await tv.getByTestId("host-shop-overlay").waitFor();
  await captureAll(tv, "shop-categories");
  await seed(auth, { kind: "host-shop", stage: "equipment" });
  await tv.getByTestId("host-shop-selected-card").waitFor();
  await captureAll(tv, "shop-carousel");

  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, states: capturedStates, screenshots: capturedScreenshots }, null, 2));
}

await main();
