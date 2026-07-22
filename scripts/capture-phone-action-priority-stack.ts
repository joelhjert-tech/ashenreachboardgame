import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "phone-action-priority-stack");

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page): Promise<Auth> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("PriorityQA");
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

async function joinConfiguredPhone(page: Page, roomCode: string, displayName: string, operativeName: string): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(operativeName, "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Controller authentication was not stored for ${displayName}`);
  return auth;
}

async function startTwoPlayerSession(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  interactionMode: "co-op" | "rivalry",
  errors: string[]
) {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode,
    gameMode: "standard",
    playerCount: 2
  });
  const host = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [host, guest]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }
  const hostAuth = await joinConfiguredPhone(host, session.roomCode, `${interactionMode} host`, "Bjornis");
  const guestAuth = await joinConfiguredPhone(guest, session.roomCode, `${interactionMode} guest`, "Deepdale");
  await host.getByRole("button", { name: "Start Game" }).click();
  await host.waitForTimeout(700);
  return { host, guest, hostAuth, guestAuth };
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function openAction(page: Page): Promise<void> {
  if (await page.getByTestId("phone-action-priority-stack").count()) return;
  if (await page.getByRole("button", { name: "Show Tabs" }).count()) {
    await page.getByRole("button", { name: "Show Tabs" }).click();
  }
  const actionTab = page.getByRole("tab", { name: /^Action/i });
  if (await actionTab.count()) await actionTab.click({ force: true });
  try {
    await page.getByTestId("phone-action-priority-stack").waitFor({ timeout: 8_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      tabs: Array.from(document.querySelectorAll('[role="tab"]')).map((node) => ({ text: node.textContent, selected: node.getAttribute("aria-selected"), disabled: node.getAttribute("aria-disabled") })),
      tests: Array.from(document.querySelectorAll("[data-testid]")).map((node) => node.getAttribute("data-testid")).filter(Boolean)
    }));
    throw new Error(`Priority Stack did not open: ${JSON.stringify(diagnostics)}\n${String(error)}`);
  }
}

async function capture(page: Page, filename: string, width: number, height: number, resetScroll = true): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(180);
  if (resetScroll) {
    await page.evaluate(() => {
      document.scrollingElement?.scrollTo(0, 0);
      document.querySelectorAll<HTMLElement>("main, [class*='scroll'], [class*='content']").forEach((element) => { element.scrollTop = 0; });
    });
  }
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  if (Math.max(metrics.body, metrics.root) > metrics.viewport) throw new Error(`${filename} horizontal overflow: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: join(output, filename), fullPage: false });
}

async function seedActionAndCapture(page: Page, auth: Auth, fixture: unknown, filename: string, width = 390, height = 844): Promise<void> {
  await seed(auth, fixture);
  await page.waitForTimeout(260);
  await openAction(page);
  await capture(page, filename, width, height);
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  phone.on("pageerror", (error) => errors.push(error.message));
  const auth = await startPhone(phone);
  let captures = 0;

  for (const [width, height] of [[360, 800], [390, 844], [412, 915], [430, 932]] as const) {
    await seedActionAndCapture(phone, auth, { kind: "phone-action", stage: "free-action" }, `free-action-${width}x${height}.png`, width, height);
    captures += 1;
  }

  const actionStates: Array<[string, unknown, number?, number?]> = [
    ["hazard-ready-390x844.png", { kind: "phone-action", stage: "hazard-ready" }],
    ["challenge-390x844.png", { kind: "phone-action", stage: "challenge-ready" }],
    ["event-390x844.png", { kind: "phone-action", stage: "event-ready" }],
    ["many-actions-430x932.png", { kind: "phone-action", stage: "many-actions" }, 430, 932],
    ["end-turn-legal-390x844.png", { kind: "phone-action", stage: "free-action" }],
    ["end-turn-blocked-390x844.png", { kind: "phone-action", stage: "hazard-ready" }],
    ["single-player-360x800.png", { kind: "phone-action", stage: "free-action" }, 360, 800]
  ];
  for (const [filename, fixture, width = 390, height = 844] of actionStates) {
    await seedActionAndCapture(phone, auth, fixture, filename, width, height);
    captures += 1;
  }

  await seed(auth, { kind: "phone-action", stage: "hazard-ready" });
  await phone.goto(`${client}/?room=${auth.roomCode}`);
  await phone.waitForLoadState("domcontentloaded");
  await phone.waitForTimeout(1_200);
  await openAction(phone);
  await capture(phone, "reconnect-restored-390x844.png", 390, 844);
  captures += 1;

  await seed(auth, { kind: "phone-action", stage: "hazard-ready" });
  await openAction(phone);
  await phone.getByRole("button", { name: /Face the Hazard/i }).click();
  await phone.getByRole("button", { name: /Roll check dice/i }).waitFor({ timeout: 8_000 });
  await openAction(phone);
  await capture(phone, "hazard-active-390x844.png", 390, 844);
  captures += 1;

  await seed(auth, { kind: "phone-action", stage: "blocked-start" });
  await openAction(phone);
  await phone.getByText(/^Blocked/).click();
  await capture(phone, "many-blocked-actions-390x844.png", 390, 844);
  captures += 1;

  await seed(auth, { kind: "phone-action", stage: "free-action" });
  await seed(auth, { kind: "mission-reward", stage: "ready" });
  await phone.waitForTimeout(300);
  await openAction(phone);
  const optional = phone.getByTestId("priority-optional");
  await optional.scrollIntoViewIfNeeded();
  if (await optional.evaluate((node) => node.tagName === "DETAILS" && !(node as HTMLDetailsElement).open)) {
    await optional.locator("summary").click();
  }
  await optional.scrollIntoViewIfNeeded();
  await capture(phone, "mission-completion-390x844.png", 390, 844, false);
  captures += 1;

  await seed(auth, { kind: "scar-system", stage: "third-warning" });
  await phone.getByText(/Scar choice/i).first().waitFor({ timeout: 8_000 });
  await capture(phone, "scar-choice-blocked-390x844.png", 390, 844);
  captures += 1;

  await seed(auth, { kind: "phone-battle", stage: "battle-setup" });
  await phone.getByTestId("phone-battle-shell").waitFor({ timeout: 8_000 });
  await capture(phone, "battle-390x844.png", 390, 844);
  captures += 1;

  await seed(auth, { kind: "salvage-resolution", stage: "payment" });
  await phone.getByText(/payment|loss pending|pay/i).first().waitFor({ timeout: 8_000 });
  await capture(phone, "payment-390x844.png", 390, 844);
  captures += 1;

  const coop = await startTwoPlayerSession(browser, "co-op", errors);
  await coop.guest.waitForTimeout(500);
  await capture(coop.guest, "co-op-waiting-390x844.png", 390, 844);
  captures += 1;
  await coop.host.close();
  await coop.guest.close();

  const rivalry = await startTwoPlayerSession(browser, "rivalry", errors);
  await seed(rivalry.hostAuth, { kind: "phone-action", stage: "free-action" });
  await rivalry.host.waitForTimeout(300);
  await openAction(rivalry.host);
  const passiveSection = rivalry.host.getByText(/^Passive \/ already applied/);
  if (await passiveSection.count()) {
    await passiveSection.click();
    await rivalry.host.getByText("Private agenda").scrollIntoViewIfNeeded();
  }
  await capture(rivalry.host, "rivalry-private-390x844.png", 390, 844, false);
  captures += 1;
  await rivalry.host.close();
  await rivalry.guest.close();

  await browser.close();
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, captures }, null, 2));
}

await main();
