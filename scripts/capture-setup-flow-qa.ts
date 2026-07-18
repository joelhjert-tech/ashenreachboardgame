import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionState {
  roomCode: string;
  hostToken: string;
}

interface StoredAuth {
  roomCode: string;
  seatId: string;
  seatToken: string;
}

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "setup-flow", "final");

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

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const sessionResponse = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionMode: "multiplayer",
      interactionMode: "co-op",
      gameMode: "standard",
      playerCount: 2
    })
  });
  if (!sessionResponse.ok) throw new Error(`Session endpoint returned ${sessionResponse.status}`);
  const session = await sessionResponse.json() as SessionState;

  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  for (const page of [phone, tv]) {
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  await tv.addInitScript(({ hostToken }) => {
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, { hostToken: session.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("Setup QA");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();

  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as StoredAuth | null;
  if (!auth) throw new Error("Phone auth was not stored");
  const fixtureResponse = await fetch(`${apiOrigin}/api/qa/phase1-fixture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomCode: auth.roomCode,
      seatToken: auth.seatToken,
      fixture: { kind: "setup-flow", stage: "scenario-selection" }
    })
  });
  if (!fixtureResponse.ok) throw new Error(`Setup fixture returned ${fixtureResponse.status}: ${await fixtureResponse.text()}`);

  await phone.getByRole("heading", { name: "Host Phone" }).waitFor();
  await tv.getByRole("heading", { name: "Choosing the expedition scenario" }).waitFor();
  const scenarioArt = await phone.locator(".phone-host-scenario-card-art").first().evaluate((art) => {
    const rect = art.getBoundingClientRect();
    const style = getComputedStyle(art);
    return {
      backgroundImage: style.backgroundImage,
      width: rect.width,
      height: rect.height,
      opacity: style.opacity,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition
    };
  });
  if (!scenarioArt.backgroundImage.includes("broken-seal.png")) {
    throw new Error(`Phone scenario art did not load: ${JSON.stringify(scenarioArt)}`);
  }
  await assertNoOverflow(phone, "phone scenario selection");
  await assertNoOverflow(tv, "TV scenario selection");
  await phone.screenshot({ path: join(output, "phone-scenario-selection-390x844.png"), fullPage: false });
  await tv.screenshot({ path: join(output, "tv-scenario-selection-1920x1080.png"), fullPage: false });

  const scenarios = phone.getByRole("radio");
  if (await scenarios.count() > 1) await scenarios.nth(1).click();
  await phone.getByRole("button", { name: "Multiplayer Co-op" }).click();
  await phone.getByRole("button", { name: "Confirm Setup" }).click();

  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  if (await phone.getByText("Choose Character", { exact: true }).count()) {
    throw new Error("Duplicate Choose Character heading is still visible");
  }
  await assertNoOverflow(phone, "phone character selection");
  await phone.screenshot({ path: join(output, "phone-character-selection-390x844.png"), fullPage: false });

  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  const missionButton = phone.getByRole("button", { name: "Select Mission" }).first();
  await missionButton.click();
  const readyButton = phone.getByRole("button", { name: "Ready" });
  await readyButton.waitFor({ state: "visible" });
  if (await readyButton.isDisabled()) {
    throw new Error("Starting mission was not confirmed after one click");
  }
  await readyButton.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: join(output, "phone-mission-selected-one-click-390x844.png"), fullPage: false });

  await browser.close();
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, roomCode: session.roomCode, screenshots: 4, scenarioArt }, null, 2));
}

await main();
