import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface CaptureRecord {
  file: string;
  surface: string;
  state: string;
  viewport: string;
  overflow: number;
  shopControlClearance?: { offerToLeave: number | null; leaveToDock: number | null; minimumTouchTarget: number | null };
}

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p6-shop-presentation");
const captures: CaptureRecord[] = [];
const errors: string[] = [];
const timings: Record<string, number> = {};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

function watch(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
}

async function joinPhone(page: Page, roomCode: string, name: string, operative: RegExp): Promise<Auth> {
  await page.goto(`${client}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Choose Piece" }).waitFor();
  await page.getByRole("button", { name: "Continue to Operative" }).click();
  await page.getByRole("heading", { name: "Choose Operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).filter({ visible: true }).first().click();
  for (let pick = 0; pick < 2; pick += 1) {
    await page.getByRole("heading", { name: "Choose one provision" }).waitFor();
    await page.getByRole("button", { name: /Choose (Equipment|Follower)/ }).first().click();
  }
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`No controller auth for ${name}`);
  return auth;
}

async function seed(auth: Auth, stage: string): Promise<void> {
  const start = performance.now();
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "host-shop", stage }
  });
  timings[`fixture-${stage}`] = Math.round(performance.now() - start);
}

async function capture(page: Page, surface: string, state: string, width: number, height: number, preserveScroll = false): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(200);
  await page.evaluate((keepScroll) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
    if (!keepScroll) document.querySelectorAll<HTMLElement>(".phone-portrait-scroll, .phone-action-content-root, .phone-sheet-actions").forEach((element) => { element.scrollTop = 0; });
  }, preserveScroll);
  await page.waitForTimeout(50);
  const metrics = await page.evaluate(() => ({
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  const overflow = Math.max(metrics.root, metrics.body) - metrics.viewport;
  if (overflow > 0) throw new Error(`${surface}-${state} overflows by ${overflow}px`);
  const shopControlClearance = surface === "phone" ? await page.evaluate(() => {
    const navigationBox = document.querySelector<HTMLElement>(".phone-shop-offer-navigation")?.getBoundingClientRect() ?? null;
    const leaveBox = document.querySelector<HTMLElement>(".phone-shop-skip")?.getBoundingClientRect() ?? null;
    const dockBox = document.querySelector<HTMLElement>("nav.phone-bottomnav")?.getBoundingClientRect() ?? null;
    const scrollBox = document.querySelector<HTMLElement>(".phone-action-content-root")?.getBoundingClientRect() ?? null;
    const navigation = navigationBox && navigationBox.bottom > 0 && navigationBox.top < innerHeight ? navigationBox : null;
    const leave = leaveBox && leaveBox.bottom > 0 && leaveBox.top < innerHeight ? leaveBox : null;
    const dock = dockBox && dockBox.bottom > 0 && dockBox.top < innerHeight ? dockBox : null;
    const touchTargets = Array.from(document.querySelectorAll<HTMLElement>(".phone-shop-offer-navigation button, .phone-shop-skip button"))
      .filter((element) => element.offsetParent !== null)
      .map((element) => Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height));
    return {
      offerToLeave: navigation && leave ? Math.round((leave.top - navigation.bottom) * 10) / 10 : null,
      leaveToDock: leave && dock ? Math.round((dock.top - Math.min(leave.bottom, scrollBox?.bottom ?? leave.bottom)) * 10) / 10 : null,
      minimumTouchTarget: touchTargets.length ? Math.round(Math.min(...touchTargets) * 10) / 10 : null
    };
  }) : undefined;
  if (shopControlClearance && shopControlClearance.offerToLeave !== null && shopControlClearance.offerToLeave < 0) {
    throw new Error(`${surface}-${state} offer navigation overlaps Leave Shop by ${Math.abs(shopControlClearance.offerToLeave)}px`);
  }
  if (shopControlClearance && shopControlClearance.leaveToDock !== null && shopControlClearance.leaveToDock < 0) {
    throw new Error(`${surface}-${state} Leave Shop overlaps the global dock by ${Math.abs(shopControlClearance.leaveToDock)}px`);
  }
  if (shopControlClearance && shopControlClearance.minimumTouchTarget !== null && shopControlClearance.minimumTouchTarget < 44) {
    throw new Error(`${surface}-${state} has a ${shopControlClearance.minimumTouchTarget}px shop control below the 44px target`);
  }
  const folder = join(output, surface);
  await mkdir(folder, { recursive: true });
  const file = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(folder, file), fullPage: false });
  captures.push({ file, surface, state, viewport: `${width}x${height}`, overflow, shopControlClearance });
}

async function phonePair(page: Page, surface: string, state: string): Promise<void> {
  await capture(page, surface, state, 390, 844);
  await capture(page, surface, state, 360, 800);
  await capture(page, surface, state, 430, 932);
}

async function tvPair(page: Page, state: string): Promise<void> {
  await capture(page, "tv", state, 1920, 1080);
  await capture(page, "tv", state, 1366, 768);
}

async function restorePhone(context: BrowserContext, auth: Auth): Promise<Page> {
  await context.addInitScript((stored) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(stored)), auth);
  const page = await context.newPage();
  watch(page);
  await page.goto(`${client}/?room=${auth.roomCode}`, { waitUntil: "networkidle" });
  return page;
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 2
  });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: join(output, "recordings", "raw"), size: { width: 390, height: 844 } } });
  const waitingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await tvContext.addInitScript(({ token }) => localStorage.setItem("ashenreach-tv-host-token", token), { token: session.hostToken });
  const owner = await ownerContext.newPage();
  const waiting = await waitingContext.newPage();
  const tv = await tvContext.newPage();
  [owner, waiting, tv].forEach(watch);
  const auth = await joinPhone(owner, session.roomCode, "P6Buyer", /Bjornis/i);
  await joinPhone(waiting, session.roomCode, "P6Waiting", /Deepdale/i);
  await owner.getByRole("button", { name: "Start Game" }).click();
  await tv.goto(`${client}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });

  const stages = ["categories", "equipment", "items", "services", "artifacts", "sell", "insufficient", "sold-out", "locked", "long-lore"] as const;
  for (const stage of stages) {
    await seed(auth, stage);
    await phonePair(owner, "phone", stage);
    await phonePair(waiting, "waiting-phone", stage);
    await tvPair(tv, stage);
  }

  await seed(auth, "categories");
  for (const size of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await owner.setViewportSize(size);
    await owner.locator(".phone-action-content-root").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await capture(owner, "phone", "leave-shop-clearance", size.width, size.height, true);
  }

  await seed(auth, "equipment");
  const buyStart = performance.now();
  await owner.getByRole("button", { name: /^Buy / }).click();
  await owner.getByText(/Purchase Complete/i).waitFor();
  timings.buyResponse = Math.round(performance.now() - buyStart);
  await phonePair(owner, "phone", "purchase-result");
  await phonePair(waiting, "waiting-phone", "purchase-result");
  await tvPair(tv, "purchase-result");

  await seed(auth, "equipment");
  const restored = await restorePhone(ownerContext, auth);
  await restored.getByTestId("phone-shop-panel").waitFor();
  await phonePair(restored, "phone", "reconnect-browsing");
  await restored.close();

  await owner.emulateMedia({ reducedMotion: "reduce" });
  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(auth, "long-lore");
  await phonePair(owner, "phone", "reduced-motion");
  await tvPair(tv, "reduced-motion");

  const ownerVideo = owner.video();
  await owner.close();
  if (ownerVideo) await ownerVideo.saveAs(join(output, "recordings", "shop-entry-browse-purchase.webm"));
  await waiting.close();
  await tv.close();
  await ownerContext.close();
  await waitingContext.close();
  await tvContext.close();
  await browser.close();

  await writeFile(join(output, "capture-index.json"), JSON.stringify({ captures, errors, timings }, null, 2), "utf8");
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({ output, screenshots: captures.length, timings }, null, 2));
}

await main();
