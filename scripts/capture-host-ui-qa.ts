import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; hostToken: string }

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 }
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

async function createSession(apiOrigin: string): Promise<SessionResponse> {
  return postJson(`${apiOrigin}/api/session/create`, {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
}

async function joinAndStart(page: Page, session: SessionResponse, clientOrigin: string): Promise<Auth> {
  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Host UI QA");
  await page.getByRole("button", { name: "Join as Host Phone" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Omit<Auth, "hostToken"> | null;
  if (!auth) throw new Error("Phone auth was not stored");
  return { ...auth, hostToken: session.hostToken };
}

async function seed(apiOrigin: string, auth: Auth, fixture: unknown): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture
  });
}

async function captureTv(page: Page, output: string, state: string): Promise<void> {
  await page.waitForTimeout(220);
  await page.getByTestId("tv-command-main").waitFor();
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
    canvases: document.querySelectorAll("canvas").length
  }));
  if (Math.max(metrics.body, metrics.root) > metrics.viewport) {
    throw new Error(`${state} horizontal overflow: ${JSON.stringify(metrics)}`);
  }
  if (metrics.canvases !== 0) throw new Error(`${state} unexpectedly rendered ${metrics.canvases} canvas elements`);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.screenshot({ path: join(output, `${state}-${viewport.name}.png`), fullPage: false });
  }
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const archive = process.env.HOST_UI_QA_ARCHIVE ?? "before";
  const output = resolve("reports", "host-ui-qa", archive);
  await mkdir(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const tv = await browser.newPage({ viewport: viewports[0] });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [tv, phone]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  await tv.goto(`${clientOrigin}/tv`);
  await tv.getByText(/Waiting for Host Phone/i).first().waitFor();
  await tv.screenshot({ path: join(output, "startup-no-room-1920x1080.png"), fullPage: false });
  await tv.setViewportSize({ width: 1366, height: 768 });
  await tv.screenshot({ path: join(output, "startup-no-room-1366x768.png"), fullPage: false });

  const session = await createSession(apiOrigin);
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await tv.getByText(session.roomCode, { exact: true }).first().waitFor();
  await tv.screenshot({ path: join(output, "lobby-room-created-1366x768.png"), fullPage: false });

  const auth = await joinAndStart(phone, session, clientOrigin);
  await tv.goto(`${clientOrigin}/tv?room=${auth.roomCode}`);
  await captureTv(tv, output, "board-idle-outer");

  const fixtures: Array<{ state: string; fixture: unknown; waitFor?: string }> = [
    { state: "movement-roll-ready", fixture: { kind: "movement-journey", stage: "ashen-chapel" } },
    { state: "transition-guardian-locked", fixture: { kind: "map-transition", stage: "guardian-locked" } },
    { state: "transition-guardian-cleared", fixture: { kind: "map-transition", stage: "guardian-cleared" } },
    { state: "transition-core-locked", fixture: { kind: "map-transition", stage: "core-locked" } },
    { state: "transition-core-cleared", fixture: { kind: "map-transition", stage: "core-cleared" } },
    { state: "battle-introduction", fixture: { kind: "phone-battle", stage: "encounter" } },
    { state: "battle-roll-required", fixture: { kind: "phone-battle", stage: "battle-setup" } },
    { state: "battle-enemy-roll", fixture: { kind: "phone-battle", stage: "pending-enemy-roll" } },
    { state: "battle-totals", fixture: { kind: "phone-battle", stage: "rolled-result" } },
    { state: "battle-success", fixture: { kind: "phone-battle", stage: "success" } },
    { state: "battle-defeat", fixture: { kind: "phone-battle", stage: "defeat" } },
    { state: "follower-acquired", fixture: { kind: "follower", stage: "acquired" } },
    { state: "follower-used", fixture: { kind: "follower", stage: "used" } },
    { state: "artifact-exchange-ineligible", fixture: { kind: "relic-trade", completedContracts: 2 } },
    { state: "artifact-exchange-eligible", fixture: { kind: "relic-trade", completedContracts: 3 } },
    { state: "shop-location-open", fixture: { kind: "shop", stage: "valid-first" } },
    { state: "scenario-preparation", fixture: { kind: "host-state", stage: "scenario-preparation" } },
    { state: "player-disconnected", fixture: { kind: "host-state", stage: "disconnected" } }
  ];

  for (const entry of fixtures) {
    await seed(apiOrigin, auth, entry.fixture);
    await captureTv(tv, output, entry.state);
    if (entry.state === "movement-roll-ready") {
      const boxes = await Promise.all([
        tv.getByTestId("movement-roll-hud").boundingBox(),
        tv.getByTestId("movement-destination-hud").boundingBox()
      ]);
      if (boxes.some((box) => !box || box.x < 0 || box.x + box.width > 1366)) {
        throw new Error(`Movement HUD escaped the 1366 viewport: ${JSON.stringify(boxes)}`);
      }
    }
    if (entry.state === "battle-success") {
      await tv.getByTestId("host-battle-result-banner").getByText("Tie succeeds", { exact: true }).waitFor();
      const defeatedRows = await tv.getByTestId("result-delta-threatDefeated").count();
      if (defeatedRows > 1) throw new Error(`Battle duplicated ${defeatedRows} Threat defeated rows`);
    }
  }

  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(apiOrigin, auth, { kind: "phone-battle", stage: "battle-setup" });
  await captureTv(tv, output, "battle-reduced-motion");
  const reducedAnimation = await tv.getByTestId("tv-host-battle-chamber").evaluate((element) => getComputedStyle(element).animationName);
  if (reducedAnimation !== "none") throw new Error(`Reduced motion still animates battle chamber: ${reducedAnimation}`);
  await tv.emulateMedia({ reducedMotion: "no-preference" });

  for (const entry of [
    { state: "session-victory", fixture: { kind: "host-state", stage: "victory" } },
    { state: "session-loss", fixture: { kind: "host-state", stage: "loss" } }
  ]) {
    await seed(apiOrigin, auth, entry.fixture);
    await captureTv(tv, output, entry.state);
  }

  const body = await tv.locator("body").innerText();
  if (/Choose one Artifact|Confirm Artifact|Private agenda|Rivalry target/i.test(body)) {
    throw new Error("Private choice text leaked to the TV during host UI QA");
  }
  if (errors.length > 0) throw new Error(`Console errors:\n${errors.join("\n")}`);

  await browser.close();
  const stateCount = fixtures.length + 6; // startup, lobby, board, reduced motion, victory, loss
  const screenshotCount = (fixtures.length + 5) * viewports.length + 1; // lobby is captured at 1366 only
  console.log(JSON.stringify({ output, states: stateCount, screenshots: screenshotCount }, null, 2));
}

await main();
