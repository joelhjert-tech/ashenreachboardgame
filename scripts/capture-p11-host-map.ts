import { mkdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CharacterSummary { name: string; qaOnly?: boolean }

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p11-host-map", "screenshots");
const recordings = resolve("docs", "qa", "p11-host-map", "recordings");
const viewports = [
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 }
] as const;
const browserErrors: string[] = [];
const metrics: Array<{ state: string; viewport: string; overflowX: number; overflowY: number; brief: { width: number; height: number } | null }> = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function joinPhone(browser: Browser, roomCode: string, displayName: string, operativeName: string): Promise<{ page: Page; auth: Auth }> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(page);
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(escapeRegex(operativeName), "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`No auth stored for ${displayName}`);
  return { page, auth };
}

async function seed(auth: Auth, fixture: unknown): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function capture(page: Page, state: string): Promise<void> {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(180);
    await page.waitForFunction(() => Array.from(document.images).filter((image) => image.offsetParent !== null).every((image) => image.complete));
    const result = await page.evaluate(() => {
      const brief = document.querySelector<HTMLElement>("[data-testid=host-sector-brief]")?.getBoundingClientRect() ?? null;
      return {
        overflowX: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth,
        overflowY: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - document.documentElement.clientHeight,
        brief: brief ? { width: brief.width, height: brief.height } : null,
        forbidden: /Rivalry target|Private agenda|Choose one Artifact|gate-of-cinders-breached|seat-[0-9]/i.test(document.body.innerText)
      };
    });
    if (result.overflowX > 0 || result.overflowY > 0) throw new Error(`${state}-${viewport.width}x${viewport.height} overflow ${JSON.stringify(result)}`);
    if (result.forbidden) throw new Error(`${state}-${viewport.width}x${viewport.height} rendered forbidden private/internal text`);
    await page.screenshot({ path: join(output, `${state}-${viewport.width}x${viewport.height}.png`), fullPage: false });
    metrics.push({ state, viewport: `${viewport.width}x${viewport.height}`, overflowX: result.overflowX, overflowY: result.overflowY, brief: result.brief });
  }
}

async function createSession(browser: Browser, playerCount: number): Promise<{ session: SessionResponse; joined: Array<{ page: Page; auth: Auth }> }> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: playerCount === 1 ? "single-player" : "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount });
  const charactersResponse = await fetch(`${api}/api/characters`);
  const { characters } = await charactersResponse.json() as { characters: CharacterSummary[] };
  const available = characters.filter((character) => !character.qaOnly).slice(0, playerCount);
  if (available.length < playerCount) throw new Error(`Only ${available.length} playable characters available for ${playerCount} seats`);
  const joined: Array<{ page: Page; auth: Auth }> = [];
  for (let index = 0; index < playerCount; index += 1) {
    joined.push(await joinPhone(browser, session.roomCode, `Map Seat ${index + 1}`, available[index]!.name));
  }
  await joined[0]!.page.getByRole("button", { name: "Start Game" }).click();
  return { session, joined };
}

async function openTv(browser: Browser, session: SessionResponse): Promise<Page> {
  const page = await browser.newPage({ viewport: viewports[0] });
  watch(page);
  await page.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
  await page.goto(`${client}/tv?room=${session.roomCode}&qaNetworkControls=1`);
  await page.getByTestId("tv-command-main").waitFor();
  return page;
}

async function record(
  browser: Browser,
  session: SessionResponse,
  filename: string,
  run: (page: Page) => Promise<void>,
  reducedMotion = false
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: recordings, size: { width: 1920, height: 1080 } },
    reducedMotion: reducedMotion ? "reduce" : "no-preference"
  });
  await context.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${client}/tv?room=${session.roomCode}&qaNetworkControls=1`);
  await page.getByTestId("tv-command-main").waitFor();
  await run(page);
  const video = page.video();
  await context.close();
  const source = await video?.path();
  if (!source) throw new Error(`No video produced for ${filename}`);
  await rename(source, join(recordings, filename));
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  await mkdir(recordings, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const pages: Page[] = [];
  try {
    const single = await createSession(browser, 1);
    pages.push(...single.joined.map((entry) => entry.page));
    const phone = single.joined[0]!.page;
    const auth = single.joined[0]!.auth;
    const tv = await openTv(browser, single.session);
    pages.push(tv);

    await seed(auth, { kind: "tile-arrival", stage: "single-next-turn" });
    await seed(auth, { kind: "phone-movement", stage: "roll-required" });
    await tv.getByTestId("host-sector-brief").waitFor();
    await capture(tv, "board-overview-current-sector");

    await seed(auth, { kind: "tile-arrival", stage: "single-next-turn" });
    await seed(auth, { kind: "phone-movement", stage: "four-routes" });
    await phone.getByTestId("movement-destination").first().waitFor();
    await capture(tv, "destination-abc");
    await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
    await tv.getByTestId("host-sector-brief").waitFor();
    await capture(tv, "selected-destination-route-context");

    await seed(auth, { kind: "map-transition", stage: "guardian-cleared" });
    await phone.getByTestId("movement-destination").first().waitFor();
    await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
    await capture(tv, "cross-ring-gate-context");

    await seed(auth, { kind: "phone-movement", stage: "roll-required" });
    await tv.getByTestId("sector-node-ashwake-crossing").click();
    await capture(tv, "bridge-current-location");
    await tv.getByTestId("sector-node-votive-engine-room").click();
    await capture(tv, "public-shop-sector");
    await tv.getByTestId("sector-node-weeping-ammunition-shrine").click();
    await capture(tv, "long-sector-name");

    await seed(auth, { kind: "phone-movement", stage: "four-routes" });
    await tv.reload();
    await tv.getByTestId("host-sector-brief").waitFor();
    await capture(tv, "reconnect-restored-map");
    await tv.emulateMedia({ reducedMotion: "reduce" });
    await capture(tv, "reduced-motion-map");
    await tv.emulateMedia({ reducedMotion: "no-preference" });

    await seed(auth, { kind: "phone-movement", stage: "roll-required" });
    await record(browser, single.session, "overview-to-movement-selection.webm", async (page) => {
      await seed(auth, { kind: "phone-movement", stage: "four-routes" });
      await page.getByTestId("tv-movement-focus").waitFor();
      await page.waitForTimeout(900);
    });

    await seed(auth, { kind: "phone-movement", stage: "four-routes" });
    await record(browser, single.session, "destination-preview-changes.webm", async (page) => {
      await phone.getByTestId("movement-destination").first().waitFor();
      const options = phone.locator(".phone-move-option-a__select:not(:disabled)");
      await options.nth(0).click();
      await page.waitForTimeout(650);
      if (await options.nth(1).isVisible().catch(() => false)) await options.nth(1).click();
      await page.waitForTimeout(650);
    });

    await seed(auth, { kind: "tile-arrival", stage: "single-next-turn" });
    await seed(auth, { kind: "phone-movement", stage: "long-routes" });
    await record(browser, single.session, "movement-route-and-arrival.webm", async (page) => {
      await phone.getByTestId("movement-destination").first().waitFor();
      await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
      await phone.getByTestId("movement-primary-action").filter({ hasText: /^Confirm / }).click();
      await page.waitForTimeout(4_000);
    });

    await seed(auth, { kind: "tile-arrival", stage: "single-next-turn" });
    await seed(auth, { kind: "phone-movement", stage: "medium-routes" });
    await record(browser, single.session, "arrival-to-encounter-focus.webm", async (page) => {
      await phone.getByTestId("movement-destination").first().waitFor();
      await phone.locator(".phone-move-option-a__select:not(:disabled)").first().click();
      await phone.getByTestId("movement-primary-action").filter({ hasText: /^Confirm / }).click();
      await page.waitForTimeout(5_000);
    });

    await record(browser, single.session, "operative-handoff.webm", async (page) => {
      await seed(auth, { kind: "waiting-handoff", stage: "handoff" });
      await page.waitForTimeout(900);
      await seed(auth, { kind: "waiting-handoff", stage: "next-turn" });
      await page.waitForTimeout(900);
    });

    await seed(auth, { kind: "phone-movement", stage: "four-routes" });
    await record(browser, single.session, "reconnect-restoration.webm", async (page) => {
      await page.reload();
      await page.getByTestId("host-sector-brief").waitFor();
      await page.waitForTimeout(900);
    });

    await record(browser, single.session, "reduced-motion-map-sequence.webm", async (page) => {
      await seed(auth, { kind: "map-transition", stage: "guardian-cleared" });
      await page.getByTestId("host-sector-brief").waitFor();
      await page.waitForTimeout(900);
    }, true);

    const six = await createSession(browser, 6);
    pages.push(...six.joined.map((entry) => entry.page));
    const sixTv = await openTv(browser, six.session);
    pages.push(sixTv);
    await seed(six.joined[0]!.auth, { kind: "host-rare", stage: "stacked-operatives" });
    await sixTv.getByLabel(/6 operatives on Anchor Market/i).waitFor();
    await capture(sixTv, "six-operatives-stacked-active");

    if (browserErrors.length > 0) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
    await writeFile(resolve("docs", "qa", "p11-host-map", "capture-metrics.json"), JSON.stringify({ metrics, browserErrors }, null, 2));
    console.log(JSON.stringify({ screenshots: metrics.length, recordings: 7, states: new Set(metrics.map((entry) => entry.state)).size, browserErrors: 0, output }, null, 2));
  } finally {
    await Promise.all(pages.map((page) => page.close().catch(() => undefined)));
    await browser.close();
  }
}

await main();
