import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const output = path.resolve("reports/ui/admin-card-editor");
const clientOrigin = "http://127.0.0.1:5173";
const apiOrigin = "http://127.0.0.1:8080";

async function createRoom(): Promise<{ roomCode: string; hostToken: string }> {
  const response = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionMode: "single-player", scenarioId: "scenario_broken_seal" })
  });
  if (!response.ok) throw new Error(`Room creation failed: ${response.status} ${await response.text()}`);
  return await response.json() as { roomCode: string; hostToken: string };
}

async function capture(page: Page, fileName: string): Promise<void> {
  await page.waitForTimeout(100);
  const metrics = await page.evaluate(() => ({
    viewport: `${innerWidth}x${innerHeight}`,
    documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    editorWidth: document.querySelector<HTMLElement>(".admin-card-editor")?.scrollWidth ?? 0,
    editorClientHeight: document.querySelector<HTMLElement>(".admin-card-editor-scroll")?.clientHeight ?? 0,
    editorScrollHeight: document.querySelector<HTMLElement>(".admin-card-editor-scroll")?.scrollHeight ?? 0,
    canvasCount: document.querySelectorAll("canvas").length
  }));
  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (metrics.documentWidth > viewportWidth || metrics.editorWidth > viewportWidth) throw new Error(`${fileName}: horizontal overflow ${JSON.stringify(metrics)}`);
  if (metrics.canvasCount !== 0) throw new Error(`${fileName}: editor unexpectedly mounted canvas content`);
  await page.screenshot({ path: path.join(output, fileName), fullPage: false });
  console.log(JSON.stringify({ fileName, ...metrics }));
}

async function openEditor(page: Page, room: { roomCode: string; hostToken: string }): Promise<void> {
  await page.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, room);
  await page.goto(`${clientOrigin}/tv?room=${room.roomCode}&admin=library`);
  await page.getByRole("region", { name: "Admin card library" }).waitFor();
  await page.getByLabel("Search archive").fill("ash-choir-crusader");
  await page.getByRole("button", { name: /Ash Choir Crusader/i }).first().click();
  await page.getByRole("button", { name: "Edit card" }).waitFor();
  await page.getByRole("button", { name: "Edit card" }).click();
  await page.getByRole("complementary", { name: /Edit Ash Choir Crusader/i }).waitFor();
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const original = await readFile("content/cards/threats/ash-choir-crusader.json", "utf8");
  const room = await createRoom();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => void dialog.accept());

  try {
    await openEditor(page, room);
    await capture(page, "editor-overview-1920x1080.png");

    await page.setViewportSize({ width: 1440, height: 900 });
    const difficulty = page.locator('.admin-card-editor input[type="number"]').first();
    await difficulty.scrollIntoViewIfNeeded();
    await capture(page, "difficulty-effects-1440x900.png");

    const artworkInput = page.locator('.admin-card-editor input[type="file"]');
    await artworkInput.setInputFiles(path.resolve("public/assets/cards/threats/blue/ash-choir-crusader.png"));
    await page.getByAltText("Replacement artwork").waitFor();
    await artworkInput.locator("xpath=ancestor::section[contains(@class,'admin-card-editor-section')]").scrollIntoViewIfNeeded();
    await capture(page, "artwork-replacement-preview-1440x900.png");

    await page.reload();
    await page.getByRole("region", { name: "Admin card library" }).waitFor();
    await page.getByLabel("Search archive").fill("ash-choir-crusader");
    await page.getByRole("button", { name: /Ash Choir Crusader/i }).first().click();
    await page.getByRole("button", { name: "Edit card" }).waitFor();
    await page.getByRole("button", { name: "Edit card" }).click();
    await page.getByRole("complementary", { name: /Edit Ash Choir Crusader/i }).waitFor();
    const invalidDifficulty = page.locator('.admin-card-editor input[type="number"]').first();
    await invalidDifficulty.fill("0");
    await page.getByRole("button", { name: "Preview changes" }).click();
    await page.getByRole("button", { name: "Confirm save" }).click();
    await page.getByText("Card validation failed").waitFor();
    await page.getByText("Card validation failed").scrollIntoViewIfNeeded();
    await capture(page, "validation-error-1440x900.png");
    errors.length = 0; // The intentional 422 validation response is expected for this capture.
    await page.getByRole("button", { name: "Revert all" }).click();

    const displayName = page.getByLabel("Display name");
    await displayName.fill("Ash Choir Crusader QA Review");
    await page.getByRole("button", { name: "Preview changes" }).click();
    await capture(page, "change-summary-1440x900.png");
    await page.getByRole("button", { name: "Confirm save" }).click();
    await page.getByText("Card saved").waitFor();
    await page.getByText("Card saved").scrollIntoViewIfNeeded();
    await capture(page, "save-success-1440x900.png");

    const revert = page.getByRole("button", { name: "Revert to previous version" }).first();
    await revert.scrollIntoViewIfNeeded();
    await revert.click();
    await page.getByLabel("Display name").waitFor();
    await page.waitForFunction(() => (document.querySelector<HTMLInputElement>('#admin-card-display-name')?.value ?? "") === "Ash Choir Crusader");
    await capture(page, "revision-reverted-1440x900.png");

    await page.setViewportSize({ width: 1280, height: 720 });
    await capture(page, "editor-compact-1280x720.png");
  } finally {
    await browser.close();
    const restored = await readFile("content/cards/threats/ash-choir-crusader.json", "utf8");
    if (restored !== original) throw new Error("QA edit was not reverted to the exact original canonical JSON");
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
}

void main();
