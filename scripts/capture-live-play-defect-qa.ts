import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface JoinResponse { roomCode: string; seatId: string; seatToken: string }
interface StoredAuth extends JoinResponse { displayName: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "live-play-defects", "after");
let expectedJoinRejection = false;

async function postJson<T>(path: string, body: unknown, expectOk = true): Promise<{ status: number; payload: T }> {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json() as T;
  if (expectOk && !response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  if (Math.max(widths.body, widths.root) > widths.viewport) {
    throw new Error(`${label} overflow: ${JSON.stringify(widths)}`);
  }
}

async function captureSixPlayerLobby(tv: Page, rejectedPhone: Page): Promise<void> {
  const session = (await postJson<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 6
  })).payload;
  const names = ["Ash", "Mira", "Tor", "Vela", "Rook", "Nyx"];
  for (const displayName of names) {
    await postJson<JoinResponse>("/api/session/join", { roomCode: session.roomCode, displayName });
  }

  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), {
    hostToken: session.hostToken
  });
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await tv.getByText("Nyx", { exact: true }).waitFor();
  await assertNoOverflow(tv, "six-player lobby");
  await tv.screenshot({ path: join(output, "co-op-six-player-lobby-1920x1080.png"), fullPage: false });
  await tv.setViewportSize({ width: 1366, height: 768 });
  await assertNoOverflow(tv, "six-player lobby 1366");
  await tv.screenshot({ path: join(output, "co-op-six-player-lobby-1366x768.png"), fullPage: false });

  await rejectedPhone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await rejectedPhone.getByLabel("Player name").fill("Seventh");
  expectedJoinRejection = true;
  await rejectedPhone.getByRole("button", { name: "Join Game" }).click();
  await rejectedPhone.getByText("No open seats remain").waitFor();
  expectedJoinRejection = false;
  await rejectedPhone.screenshot({ path: join(output, "co-op-seventh-player-rejected-390x844.png"), fullPage: false });
}

async function createStartedPhone(phone: Page): Promise<StoredAuth> {
  const session = (await postJson<SessionResponse>("/api/session/create", {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  })).payload;
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("Guidance");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await phone.getByRole("button", { name: "Select Mission" }).first().click();
  await phone.getByRole("button", { name: "Ready" }).click();
  await phone.getByRole("button", { name: "Start Game" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as StoredAuth | null;
  if (!auth) throw new Error("Phone auth was not stored");
  return auth;
}

async function seed(auth: StoredAuth, fixture: unknown): Promise<void> {
  await postJson("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture
  });
}

async function captureGuidance(phone: Page, auth: StoredAuth): Promise<void> {
  const states = [
    { name: "phone-guidance-move", fixture: { kind: "movement-journey", stage: "ashen-chapel" }, tab: "move" },
    { name: "phone-guidance-shop", fixture: { kind: "shop", stage: "valid-first" }, tab: "shop" }
  ] as const;

  for (const state of states) {
    await seed(auth, state.fixture);
    const guidance = phone.getByTestId("phone-action-guidance");
    await guidance.waitFor();
    await phone.waitForFunction((tab) =>
      document.querySelector("[data-testid='phone-action-guidance']")?.getAttribute("data-required-tab") === tab,
      state.tab
    );
    await assertNoOverflow(phone, state.name);
    await phone.screenshot({ path: join(output, `${state.name}-390x844.png`), fullPage: false });
  }

  await seed(auth, { kind: "phone-battle", stage: "battle-setup" });
  await phone.getByTestId("phone-battle-shell").waitFor();
  await phone.getByRole("button", { name: "Roll Grit" }).waitFor();
  await assertNoOverflow(phone, "phone battle guidance");
  await phone.screenshot({ path: join(output, "phone-guidance-battle-390x844.png"), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const rejectedPhone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [tv, phone, rejectedPhone]) {
    page.on("console", (message) => {
      if (message.type() === "error" && !(expectedJoinRejection && /status of 400/i.test(message.text()))) {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  await captureSixPlayerLobby(tv, rejectedPhone);
  const auth = await createStartedPhone(phone);
  await phone.screenshot({ path: join(output, "clean-game-start-no-encounter-390x844.png"), fullPage: false });
  await captureGuidance(phone, auth);

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, screenshots: 7, browserErrors: errors.length }, null, 2));
}

await main();
