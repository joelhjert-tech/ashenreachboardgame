import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

type BattleStage =
  | "encounter"
  | "battle-setup"
  | "pending-enemy-roll"
  | "rolled-result"
  | "success"
  | "defeat";

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

const stages: BattleStage[] = [
  "encounter",
  "battle-setup",
  "pending-enemy-roll",
  "rolled-result",
  "success",
  "defeat"
];

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
  await page.getByLabel("Player name").fill("Battle QA");
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

async function seedBattle(apiOrigin: string, auth: StoredControllerAuth, stage: BattleStage): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "phone-battle", stage }
  });
}

async function openBattle(page: Page): Promise<void> {
  const battleShell = page.getByTestId("phone-battle-shell");
  if (!(await battleShell.isVisible().catch(() => false))) {
    const showTabs = page.getByRole("button", { name: "Show Tabs" });
    if (await showTabs.isVisible().catch(() => false)) await showTabs.click();
    await page.getByRole("tab", { name: "Battle" }).click();
    await battleShell.waitFor({ state: "visible" });
  }
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>(".phone-battle-shell img"))
      .every((image) => image.complete && image.naturalWidth > 0)
  );
}

async function waitForBattleStage(page: Page, stage: BattleStage): Promise<void> {
  const state = page.locator(".phone-battle-state strong");
  const expectedState =
    stage === "encounter"
      ? "Battle"
      : stage === "battle-setup"
        ? "Roll required"
        : stage === "pending-enemy-roll"
          ? "Enemy roll"
          : stage === "defeat"
            ? "Defeat"
            : "Success";
  await state.filter({ hasText: expectedState }).waitFor({ state: "visible" });
  if (stage === "success") {
    await page.getByText("Threat defeated", { exact: true }).waitFor({ state: "visible" });
  } else if (stage === "defeat") {
    await page.getByText("Operative defeated", { exact: true }).waitFor({ state: "visible" });
  } else {
    await page.locator(".phone-battle-outcome").waitFor({ state: "detached" });
  }
}

async function assertFocusedBattleLayout(page: Page, viewport: { width: number; height: number }): Promise<void> {
  const measurements = await page.evaluate(() => {
    const arenaElement = document.querySelector<HTMLElement>(".phone-battle-arena");
    const totalsElement = document.querySelector<HTMLElement>(".phone-battle-equation");
    const actionElement = document.querySelector<HTMLElement>(".phone-battle-shell__action");
    const navigationElement = document.querySelector<HTMLElement>(".phone-battle-shell__nav");
    if (!arenaElement || !totalsElement || !actionElement || !navigationElement) {
      throw new Error("Focused battle layout is incomplete");
    }
    const arena = arenaElement.getBoundingClientRect();
    const totals = totalsElement.getBoundingClientRect();
    const action = actionElement.getBoundingClientRect();
    const navigation = navigationElement.getBoundingClientRect();
    return {
      bodyWidth: document.body.scrollWidth,
      arena: { top: arena.top, bottom: arena.bottom },
      totals: { top: totals.top, bottom: totals.bottom },
      action: { top: action.top, bottom: action.bottom },
      navigation: { top: navigation.top, bottom: navigation.bottom }
    };
  });

  if (measurements.bodyWidth > viewport.width) {
    throw new Error(`Horizontal overflow: ${measurements.bodyWidth}px > ${viewport.width}px`);
  }
  if (measurements.arena.bottom > measurements.action.top || measurements.totals.bottom > measurements.action.top) {
    throw new Error("Combatants or totals are obscured by the primary action dock");
  }
  if (measurements.action.bottom > measurements.navigation.top + 1) {
    throw new Error("Primary action dock overlaps battle navigation");
  }
  if (measurements.navigation.bottom > viewport.height + 1) {
    throw new Error("Battle navigation extends below the viewport");
  }
}

async function captureExpandedStates(page: Page, outputRoot: string, viewportValue: string): Promise<void> {
  await page.getByRole("button", { name: "View details" }).click();
  await page.getByLabel("Battle details").waitFor({ state: "visible" });
  await page.screenshot({
    path: join(outputRoot, `${viewportValue}-success-details-expanded.png`),
    fullPage: false
  });
  await page.getByRole("button", { name: "Hide details" }).click();

  for (const label of ["Operative", "Gear", "Battle Log"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("button", { name: "Back to battle" }).waitFor({ state: "visible" });
    await page.screenshot({
      path: join(outputRoot, `${viewportValue}-context-${label.toLowerCase().replace(/\s+/g, "-")}.png`),
      fullPage: false
    });
    await page.getByRole("button", { name: "Back to battle" }).click();
  }
}

async function main(): Promise<void> {
  const mode = argument("--mode", "baseline");
  const viewportValue = argument("--viewport", "390x844");
  const viewport = parseViewport(viewportValue);
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const outputRoot = resolve(argument("--output", join("reports", "ui", "battle-phone", mode)));
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const auth = await createStartedPhone(page, apiOrigin, clientOrigin);
  for (const stage of stages) {
    console.log(`Capturing ${stage}`);
    await seedBattle(apiOrigin, auth, stage);
    await openBattle(page);
    await page.getByTestId("phone-battle-shell").waitFor({ state: "visible" });
    await waitForBattleStage(page, stage);
    await page.screenshot({
      path: join(outputRoot, `${viewportValue}-${stage}.png`),
      fullPage: false
    });
    if (mode !== "baseline" && stage === "success") {
      await assertFocusedBattleLayout(page, viewport);
      await captureExpandedStates(page, outputRoot, viewportValue);
    }
  }

  if (mode === "baseline") {
    await seedBattle(apiOrigin, auth, "encounter");
    await openBattle(page);
    await page.screenshot({
      path: join(outputRoot, `${viewportValue}-expanded-navigation.png`),
      fullPage: false
    });
  }

  const scrollWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  if (scrollWidth > viewport.width) throw new Error(`Horizontal overflow: ${scrollWidth}px > ${viewport.width}px`);
  if (consoleErrors.length > 0) throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);

  await browser.close();
  console.log(JSON.stringify({ outputRoot, viewport, stages: stages.length + 1 }, null, 2));
}

await main();
