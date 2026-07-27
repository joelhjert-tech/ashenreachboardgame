import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

const output = resolve("reports", "ui", "admin-library");
const clientOrigin = process.env.ASHEN_REACH_QA_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const apiOrigin = process.env.ASHEN_REACH_QA_API_ORIGIN ?? "http://127.0.0.1:8080";

async function createRoom(): Promise<{ roomCode: string; hostToken: string }> {
  const response = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionMode: "single-player", scenarioId: "scenario_broken_seal" })
  });
  if (!response.ok) throw new Error(`Room creation failed: ${response.status} ${await response.text()}`);
  return await response.json() as { roomCode: string; hostToken: string };
}

async function verifyAndCapture(page: Page, filename: string): Promise<void> {
  await page.waitForTimeout(180);
  const metrics = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    libraryWidth: document.querySelector<HTMLElement>(".admin-library")?.scrollWidth ?? 0,
    inspectorClientHeight: document.querySelector<HTMLElement>(".admin-library-inspector-scroll")?.clientHeight ?? 0,
    inspectorScrollHeight: document.querySelector<HTMLElement>(".admin-library-inspector-scroll")?.scrollHeight ?? 0,
    canvasCount: document.querySelectorAll("canvas").length
  }));
  if (Math.max(metrics.documentWidth, metrics.libraryWidth) > metrics.viewportWidth) {
    throw new Error(`${filename} has horizontal overflow: ${JSON.stringify(metrics)}`);
  }
  if (metrics.canvasCount !== 0) throw new Error(`${filename} unexpectedly rendered a canvas`);
  await page.screenshot({ path: join(output, filename), fullPage: false });
  console.log(JSON.stringify({ filename, ...metrics }));
}

async function searchAndSelect(page: Page, query: string, cardName: RegExp): Promise<void> {
  const search = page.getByLabel("Search archive");
  await search.fill(query);
  await page.getByRole("button", { name: cardName }).first().click();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const room = await createRoom();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, room);
  await page.goto(`${clientOrigin}/tv?room=${room.roomCode}&admin=library`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("region", { name: "Admin card library" }).waitFor();
  await verifyAndCapture(page, "library-overview-1920x1080.png");

  await searchAndSelect(page, "ash-choir-crusader", /Ash Choir Crusader/i);
  await verifyAndCapture(page, "selected-card-inspection-1920x1080.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /Clear Filters/i }).click();
  const filters = page.getByRole("navigation", { name: "Library filters" });
  await filters.getByRole("button").filter({ hasText: /^Threat/ }).click();
  await filters.locator("label").filter({ hasText: /^Skill/ }).locator("select").selectOption("signal");
  await verifyAndCapture(page, "filtered-card-grid-1440x900.png");

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: /Clear Filters/i }).click();
  await searchAndSelect(page, "escalation-ridge-suture", /Ridge Suture Litany/i);
  await verifyAndCapture(page, "selected-long-lore-1280x720.png");

  await page.getByRole("button", { name: /Clear Filters/i }).click();
  await searchAndSelect(page, "ash porter", /Ash Porter/i);
  await verifyAndCapture(page, "missing-metadata-artwork-1280x720.png");

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
}

void main();
