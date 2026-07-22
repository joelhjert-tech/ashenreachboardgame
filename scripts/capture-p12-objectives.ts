import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CharacterSummary { name: string; qaOnly?: boolean }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const root = resolve("docs", "qa", "p12-objectives");
const screenshots = resolve(root, "screenshots");
const recordings = resolve(root, "recordings");
const browserErrors: string[] = [];
const metrics: Array<{ surface: string; state: string; viewport: string; overflowX: number; horizontalControlClipping: number; forbidden: string[] }> = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
}

async function joinPhone(browser: Browser, roomCode: string, displayName: string, operativeName: string): Promise<{ page: Page; auth: Auth }> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(page);
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(operativeName, "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`No auth stored for ${displayName}`);
  return { page, auth };
}

async function seed(auth: Auth, stage: string): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "objective-presentation", stage } });
}

async function openObjectives(page: Page): Promise<void> {
  await page.locator("body").waitFor();
  await page.waitForTimeout(350);
  const more = page.getByRole("button", { name: /show tabs|more/i });
  if (await more.count() && await more.first().isVisible()) {
    await more.first().click();
    await page.waitForTimeout(100);
  }
  const tab = page.getByRole("tab", { name: "Objectives" });
  await tab.waitFor({ timeout: 10_000 });
  await tab.click();
  await page.getByTestId("phone-shared-mission-summary").waitFor();
}

async function focusPhoneObjectiveState(page: Page, stage: string): Promise<void> {
  const target = stage === "replacement"
    ? page.getByRole("region", { name: "Choose new contract" })
    : stage.startsWith("agenda-")
      ? page.getByRole("region", { name: "Private rivalry agenda" })
      : stage === "contract" || stage === "contract-near" || stage === "long-content" || stage === "reconnect-contract-near"
        ? page.getByTestId("phone-active-mission-card")
        : page.getByTestId("phone-shared-mission-summary");
  await target.waitFor({ timeout: 10_000 });
  await target.evaluate((element) => {
    element.scrollIntoView({ block: "start" });
    window.scrollBy({ top: -132, behavior: "instant" });
  });
  await page.waitForTimeout(120);
}

async function inspect(page: Page, surface: string, state: string, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(180);
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const forbidden = Array.from(document.querySelectorAll("body *"))
      .filter((node) => node.children.length === 0 && node.textContent && /seat-[0-9]|multiStopRoute|shopTransaction|claim-trophies|choir-echo-triangulation/i.test(node.textContent))
      .map((node) => `${node.tagName}.${(node as HTMLElement).className}:${node.textContent!.trim()}`).slice(0, 8);
    const controls = Array.from(document.querySelectorAll<HTMLElement>("button:not([disabled]), [role=button]:not([aria-disabled=true])"));
    return {
      overflowX: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - width,
      horizontalControlClipping: controls.filter((control) => {
        const box = control.getBoundingClientRect();
        return box.right > width + 1 || box.left < -1;
      }).length,
      forbidden
    };
  });
  await page.screenshot({ path: resolve(screenshots, `${surface}-${state}-${viewport.width}x${viewport.height}.png`), fullPage: false });
  if (result.overflowX > 0 || result.forbidden.length > 0) throw new Error(`${surface}/${state}/${viewport.width} failed ${JSON.stringify(result)}`);
  metrics.push({ surface, state, viewport: `${viewport.width}x${viewport.height}`, ...result });
}

async function recordPhoneFlow(options: {
  browser: Browser;
  viewerAuth: Auth;
  actorAuth: Auth;
  name: string;
  stages: Array<{ stage: string; focus?: string; reload?: boolean }>;
  reducedMotion?: boolean;
}): Promise<void> {
  const context = await options.browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
    recordVideo: { dir: recordings, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  watch(page);
  await page.addInitScript((auth) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(auth)), options.viewerAuth);
  await page.goto(`${client}/?room=${options.viewerAuth.roomCode}`);
  for (const entry of options.stages) {
    await seed(options.actorAuth, entry.stage);
    if (entry.reload) {
      await page.reload();
    }
    await openObjectives(page);
    await focusPhoneObjectiveState(page, entry.focus ?? entry.stage);
    await page.waitForTimeout(options.reducedMotion ? 500 : 850);
  }
  const video = page.video();
  await context.close();
  if (video) await rename(await video.path(), resolve(recordings, `${options.name}.webm`));
}

async function main(): Promise<void> {
  await mkdir(screenshots, { recursive: true });
  await mkdir(recordings, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const session = await post<SessionResponse>("/api/session/create", { sessionMode: "multiplayer", interactionMode: "rivalry", gameMode: "standard", playerCount: 2 });
    const characters = await fetch(`${api}/api/characters`).then((response) => response.json()) as { characters: CharacterSummary[] };
    const available = characters.characters.filter((character) => !character.qaOnly).slice(0, 2);
    const owner = await joinPhone(browser, session.roomCode, "Joel", available[0]!.name);
    const waiting = await joinPhone(browser, session.roomCode, "Anna", available[1]!.name);
    await owner.page.getByRole("button", { name: "Start Game" }).click();
    const tv = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    watch(tv);
    await tv.goto(`${client}/tv?room=${session.roomCode}`);
    await tv.getByTestId("tv-command-main").waitFor();

    const phoneViews = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
    for (const stage of ["shared", "contract", "contract-near", "replacement", "agenda-locked", "agenda-revealed", "agenda-complete", "long-content"] as const) {
      await seed(owner.auth, stage);
      await openObjectives(owner.page);
      for (const viewport of phoneViews) {
        await focusPhoneObjectiveState(owner.page, stage);
        await inspect(owner.page, "phone", stage, viewport);
      }
    }

    await seed(owner.auth, "private-resolution");
    await openObjectives(waiting.page);
    await inspect(waiting.page, "waiting-phone", "private-resolution", { width: 390, height: 844 });

    for (const stage of ["shared", "private-resolution", "agenda-revealed", "long-content"] as const) {
      await seed(owner.auth, stage);
      for (const viewport of [{ width: 1366, height: 768 }, { width: 1600, height: 900 }, { width: 1920, height: 1080 }]) await inspect(tv, "tv", stage, viewport);
    }

    await seed(owner.auth, "contract-near");
    await owner.page.evaluate((roomCode) => history.replaceState(null, "", `/?room=${roomCode}`), session.roomCode);
    await owner.page.reload();
    await openObjectives(owner.page);
    await focusPhoneObjectiveState(owner.page, "reconnect-contract-near");
    await inspect(owner.page, "phone", "reconnect-contract-near", { width: 390, height: 844 });

    await recordPhoneFlow({ browser, viewerAuth: owner.auth, actorAuth: owner.auth, name: "p12-mission-progress-update", stages: [
      { stage: "shared", focus: "shared" },
      { stage: "contract", focus: "shared" }
    ] });
    await recordPhoneFlow({ browser, viewerAuth: owner.auth, actorAuth: owner.auth, name: "p12-contract-progress-completion", stages: [
      { stage: "contract" },
      { stage: "contract-near" },
      { stage: "replacement" }
    ] });
    await recordPhoneFlow({ browser, viewerAuth: owner.auth, actorAuth: owner.auth, name: "p12-agenda-lock-reveal", stages: [
      { stage: "agenda-locked" },
      { stage: "agenda-revealed" }
    ] });
    await recordPhoneFlow({ browser, viewerAuth: waiting.auth, actorAuth: owner.auth, name: "p12-private-completion-public-safe", stages: [
      { stage: "private-resolution", focus: "shared" }
    ] });
    await recordPhoneFlow({ browser, viewerAuth: owner.auth, actorAuth: owner.auth, name: "p12-reconnect-restoration", stages: [
      { stage: "contract-near", focus: "reconnect-contract-near", reload: true }
    ] });
    await recordPhoneFlow({ browser, viewerAuth: owner.auth, actorAuth: owner.auth, name: "p12-reduced-motion-objective-flow", reducedMotion: true, stages: [
      { stage: "contract-near" },
      { stage: "replacement" }
    ] });

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const reducedPage = await reduced.newPage();
    watch(reducedPage);
    await reducedPage.addInitScript((auth) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(auth)), owner.auth);
    await reducedPage.goto(`${client}/?room=${session.roomCode}`);
    await openObjectives(reducedPage);
    await focusPhoneObjectiveState(reducedPage, "contract-near");
    await inspect(reducedPage, "phone", "reduced-motion", { width: 390, height: 844 });
    await reduced.close();

    if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
    await writeFile(resolve(root, "capture-metrics.json"), JSON.stringify({ roomCode: session.roomCode, metrics, browserErrors }, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
