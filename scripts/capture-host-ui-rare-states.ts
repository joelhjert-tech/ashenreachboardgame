import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }

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
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 4
  });
}

async function joinPlayer(
  context: BrowserContext,
  session: SessionResponse,
  clientOrigin: string,
  displayName: string,
  operativeName: string
): Promise<{ page: Page; auth: Auth }> {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(displayName);
  await page.getByRole("button", { name: /Join as Host Phone/i }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(operativeName, "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Phone auth was not stored for ${displayName}`);
  return { page, auth };
}

async function seed(apiOrigin: string, auth: Auth, stage: string): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "host-rare", stage }
  });
}

async function assertPublicSafe(page: Page, state: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    rootWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    canvasCount: document.querySelectorAll("canvas").length,
    text: document.body.innerText
  }));
  if (Math.max(metrics.bodyWidth, metrics.rootWidth) > metrics.viewportWidth) {
    throw new Error(`${state} horizontal overflow: ${JSON.stringify(metrics)}`);
  }
  if (metrics.canvasCount !== 0) throw new Error(`${state} unexpectedly rendered ${metrics.canvasCount} canvas elements`);
  if (/pendingEffects|reactionId|sourceEventId|Private agenda|Rivalry target|Choose one Artifact/i.test(metrics.text)) {
    throw new Error(`${state} leaked owner-private information`);
  }
}

async function capture(page: Page, output: string, state: string, bothViewports = true): Promise<void> {
  await page.getByTestId("tv-command-main").waitFor();
  const targets = bothViewports ? viewports : viewports.slice(0, 1);
  for (const viewport of targets) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(180);
    await assertPublicSafe(page, `${state}-${viewport.name}`);
    await page.screenshot({ path: join(output, `${state}-${viewport.name}.png`), fullPage: false });
  }
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "host-ui-qa", "rare-states");
  await mkdir(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const phoneContexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  const tvContext = await browser.newContext({ viewport: viewports[0] });
  const tv = await tvContext.newPage();
  tv.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  tv.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    const session = await createSession(apiOrigin);
    const operativeNames = ["Bjornis", "Brask Ode", "Deepdale", "Dessa Korr"];
    const joined: Array<{ page: Page; auth: Auth }> = [];
    for (let index = 0; index < phoneContexts.length; index += 1) {
      joined.push(await joinPlayer(phoneContexts[index]!, session, clientOrigin, `QA Seat ${index + 1}`, operativeNames[index]!));
    }
    await joined[0]!.page.getByRole("button", { name: "Start Game" }).click();
    await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
    await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}&qaNetworkControls=1`);
    await tv.getByTestId("tv-command-main").waitFor();

    const auth = joined[0]!.auth;
    await seed(apiOrigin, auth, "stacked-operatives");
    await tv.getByLabel(/4 operatives on Anchor Market/i).waitFor();
    await capture(tv, output, "stacked-operatives");
    const markerOrder = await tv.getByLabel(/4 operatives on Anchor Market/i).locator("[data-testid^=token-seat-]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    if (markerOrder.join(",") !== "token-seat-1,token-seat-2,token-seat-3,token-seat-4") throw new Error(`Unstable stacked marker order: ${markerOrder}`);

    await seed(apiOrigin, auth, "reaction-pending");
    await tv.getByTestId("tv-rare-state-panel").getByText("Reaction pending", { exact: true }).waitFor();
    await capture(tv, output, "reaction-stage-pending", false);

    await tv.reload();
    await tv.getByTestId("tv-rare-state-panel").getByText("Reaction pending", { exact: true }).waitFor();
    await capture(tv, output, "reaction-reconnect", false);

    await tv.emulateMedia({ reducedMotion: "reduce" });
    await capture(tv, output, "reduced-motion-reaction", false);
    await tv.emulateMedia({ reducedMotion: "no-preference" });

    await seed(apiOrigin, auth, "reaction-final");
    await tv.getByText(/Suture Storm resolved/i).first().waitFor();
    await capture(tv, output, "reaction-stage-final", false);

    await seed(apiOrigin, auth, "recall-triggered");
    await tv.getByText(/Recalled/i).first().waitFor();
    await capture(tv, output, "recall-triggered", false);

    await seed(apiOrigin, auth, "scar-pending");
    await tv.getByTestId("tv-rare-state-panel").getByText("Scar consequence pending", { exact: true }).waitFor();
    await capture(tv, output, "scar-pending", false);

    await seed(apiOrigin, auth, "scar-resolved");
    await tv.getByText(/Static Burn/i).first().waitFor();
    await capture(tv, output, "scar-resolved", false);

    await tv.evaluate(() => window.dispatchEvent(new Event("ashenreach:qa-disconnect")));
    await tv.getByTestId("tv-network-overlay").waitFor();
    await capture(tv, output, "server-unavailable", false);
    await tv.getByTestId("tv-network-overlay").getByText("Reconnecting to game server", { exact: true }).waitFor({ timeout: 5000 });
    await capture(tv, output, "server-recovering", false);
    await tv.getByTestId("tv-network-overlay").waitFor({ state: "detached", timeout: 10000 });
    await capture(tv, output, "server-restored", false);

    if (consoleErrors.length > 0) throw new Error(`Console errors:\n${consoleErrors.join("\n")}`);
    console.log(JSON.stringify({ output, states: 11, screenshots: 12, markerOrder, consoleErrors: 0 }, null, 2));
  } finally {
    await Promise.all(phoneContexts.map((context) => context.close()));
    await tvContext.close();
    await browser.close();
  }
}

await main();
