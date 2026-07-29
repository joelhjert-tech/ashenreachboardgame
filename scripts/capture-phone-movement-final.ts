import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface StoredAuth { roomCode: string; seatId: string; seatToken: string; displayName: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "movement-phone", "final");

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json() as T;
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function seed(auth: StoredAuth, fixture: unknown): Promise<void> {
  await postJson("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture
  });
}

async function assertLayout(page: Page, label: string): Promise<void> {
  const layout = await page.evaluate(() => {
    const action = document.querySelector<HTMLElement>("[data-testid='movement-action-region']")?.getBoundingClientRect();
    const navigation = document.querySelector<HTMLElement>(".phone-move-prototype__context-nav")?.getBoundingClientRect();
    const primary = document.querySelector<HTMLElement>("[data-testid='movement-primary-action']")?.getBoundingClientRect();
    return {
      bodyWidth: document.body.scrollWidth,
      rootWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      action: action ? { top: action.top, bottom: action.bottom } : null,
      navigation: navigation ? { top: navigation.top, bottom: navigation.bottom } : null,
      primary: primary ? { top: primary.top, bottom: primary.bottom } : null
    };
  });
  if (Math.max(layout.bodyWidth, layout.rootWidth) > layout.viewportWidth) {
    throw new Error(`${label}: horizontal overflow ${JSON.stringify(layout)}`);
  }
  if (!layout.action || !layout.navigation || !layout.primary) {
    throw new Error(`${label}: missing movement dock region ${JSON.stringify(layout)}`);
  }
  if (layout.action.bottom > layout.navigation.top + 1) {
    throw new Error(`${label}: action and navigation overlap ${JSON.stringify(layout)}`);
  }
  if (layout.primary.top < 0 || layout.primary.bottom > layout.viewportHeight) {
    throw new Error(`${label}: primary action outside viewport ${JSON.stringify(layout)}`);
  }
}

async function createStartedPhone(phone: Page): Promise<StoredAuth> {
  const session = await postJson<SessionResponse>("/api/session/create", {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
  await phone.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await phone.getByLabel("Player name").fill("Movement QA");
  await phone.getByRole("button", { name: "Join Game" }).click();
  await phone.getByRole("heading", { name: "Select operative" }).waitFor();
  await phone.getByRole("button", { name: /Bjornis/i }).click();
  await phone.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await phone.getByRole("button", { name: "Select Contract" }).first().click();
  await phone.getByRole("button", { name: "Ready" }).click();
  await phone.getByRole("button", { name: "Start Game" }).click();
  const auth = await phone.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as StoredAuth | null;
  if (!auth) throw new Error("Phone auth was not stored");
  await seed(auth, { kind: "phone-movement", stage: "roll-required" });
  await phone.getByTestId("phone-movement-view").waitFor();
  return auth;
}

async function capture(page: Page, filename: string, label: string): Promise<void> {
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  await assertLayout(page, label);
  await page.screenshot({ path: join(output, filename), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  phone.on("pageerror", (error) => errors.push(error.message));
  const auth = await createStartedPhone(phone);

  await capture(phone, "01-roll-required-390x844.png", "roll required");
  await seed(auth, { kind: "phone-movement", stage: "four-routes" });
  await phone.waitForFunction(() => document.querySelectorAll("[data-testid='movement-destination']").length === 4);
  await phone.getByText(/4 legal destinations/i).waitFor();
  await capture(phone, "02-four-routes-390x844.png", "four routes");

  await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
  await phone.getByTestId("movement-primary-action").filter({ hasText: /^Confirm / }).waitFor();
  await capture(phone, "03-selected-390x844.png", "selected destination");
  await phone.locator(".phone-move-option-a__card.is-selected summary").click();
  await capture(phone, "04-details-expanded-390x844.png", "details expanded");

  await seed(auth, { kind: "map-transition", stage: "guardian-cleared" });
  await phone.getByRole("button", { name: /Select Melted Gate/i }).scrollIntoViewIfNeeded();
  await capture(phone, "05-special-route-390x844.png", "special route");

  await seed(auth, { kind: "phone-movement", stage: "four-routes" });
  await phone.waitForFunction(() => document.querySelectorAll("[data-testid='movement-destination']").length === 4);
  await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
  for (const size of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 430, height: 932 }
  ]) {
    await phone.setViewportSize(size);
    await capture(phone, `06-selected-${size.width}x${size.height}.png`, `selected ${size.width}x${size.height}`);
  }

  await phone.setViewportSize({ width: 390, height: 844 });
  await seed(auth, { kind: "phone-movement", stage: "confirmed" });
  await phone.getByText("Moving to", { exact: true }).waitFor();
  await capture(phone, "07-confirmed-390x844.png", "movement confirmed");

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, screenshots: 10, browserErrors: 0 }, null, 2));
}

await main();
