import { mkdir, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

interface Session { roomCode: string; hostToken: string }

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "p20-host-tv-motion");
const recordings = join(output, "recordings");
const viewports = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 }
] as const;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function joinPlayer(context: BrowserContext, session: Session, name: string, operative: string): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: new RegExp(operative, "i") }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  return page;
}

async function main(): Promise<void> {
  await mkdir(recordings, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const tvContext = await browser.newContext({
    viewport: viewports[2],
    recordVideo: { dir: recordings, size: { width: 1920, height: 1080 } }
  });
  const phoneContexts = await Promise.all(Array.from({ length: 6 }, () => browser.newContext()));
  const tv = await tvContext.newPage();
  const errors: string[] = [];
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  tv.on("pageerror", (error) => errors.push(error.message));

  try {
    const session = await postJson<Session>(`${apiOrigin}/api/session/create`, {
      sessionMode: "multiplayer",
      interactionMode: "co-op",
      gameMode: "standard",
      playerCount: 6
    });
    const names = ["Ari", "Bex", "Cato", "Dara", "Eli", "Fara"];
    const operatives = ["Bjornis", "Brask Ode", "Deepdale", "Dessa Korr", "Cinder Wattle", "Joss Var"];
    const phones: Page[] = [];
    for (let index = 0; index < 6; index += 1) {
      phones.push(await joinPlayer(phoneContexts[index]!, session, names[index]!, operatives[index]!));
    }
    await phones[0]!.getByRole("button", { name: "Start Game" }).click();
    await tv.addInitScript(({ token }) => localStorage.setItem("ashen-reach-tv-host-token", token), { token: session.hostToken });
    await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
    await tv.getByTestId("tv-command-main").waitFor();
    await tv.getByLabel("Operatives").locator(".tv-operative-card").nth(5).waitFor();
    await tv.waitForTimeout(1400);

    for (const viewport of viewports) {
      await tv.setViewportSize({ width: viewport.width, height: viewport.height });
      const metrics = await tv.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: document.documentElement.clientHeight,
        scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        cards: document.querySelectorAll(".tv-operative-card").length
      }));
      if (metrics.scrollWidth > metrics.width || metrics.scrollHeight > metrics.height || metrics.cards !== 6) {
        throw new Error(`Six-player ${viewport.name} failed: ${JSON.stringify(metrics)}`);
      }
      await tv.screenshot({ path: join(output, `28-six-player-host-${viewport.name}.png`), fullPage: false });
    }
    await tv.waitForTimeout(1600);
    if (errors.length > 0) throw new Error(errors.join("\n"));
  } finally {
    const videoPath = await tv.video()?.path();
    await Promise.all(phoneContexts.map((context) => context.close()));
    await tvContext.close();
    if (videoPath) await rename(videoPath, join(recordings, "13-six-player-sequence.webm"));
    await browser.close();
  }
}

await main();
