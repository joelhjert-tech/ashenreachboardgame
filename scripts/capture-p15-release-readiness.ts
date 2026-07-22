import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
interface FixtureResult { ok: true; sequence: number }
interface CaptureRecord {
  filename: string;
  state: string;
  surface: "phone" | "waiting-phone" | "host";
  viewport: string;
  sequence: number;
  horizontalOverflow: number;
  requiredControlClipping: number;
  minimumControlSize: number;
  undersizedControls: Array<{ label: string; className: string; width: number; height: number }>;
  reducedMotion: boolean;
}
interface PageTelemetry {
  latestSequence: number;
  frames: string[];
  consoleErrors: string[];
  websocketCount: number;
  closedWebsockets: number;
  imageRequests: Map<string, number>;
}

const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("docs", "qa", "p15-release-readiness");
const telemetry = new WeakMap<Page, PageTelemetry>();
const captures: CaptureRecord[] = [];
const privacyFindings: string[] = [];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function addResourceInstrumentation(context: BrowserContext): Promise<void> {
  await context.addInitScript({ content: `(() => {
    const metrics = { timeouts: new Set(), intervals: new Set(), animationFrames: new Set(), listenerAdds: 0, listenerRemoves: 0 };
    Object.defineProperty(window, "__p15ResourceMetrics", { value: metrics, configurable: false });
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    const nativeSetInterval = window.setInterval.bind(window);
    const nativeClearInterval = window.clearInterval.bind(window);
    const nativeRaf = window.requestAnimationFrame.bind(window);
    const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    window.setTimeout = (handler, delay, ...args) => {
      let id = 0;
      const wrapped = (...callbackArgs) => {
        metrics.timeouts.delete(id);
        if (typeof handler === "function") handler(...callbackArgs);
      };
      id = nativeSetTimeout(wrapped, delay, ...args);
      metrics.timeouts.add(id);
      return id;
    };
    window.clearTimeout = (id) => { if (id !== undefined) metrics.timeouts.delete(id); nativeClearTimeout(id); };
    window.setInterval = (handler, delay, ...args) => { const id = nativeSetInterval(handler, delay, ...args); metrics.intervals.add(id); return id; };
    window.clearInterval = (id) => { if (id !== undefined) metrics.intervals.delete(id); nativeClearInterval(id); };
    window.requestAnimationFrame = (callback) => {
      let id = 0;
      id = nativeRaf((time) => { metrics.animationFrames.delete(id); callback(time); });
      metrics.animationFrames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => { metrics.animationFrames.delete(id); nativeCancelRaf(id); };
    EventTarget.prototype.addEventListener = function (...args) { metrics.listenerAdds += 1; return nativeAdd.apply(this, args); };
    EventTarget.prototype.removeEventListener = function (...args) { metrics.listenerRemoves += 1; return nativeRemove.apply(this, args); };
  })();` });
}

function watch(page: Page): PageTelemetry {
  const entry: PageTelemetry = {
    latestSequence: -1,
    frames: [],
    consoleErrors: [],
    websocketCount: 0,
    closedWebsockets: 0,
    imageRequests: new Map()
  };
  telemetry.set(page, entry);
  page.on("console", (message) => {
    if (message.type() === "error" && !/blocked call to navigator\.vibrate/i.test(message.text())) {
      entry.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => entry.consoleErrors.push(error.message));
  page.on("request", (request) => {
    if (request.resourceType() === "image") {
      entry.imageRequests.set(request.url(), (entry.imageRequests.get(request.url()) ?? 0) + 1);
    }
  });
  page.on("websocket", (socket) => {
    entry.websocketCount += 1;
    socket.on("framereceived", ({ payload }) => {
      const value = typeof payload === "string" ? payload : payload.toString();
      entry.frames.push(value);
      try {
        const envelope = JSON.parse(value) as { type?: string; sequence?: number };
        if (envelope.type === "STATE_PATCH" && typeof envelope.sequence === "number") {
          entry.latestSequence = Math.max(entry.latestSequence, envelope.sequence);
        }
      } catch {
        // Non-JSON frames are retained for the final privacy report.
      }
    });
    socket.on("close", () => { entry.closedWebsockets += 1; });
  });
  return entry;
}

async function gotoWhenClientReady(page: Page, url: string, expectedText: RegExp): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError: unknown = null;
  let lastBody = "";
  while (Date.now() < deadline) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 10_000 });
      lastBody = await page.locator("body").innerText().catch(() => "");
      if (expectedText.test(lastBody)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Client did not become ready at ${url}. Body: ${lastBody.slice(0, 500)}. Console: ${(telemetry.get(page)?.consoleErrors ?? []).join(" | ")}`, { cause: lastError });
}

async function joinPhone(page: Page, roomCode: string, displayName: string, operative: RegExp): Promise<Auth> {
  await gotoWhenClientReady(page, `${client}/?room=${roomCode}&resetAuth=1&qaNetworkControls=1`, /Player name/i);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: operative }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Missing auth for ${displayName}`);
  await page.evaluate((code) => window.history.replaceState(null, "", `/?room=${code}&qaNetworkControls=1`), roomCode);
  return auth;
}

async function createCoop(browser: Browser): Promise<{
  session: SessionResponse;
  owner: Page;
  guest: Page;
  tv: Page;
  auth: Auth;
  contexts: BrowserContext[];
}> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 2
  });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await Promise.all([addResourceInstrumentation(ownerContext), addResourceInstrumentation(guestContext), addResourceInstrumentation(tvContext)]);
  const owner = await ownerContext.newPage();
  const guest = await guestContext.newPage();
  const tv = await tvContext.newPage();
  watch(owner); watch(guest); watch(tv);
  const auth = await joinPhone(owner, session.roomCode, "ReleaseOwner", /Bjornis/i);
  await joinPhone(guest, session.roomCode, "ReleaseWaiting", /Deepdale/i);
  await owner.getByRole("button", { name: "Start Game" }).click();
  await owner.getByTestId("phone-required-action-shell").waitFor({ timeout: 10_000 });
  await tv.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, session);
  await gotoWhenClientReady(tv, `${client}/tv?room=${session.roomCode}`, /Ashen Reach|Win Progression|Room Code/i);
  return { session, owner, guest, tv, auth, contexts: [ownerContext, guestContext, tvContext] };
}

async function seed(page: Page, auth: Auth, fixture: unknown): Promise<number> {
  const result = await post<FixtureResult>("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode, seatToken: auth.seatToken, fixture
  });
  const entry = telemetry.get(page);
  if (!entry) throw new Error("Missing page telemetry");
  const deadline = Date.now() + 5_000;
  while (entry.latestSequence < result.sequence && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  if (entry.latestSequence < result.sequence) {
    throw new Error(`Semantic wait timed out: projection ${entry.latestSequence}, fixture ${result.sequence}`);
  }
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"), undefined, { timeout: 3_000 }).catch(() => undefined);
  return result.sequence;
}

async function waitForProjectionAfter(page: Page, previousSequence: number): Promise<number> {
  const entry = telemetry.get(page);
  if (!entry) throw new Error("Missing page telemetry");
  const deadline = Date.now() + 5_000;
  while (entry.latestSequence <= previousSequence && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  if (entry.latestSequence <= previousSequence) {
    throw new Error(`Reconnect did not deliver a newer projection after ${previousSequence}; latest ${entry.latestSequence}`);
  }
  return entry.latestSequence;
}

async function capture(page: Page, surface: CaptureRecord["surface"], state: string, width: number, height: number, sequence: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => document.scrollingElement?.scrollTo(0, 0));
  const metrics = await page.evaluate(() => {
    const actionable = Array.from(document.querySelectorAll<HTMLElement>("button:not([disabled]), [role=button]:not([aria-disabled=true]), input, select"))
      .filter((element) => element.offsetParent !== null && element.closest("[inert]") === null);
    const required = actionable.filter((element) => /roll|confirm|continue|choose|select|buy|end turn|return to lobby|leave room/i.test(element.innerText || element.getAttribute("aria-label") || ""));
    const clipped = required.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top < 0 || rect.left < 0 || rect.right > innerWidth || rect.bottom > innerHeight;
    });
    const controlSizes = actionable.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: (element.innerText || element.getAttribute("aria-label") || element.tagName).trim().slice(0, 80),
        className: element.className,
        width: rect.width,
        height: rect.height
      };
    });
    const sizes = controlSizes.map(({ width, height }) => Math.min(width, height));
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      requiredControlClipping: clipped.length,
      minimumControlSize: sizes.length ? Math.min(...sizes) : 44,
      undersizedControls: controlSizes.filter(({ width, height }) => width < 44 || height < 44),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  });
  if (metrics.horizontalOverflow > 0 || metrics.requiredControlClipping > 0 || metrics.undersizedControls.length > 0) {
    throw new Error(`${surface}/${state}/${width}x${height} overflow=${metrics.horizontalOverflow} clipped=${metrics.requiredControlClipping} undersized=${JSON.stringify(metrics.undersizedControls)}`);
  }
  const directory = join(output, surface);
  await mkdir(directory, { recursive: true });
  const filename = `${state}-${width}x${height}.png`;
  await page.screenshot({ path: join(directory, filename), fullPage: false });
  captures.push({ filename, state, surface, viewport: `${width}x${height}`, sequence, ...metrics });
}

async function captureFixture(page: Page, auth: Auth, surface: CaptureRecord["surface"], state: string, fixture: unknown, viewports: readonly (readonly [number, number])[]): Promise<void> {
  const sequence = await seed(page, auth, fixture);
  for (const [width, height] of viewports) await capture(page, surface, state, width, height, sequence);
}

async function recordFlow(browser: Browser, auth: Auth, name: string, fixtures: unknown[], reducedMotion = false, reconnectAt = -1): Promise<void> {
  const directory = join(output, "recordings");
  await mkdir(directory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, reducedMotion: reducedMotion ? "reduce" : "no-preference",
    recordVideo: { dir: join(directory, "raw"), size: { width: 390, height: 844 } }
  });
  await context.addInitScript((value) => localStorage.setItem("ashenreach.controllerSession", JSON.stringify(value)), auth);
  const page = await context.newPage();
  watch(page);
  await gotoWhenClientReady(page, `${client}/?room=${auth.roomCode}&qaNetworkControls=1`, /YOUR TURN|WAITING|BJORNIS|Required/i);
  for (const [index, fixture] of fixtures.entries()) {
    await seed(page, auth, fixture);
    if (index === reconnectAt) {
      await page.evaluate(() => window.dispatchEvent(new Event("ashenreach:qa-disconnect")));
      await page.getByText(/reconnecting|connected/i).first().waitFor({ timeout: 5_000 }).catch(() => undefined);
    }
  }
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Missing recording ${name}`);
  await video.saveAs(join(directory, `${name}.webm`));
  await context.close();
}

async function resourceSnapshot(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const value = (window as unknown as { __p15ResourceMetrics: { timeouts: Set<number>; intervals: Set<number>; animationFrames: Set<number>; listenerAdds: number; listenerRemoves: number } }).__p15ResourceMetrics;
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return {
      domNodes: document.querySelectorAll("*").length,
      timeouts: value.timeouts.size,
      intervals: value.intervals.size,
      animationFrames: value.animationFrames.size,
      listenerBalance: value.listenerAdds - value.listenerRemoves,
      heapBytes: memory?.usedJSHeapSize ?? -1
    };
  });
}

function inspectPrivacy(page: Page, surface: "tv" | "waiting-phone"): void {
  const entry = telemetry.get(page);
  if (!entry) throw new Error("Missing privacy telemetry");
  const forbiddenKeys = surface === "tv"
    ? [/"seatToken"\s*:/i, /"joinToken"\s*:/i, /"hostToken"\s*:/i, /"private"\s*:/i, /"heldGear"\s*:/i, /"startingContractOptions"\s*:/i]
    : [/"seatToken"\s*:\s*"(?!)/i, /"hostToken"\s*:/i];
  for (const frame of entry.frames) {
    for (const pattern of forbiddenKeys) {
      if (pattern.test(frame)) privacyFindings.push(`${surface} frame matched ${pattern}`);
    }
  }
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const coop = await createCoop(browser);
  const phoneViews = [[360, 800], [390, 844], [430, 932]] as const;
  const tvViews = [[1366, 768], [1600, 900], [1920, 1080]] as const;
  const before = await resourceSnapshot(coop.owner);

  const phoneStates: Array<[string, unknown]> = [
    ["first-roll", { kind: "phone-movement", stage: "roll-required" }],
    ["movement-selection", { kind: "phone-movement", stage: "four-routes" }],
    ["arrival", { kind: "tile-arrival", stage: "multi-effect" }],
    ["battle-result", { kind: "phone-battle", stage: "rolled-result" }],
    ["private-choice-owner", { kind: "waiting-handoff", stage: "private-choice" }],
    ["shop-purchase", { kind: "host-shop", stage: "equipment" }],
    ["relevant-now", { kind: "inventory-player-card", stage: "relevant-many" }],
    ["contract-progress", { kind: "objective-presentation", stage: "contract-near" }],
    ["locked-agenda", { kind: "objective-presentation", stage: "agenda-locked" }],
    ["progress-warning", { kind: "progression-endgame", stage: "critical" }],
    ["final-stage", { kind: "progression-endgame", stage: "final-stage" }],
    ["victory", { kind: "progression-endgame", stage: "coop-victory" }],
    ["defeat", { kind: "progression-endgame", stage: "coop-defeat" }]
  ];
  for (const [state, fixture] of phoneStates) await captureFixture(coop.owner, coop.auth, "phone", state, fixture, phoneViews);

  await seed(coop.owner, coop.auth, { kind: "progression-endgame", stage: "early-progress" });
  await captureFixture(coop.tv, coop.auth, "host", "public-safe-tv", { kind: "waiting-handoff", stage: "private-choice" }, tvViews);
  const hostStates: Array<[string, unknown]> = [
    ["battle-result", { kind: "phone-battle", stage: "rolled-result" }],
    ["progress-warning", { kind: "progression-endgame", stage: "critical" }],
    ["final-stage", { kind: "progression-endgame", stage: "final-stage" }],
    ["victory", { kind: "progression-endgame", stage: "coop-victory" }],
    ["defeat", { kind: "progression-endgame", stage: "coop-defeat" }]
  ];
  for (const [state, fixture] of hostStates) await captureFixture(coop.tv, coop.auth, "host", state, fixture, tvViews);
  await seed(coop.owner, coop.auth, { kind: "progression-endgame", stage: "early-progress" });
  await captureFixture(coop.guest, coop.auth, "waiting-phone", "public-safe-waiting-phone", { kind: "waiting-handoff", stage: "private-choice" }, [[390, 844]]);
  const waitingText = await coop.guest.locator("body").innerText();
  if (/choose one reward|private contract|agenda target|seat-1/i.test(waitingText)) privacyFindings.push("Waiting phone rendered owner-private choice data");

  const beforeReconnectSequence = await seed(coop.owner, coop.auth, { kind: "phone-battle", stage: "rolled-result" });
  await coop.owner.reload({ waitUntil: "networkidle" });
  const reconnectSequence = await waitForProjectionAfter(coop.owner, beforeReconnectSequence);
  await capture(coop.owner, "phone", "reconnect-restored", 390, 844, reconnectSequence);
  await coop.owner.emulateMedia({ reducedMotion: "reduce" });
  const reducedSequence = await seed(coop.owner, coop.auth, { kind: "phone-battle", stage: "rolled-result" });
  await capture(coop.owner, "phone", "reduced-motion-result", 390, 844, reducedSequence);
  await coop.owner.emulateMedia({ reducedMotion: "no-preference" });

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const fixture = iteration % 6 === 0
      ? { kind: "phone-battle", stage: "rolled-result" }
      : iteration % 5 === 0
        ? { kind: "host-shop", stage: "equipment" }
        : iteration % 3 === 0
          ? { kind: "inventory-player-card", stage: "relevant-many" }
          : { kind: "phone-movement", stage: "four-routes" };
    await seed(coop.owner, coop.auth, fixture);
    if ([5, 11, 17, 23, 29].includes(iteration)) {
      const beforeReload = telemetry.get(coop.owner)?.latestSequence ?? -1;
      await coop.owner.reload({ waitUntil: "networkidle" });
      await waitForProjectionAfter(coop.owner, beforeReload);
    }
  }
  const after = await resourceSnapshot(coop.owner);

  const recordings: Array<[string, unknown[], boolean?, number?]> = [
    ["setup-to-first-turn", [{ kind: "waiting-handoff", stage: "next-turn" }, { kind: "phone-movement", stage: "roll-required" }]],
    ["movement-to-battle", [{ kind: "phone-movement", stage: "four-routes" }, { kind: "movement-journey", stage: "ashen-chapel" }, { kind: "phone-battle", stage: "rolled-result" }]],
    ["shop-and-inventory", [{ kind: "host-shop", stage: "equipment" }, { kind: "inventory-player-card", stage: "relevant-many" }]],
    ["objective-progress-to-completion", [{ kind: "objective-presentation", stage: "contract-near" }, { kind: "objective-presentation", stage: "replacement" }]],
    ["final-stage-to-result", [{ kind: "progression-endgame", stage: "final-stage" }, { kind: "progression-endgame", stage: "coop-victory" }]],
    ["reconnect-complex-state", [{ kind: "phone-battle", stage: "battle-setup" }, { kind: "phone-battle", stage: "rolled-result" }], false, 0],
    ["turn-handoff", [{ kind: "waiting-handoff", stage: "end-turn" }, { kind: "waiting-handoff", stage: "handoff" }, { kind: "waiting-handoff", stage: "next-turn" }]],
    ["reduced-motion-turn", [{ kind: "phone-movement", stage: "roll-required" }, { kind: "phone-movement", stage: "confirmed" }, { kind: "phone-battle", stage: "rolled-result" }], true]
  ];
  for (const [name, fixtures, reducedMotion = false, reconnectAt = -1] of recordings) {
    await seed(coop.owner, coop.auth, { kind: "progression-endgame", stage: "early-progress" });
    await recordFlow(browser, coop.auth, name, fixtures, reducedMotion, reconnectAt);
  }

  inspectPrivacy(coop.tv, "tv");
  inspectPrivacy(coop.guest, "waiting-phone");
  const browserErrors = [...new Set([coop.owner, coop.guest, coop.tv].flatMap((page) => telemetry.get(page)?.consoleErrors ?? []))];
  const duplicateImages = [...(telemetry.get(coop.owner)?.imageRequests ?? new Map())].filter(([, count]) => count > 2);

  await Promise.all(coop.contexts.map((context) => context.close()));

  const sixSession = await post<SessionResponse>("/api/session/create", {
    sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 6
  });
  const sixPhoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addResourceInstrumentation(sixPhoneContext);
  const sixPhone = await sixPhoneContext.newPage();
  watch(sixPhone);
  const sixAuth = await joinPhone(sixPhone, sixSession.roomCode, "SixHost", /Bjornis/i);
  const setupSequence = await seed(sixPhone, sixAuth, { kind: "setup-flow", stage: "maximum-players" });
  for (const [width, height] of phoneViews) await capture(sixPhone, "phone", "setup-ready", width, height, setupSequence);
  await post("/api/session/start", { roomCode: sixSession.roomCode, hostToken: sixSession.hostToken });
  const sixTvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await addResourceInstrumentation(sixTvContext);
  const sixTv = await sixTvContext.newPage();
  watch(sixTv);
  await sixTv.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, sixSession);
  await gotoWhenClientReady(sixTv, `${client}/tv?room=${sixSession.roomCode}`, /Ashen Reach|Win Progression|Room Code/i);
  const sixSequence = await seed(sixTv, sixAuth, { kind: "host-rare", stage: "stacked-operatives" });
  for (const [width, height] of tvViews) await capture(sixTv, "host", "six-player-host", width, height, sixSequence);
  await Promise.all([sixPhoneContext.close(), sixTvContext.close()]);

  await writeFile(join(output, "capture-results.json"), JSON.stringify({
    captures,
    recordings: 8,
    browserErrors,
    privacyFindings,
    resourceSoak: { before, after },
    duplicateImages,
    unsupported: ["rematch", "draw result", "aggregate Rivalry ranking", "AI Nemesis seat", "spectator mode"]
  }, null, 2));
  await browser.close();
  if (browserErrors.length || privacyFindings.length) {
    throw new Error(`P15 browser audit failed: errors=${browserErrors.length} privacy=${privacyFindings.length}`);
  }
  console.log(JSON.stringify({ captures: captures.length, recordings: 8, browserErrors: 0, privacyFindings: 0, before, after }, null, 2));
}

await main();
