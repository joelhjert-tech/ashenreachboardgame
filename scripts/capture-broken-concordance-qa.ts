import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
type AssistanceStage = "active-selector" | "helper-pending" | "one-accepted" | "two-accepted" | "result" | "scenario-node";

const tvViewports = [
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
  await page.getByRole("button", { name: /Join Game/i }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(operativeName, "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error(`Phone auth was not stored for ${displayName}`);
  return { page, auth };
}

async function seed(apiOrigin: string, auth: Auth, stage: AssistanceStage): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "cooperative-assistance", stage }
  });
}

async function assertPhone(page: Page, state: string): Promise<void> {
  await page.locator(".phone-assistance-shell").waitFor();
  const metrics = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: innerWidth,
    text: document.body.innerText
  }));
  if (metrics.width > metrics.viewport) throw new Error(`${state} horizontal overflow: ${metrics.width} > ${metrics.viewport}`);
  if (/pendingEffects|sourceEventId|private mission|artifact choices/i.test(metrics.text)) {
    throw new Error(`${state} leaked internal or owner-private data`);
  }
}

async function assertTv(page: Page, state: string): Promise<void> {
  await page.getByTestId("tv-command-main").waitFor();
  const metrics = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: innerWidth,
    text: document.body.innerText
  }));
  if (metrics.width > metrics.viewport) throw new Error(`${state} horizontal overflow: ${metrics.width} > ${metrics.viewport}`);
  if (/Accept help|Decline help|private mission|artifact choices|pendingEffects/i.test(metrics.text)) {
    throw new Error(`${state} leaked phone controls or owner-private data`);
  }
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "broken-concordance");
  await mkdir(join(output, "phone"), { recursive: true });
  await mkdir(join(output, "tv"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const phoneContexts = await Promise.all(Array.from({ length: 3 }, () => browser.newContext()));
  const tvContext = await browser.newContext({ viewport: tvViewports[0] });
  const errors: string[] = [];
  const watch = (page: Page): void => {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  };

  try {
    const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, {
      sessionMode: "multiplayer",
      interactionMode: "co-op",
      gameMode: "standard",
      playerCount: 3,
      scenarioId: "scenario_broken_concordance"
    });
    const names = ["Mara", "Jonas", "Liv"];
    const operatives = ["Bjornis", "Brask Ode", "Deepdale"];
    const joined: Array<{ page: Page; auth: Auth }> = [];
    for (let index = 0; index < 3; index += 1) {
      const result = await joinPlayer(phoneContexts[index]!, session, clientOrigin, names[index]!, operatives[index]!);
      watch(result.page);
      joined.push(result);
    }
    await joined[0]!.page.getByRole("button", { name: "Start Game" }).click();

    const tv = await tvContext.newPage();
    watch(tv);
    await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: session.hostToken });
    await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
    await tv.getByTestId("tv-command-main").waitFor();

    const capturePhone = async (page: Page, filename: string): Promise<void> => {
      await assertPhone(page, filename);
      await page.screenshot({ path: join(output, "phone", `${filename}-390x844.png`), fullPage: false });
    };
    const captureTv = async (filename: string, reducedMotion = false): Promise<void> => {
      await tv.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
      for (const viewport of tvViewports) {
        await tv.setViewportSize(viewport);
        await assertTv(tv, `${filename}-${viewport.name}`);
        await tv.screenshot({ path: join(output, "tv", `${filename}-${viewport.name}${reducedMotion ? "-reduced-motion" : ""}.png`), fullPage: false });
      }
    };

    await seed(apiOrigin, joined[0]!.auth, "active-selector");
    await joined[0]!.page.getByRole("button", { name: /Ask for Help/i }).click();
    await capturePhone(joined[0]!.page, "active-helper-selector");

    await seed(apiOrigin, joined[0]!.auth, "helper-pending");
    await capturePhone(joined[0]!.page, "active-two-helpers-pending");
    await capturePhone(joined[1]!.page, "requested-helper-accept-decline");
    await capturePhone(joined[2]!.page, "requested-helper-second-seat");
    await captureTv("assistance-requested");

    await seed(apiOrigin, joined[0]!.auth, "one-accepted");
    await capturePhone(joined[0]!.page, "active-one-helper-accepted");
    await capturePhone(joined[1]!.page, "helper-accepted");
    await captureTv("one-helper-accepted");

    await seed(apiOrigin, joined[0]!.auth, "two-accepted");
    await capturePhone(joined[0]!.page, "active-ready-to-roll");
    await captureTv("two-helper-calculation");
    await captureTv("two-helper-calculation", true);

    await seed(apiOrigin, joined[0]!.auth, "result");
    await capturePhone(joined[0]!.page, "assisted-result-breakdown");
    await captureTv("assisted-battle-result");

    await seed(apiOrigin, joined[0]!.auth, "scenario-node");
    await capturePhone(joined[0]!.page, "scenario-node-stabilization");
    await captureTv("scenario-node-stabilization");

    if (errors.length > 0) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
    console.log(`Captured cooperative assistance QA in ${output}`);
  } finally {
    await browser.close();
  }
}

void main();
