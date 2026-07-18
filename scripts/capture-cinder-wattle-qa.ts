import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function joinPlayer(context: BrowserContext, session: SessionResponse, origin: string, name: string, operative: string, capture?: string) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: /Join Game/i }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  const operativeButton = page.getByRole("button", { name: new RegExp(operative, "i") });
  await operativeButton.scrollIntoViewIfNeeded();
  if (capture) await page.screenshot({ path: capture, fullPage: false });
  await operativeButton.click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth;
  return { page, auth };
}

async function main(): Promise<void> {
  const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const origin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "cinder-wattle");
  await mkdir(join(output, "phone"), { recursive: true });
  await mkdir(join(output, "tv"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const errors: string[] = [];
  const watch = (page: Page) => {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  };
  try {
    const session = await postJson<SessionResponse>(`${api}/api/session/create`, {
      sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: 3
    });
    const first = await joinPlayer(contexts[0]!, session, origin, "Joel", "Cinder Wattle", join(output, "phone", "character-selection-390x844.png"));
    const second = await joinPlayer(contexts[1]!, session, origin, "Mara", "Bjornis");
    const third = await joinPlayer(contexts[2]!, session, origin, "Liv", "Deepdale");
    [first.page, second.page, third.page].forEach(watch);
    await first.page.getByRole("button", { name: "Start Game" }).click();

    const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const tv = await tvContext.newPage();
    watch(tv);
    await tv.addInitScript(({ token }) => localStorage.setItem("ashenreach-tv-host-token", token), { token: session.hostToken });
    await tv.goto(`${origin}/tv?room=${session.roomCode}`);
    await tv.getByTestId("tv-command-main").waitFor();

    const seed = async (auth: Auth, stage: string, kind = "cinder-wattle") => postJson(`${api}/api/qa/phase1-fixture`, {
      roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind, stage }
    });
    const capturePhone = async (stage: string, filename: string, page = first.page) => {
      await seed(first.auth, stage);
      await page.waitForTimeout(120);
      await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
      const width = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth));
      if (width > 390) throw new Error(`${filename} overflows at ${width}px`);
      await page.screenshot({ path: join(output, "phone", `${filename}-390x844.png`), fullPage: false });
    };

    await seed(first.auth, "player-card");
    await first.page.getByRole("button", { name: /show tabs/i }).click();
    await first.page.getByRole("tab", { name: "Player Card", exact: true }).click();
    await first.page.waitForTimeout(120);
    await first.page.screenshot({ path: join(output, "phone", "player-card-390x844.png"), fullPage: false });
    await capturePhone("ability-available", "ability-available");
    await capturePhone("ability-prepared", "ability-activated");
    await capturePhone("ability-used", "ability-unavailable-after-use");
    await capturePhone("battle-result", "battle-calculation");
    await capturePhone("hazard-result", "hazard-calculation");

    await seed(second.auth, "helper-pending", "cooperative-assistance");
    await first.page.getByTestId("cooperative-assistance-panel").waitFor();
    await first.page.screenshot({ path: join(output, "phone", "cooperative-assistance-contribution-390x844.png"), fullPage: false });

    await seed(first.auth, "ability-prepared");
    await tv.waitForTimeout(120);
    await tv.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await tv.screenshot({ path: join(output, "tv", "operative-card-1920x1080.png"), fullPage: false });
    await tv.emulateMedia({ reducedMotion: "reduce" });
    await tv.screenshot({ path: join(output, "tv", "ability-activation-reduced-motion-1920x1080.png"), fullPage: false });

    if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
    console.log(`Captured Cinder Wattle QA in ${output}`);
  } finally {
    await browser.close();
  }
}

await main();
