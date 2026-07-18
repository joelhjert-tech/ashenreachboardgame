import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

interface SessionResponse {
  roomCode: string;
  hostToken: string;
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "lobby-stage");
  await mkdir(output, { recursive: true });

  const response = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionMode: "multiplayer",
      interactionMode: "co-op",
      gameMode: "standard",
      playerCount: 4
    })
  });
  if (!response.ok) throw new Error(`Session creation failed: ${response.status} ${await response.text()}`);
  const session = await response.json() as SessionResponse;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ hostToken }) => localStorage.setItem("ashen-reach-tv-host-token", hostToken), {
    hostToken: session.hostToken
  });
  await page.goto(`${clientOrigin}/tv?room=${session.roomCode}`);
  await page.waitForLoadState("networkidle");
  await page.getByText(session.roomCode, { exact: true }).first().waitFor();

  const results: Array<Record<string, unknown>> = [];
  for (const viewport of [
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1366x768", width: 1366, height: 768 }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(180);
    const metrics = await page.evaluate(() => {
      const startup = document.querySelector<HTMLElement>(".tv-startup-screen");
      const card = document.querySelector<HTMLElement>(".tv-startup-card");
      const qr = document.querySelector<SVGElement>(".join-qr-card-full svg");
      return {
        viewportWidth: innerWidth,
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        backgroundImage: startup ? getComputedStyle(startup).backgroundImage : null,
        cardRect: card?.getBoundingClientRect().toJSON() ?? null,
        qrRect: qr?.getBoundingClientRect().toJSON() ?? null,
        canvasCount: document.querySelectorAll("canvas").length
      };
    });
    if (metrics.documentWidth > metrics.viewportWidth) throw new Error(`${viewport.name} has horizontal overflow`);
    if (!String(metrics.backgroundImage).includes("ashen-reach-lobby-stage.png")) throw new Error("Lobby art did not load");
    if (!metrics.qrRect) throw new Error("Lobby QR code was not visible");
    if (metrics.canvasCount !== 0) throw new Error("Lobby unexpectedly rendered a canvas");
    await page.screenshot({ path: join(output, `lobby-waiting-${viewport.name}.png`), fullPage: false });
    results.push({ viewport: viewport.name, ...metrics });
  }

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ roomCode: session.roomCode, screenshots: results }, null, 2));
}

void main();
