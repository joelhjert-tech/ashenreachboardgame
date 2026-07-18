import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

const output = resolve("reports", "ui", "admin-map-inspector");

async function verifyAndCapture(page: Page, filename: string): Promise<void> {
  await page.waitForTimeout(240);
  const metrics = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    surfaceWidth: document.querySelector<HTMLElement>(".admin-map")?.scrollWidth ?? 0,
    boardTileCount: document.querySelectorAll("[data-map-tile]").length,
    canvasCount: document.querySelectorAll("canvas").length,
    inspectorOverflow: (() => {
      const inspector = document.querySelector<HTMLElement>(".admin-map-inspector-scroll");
      return inspector ? inspector.scrollHeight - inspector.clientHeight : 0;
    })()
  }));
  if (Math.max(metrics.documentWidth, metrics.surfaceWidth) > metrics.viewportWidth) {
    throw new Error(`${filename} has horizontal overflow: ${JSON.stringify(metrics)}`);
  }
  if (metrics.boardTileCount !== 49) throw new Error(`${filename} rendered ${metrics.boardTileCount} map tiles`);
  if (metrics.canvasCount !== 0) throw new Error(`${filename} unexpectedly rendered a canvas`);
  await page.screenshot({ path: join(output, filename), fullPage: false });
  console.log(JSON.stringify({ filename, ...metrics }));
}

async function selectTile(page: Page, query: string, tileId: string): Promise<void> {
  await page.getByLabel("Search map archive").fill(query);
  await page.getByRole("listbox", { name: "Map search results" }).getByRole("button", { name: new RegExp(tileId, "i") }).click();
}

async function openView(page: Page, name: RegExp): Promise<void> {
  await page.getByRole("navigation", { name: "Map inspector controls" }).getByRole("button", { name }).click();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://127.0.0.1:5173/tv?admin=map");
  await page.waitForLoadState("networkidle");
  await page.getByRole("region", { name: "Admin map inspector" }).waitFor();
  await verifyAndCapture(page, "artwork-full-board-1920x1080.png");

  await selectTile(page, "ashen chapel", "ashen-chapel");
  await verifyAndCapture(page, "selected-tile-1920x1080.png");

  await openView(page, /connections view/i);
  await verifyAndCapture(page, "connection-view-1920x1080.png");

  await openView(page, /movement test/i);
  await page.getByLabel("Movement distance").fill("3");
  await verifyAndCapture(page, "movement-route-1920x1080.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await openView(page, /content view/i);
  await verifyAndCapture(page, "content-view-1440x900.png");

  await openView(page, /image audit/i);
  await verifyAndCapture(page, "image-audit-1440x900.png");

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: /fit board/i }).click();
  await verifyAndCapture(page, "fitted-board-1280x720.png");

  await selectTile(page, "center_cinder_gate", "center_cinder_gate");
  await verifyAndCapture(page, "long-content-1280x720.png");

  await page.goto("http://127.0.0.1:5173/tv?admin=map&mapAuditFixture=warnings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("region", { name: "Admin map inspector" }).waitFor();
  await verifyAndCapture(page, "audit-warnings-1280x720.png");

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
}

void main();
