import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const output = path.resolve("reports/ui/admin-simulation-lab");
const clientOrigin = process.env.ASHEN_REACH_QA_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const apiOrigin = process.env.ASHEN_REACH_QA_API_ORIGIN ?? "http://127.0.0.1:8080";

async function createRoom(): Promise<{ roomCode: string; hostToken: string }> {
  const response = await fetch(`${apiOrigin}/api/session/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionMode: "single-player", scenarioId: "scenario_broken_seal" }) });
  if (!response.ok) throw new Error(`Room creation failed: ${response.status} ${await response.text()}`);
  return await response.json() as { roomCode: string; hostToken: string };
}

async function capture(page: Page, fileName: string): Promise<void> {
  await page.waitForTimeout(120);
  const metrics = await page.evaluate(() => ({
    viewport: `${innerWidth}x${innerHeight}`,
    documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    labWidth: document.querySelector<HTMLElement>(".admin-simulation-lab")?.scrollWidth ?? 0,
    setupOverflow: (document.querySelector<HTMLElement>(".admin-sim-setup")?.scrollWidth ?? 0) - (document.querySelector<HTMLElement>(".admin-sim-setup")?.clientWidth ?? 0),
    stageOverflow: (document.querySelector<HTMLElement>(".admin-sim-stage")?.scrollWidth ?? 0) - (document.querySelector<HTMLElement>(".admin-sim-stage")?.clientWidth ?? 0),
    resultOverflow: (document.querySelector<HTMLElement>(".admin-sim-results")?.scrollWidth ?? 0) - (document.querySelector<HTMLElement>(".admin-sim-results")?.clientWidth ?? 0)
  }));
  if (metrics.documentWidth > (page.viewportSize()?.width ?? 0) || metrics.labWidth > (page.viewportSize()?.width ?? 0) || metrics.setupOverflow > 1 || metrics.stageOverflow > 1 || metrics.resultOverflow > 1) throw new Error(`${fileName}: overflow ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: path.join(output, fileName), fullPage: false });
  console.log(JSON.stringify({ fileName, ...metrics }));
}

async function openCard(page: Page, query: string, name: RegExp): Promise<void> {
  if (await page.getByRole("button", { name: /Exit Simulation/i }).isVisible().catch(() => false)) await page.getByRole("button", { name: /Exit Simulation/i }).click();
  const search = page.getByLabel("Search archive"); await search.fill(query); await page.getByRole("button", { name }).first().click();
  await page.getByRole("button", { name: /Open Simulation Lab/i }).waitFor(); await page.getByRole("button", { name: /Open Simulation Lab/i }).click();
  await page.getByRole("region", { name: /Simulation Lab for/i }).waitFor();
  await page.getByLabel("Preset").selectOption("character");
  await page.getByLabel("Character").selectOption("char_master_alpha");
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const room = await createRoom();
  const statusResponse = await fetch(`${apiOrigin}/api/admin/content/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(room) });
  console.log(JSON.stringify({ adminStatus: await statusResponse.json(), statusCode: statusResponse.status }));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ roomCode, hostToken }) => { localStorage.setItem("ashen-reach-tv-room-code", roomCode); localStorage.setItem("ashen-reach-tv-host-token", hostToken); }, room);
  await page.goto(`${clientOrigin}/tv?room=${room.roomCode}&admin=library`);
  await page.getByRole("region", { name: "Admin card library" }).waitFor();

  await openCard(page, "ash-choir-crusader", /Ash Choir Crusader/i);
  await capture(page, "enemy-battle-setup-1920x1080.png");
  await page.getByRole("button", { name: /Resolve Simulation/i }).click();
  await page.getByText("CANONICAL RESOLUTION").waitFor();
  await capture(page, "resolved-battle-state-diff-1920x1080.png");

  await openCard(page, "ash-choir-crusader", /Ash Choir Crusader/i);
  await page.getByLabel("Resolution mode").selectOption("failure");
  await page.getByRole("button", { name: /Resolve Simulation/i }).click();
  await page.getByText(/Choose one of the two deterministic Scar candidates/i).waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "scar-choice-prompt-1440x900.png");
  await page.locator(".admin-sim-prompts button").first().click();
  await page.getByText(/SCAR_SELECTED/i).first().waitFor();
  await capture(page, "scar-simulation-state-diff-1440x900.png");

  await page.getByRole("button", { name: /Exit Simulation/i }).click();
  await page.getByLabel("Search archive").fill("scar-parasite-crown");
  await page.getByRole("button", { name: /Parasite Crown/i }).first().click();
  await page.getByRole("button", { name: /Edit card/i }).click();
  await page.getByRole("complementary", { name: /Edit Parasite Crown/i }).waitFor();
  await page.getByAltText("Current saved artwork").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0
    ? true
    : new Promise<boolean>((resolve) => image.addEventListener("load", () => resolve(true), { once: true })));
  await capture(page, "admin-library-scar-editing-1440x900.png");
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await openCard(page, "scar-wound-9", /Red March Tremor/i);
  await page.getByLabel(/Activate owner-controlled Adaptation/i).check();
  await page.getByRole("button", { name: /Resolve Simulation/i }).click();
  await page.getByText(/SCAR_ADAPTATION_ACTIVATED/i).first().waitFor();
  await capture(page, "scar-adaptation-activation-1440x900.png");

  await page.setViewportSize({ width: 1920, height: 1080 });
  await openCard(page, "gate-tax-collectors", /Gate-Tax Collectors/i);
  await page.getByLabel("Resolution mode").selectOption("failure");
  await capture(page, "event-branch-selection-1920x1080.png");
  await page.getByRole("button", { name: /Resolve Simulation/i }).click();
  await page.getByText(/Generated Prompt/i).waitFor();
  await capture(page, "generated-choice-prompt-1920x1080.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "failure-loss-effect-trace-1440x900.png");
  await page.getByRole("button", { name: /pay-levy/i }).click();
  await page.getByText("RESOLUTION_APPLIED").first().waitFor();
  await capture(page, "reward-execution-trace-1440x900.png");

  await page.getByRole("button", { name: /Exit Simulation/i }).click();
  await page.getByLabel("Search archive").fill("ash-choir-crusader"); await page.getByRole("button", { name: /Ash Choir Crusader/i }).first().click();
  await page.getByRole("button", { name: /Edit card/i }).click(); await page.getByRole("complementary", { name: /Edit Ash Choir Crusader/i }).waitFor();
  await page.getByLabel("Display name").fill("Unsaved Bell Trial"); await page.getByRole("button", { name: /Simulate draft/i }).click();
  await page.getByText(/UNSAVED PREVIEW · never enters/i).waitFor(); await page.getByLabel("Preset").selectOption("character"); await page.getByLabel("Character").selectOption("char_master_alpha"); await page.getByRole("button", { name: /Resolve Simulation/i }).click(); await page.getByText("CANONICAL RESOLUTION").waitFor();
  await capture(page, "unsaved-draft-simulation-1440x900.png");

  await page.setViewportSize({ width: 1280, height: 720 });
  await capture(page, "long-effect-trace-1280x720.png");
  await page.getByLabel("Resolution mode").selectOption("failure");
  await capture(page, "validation-warnings-1280x720.png");
  await page.getByLabel("Resolution mode").selectOption("calculated");
  await page.getByText("Run Multiple").scrollIntoViewIfNeeded(); await page.getByRole("button", { name: /Run batch/i }).click(); await page.getByText(/100 SIMULATIONS/i).waitFor({ timeout: 60_000 });
  await capture(page, "repeated-simulation-summary-1280x720.png");

  await browser.close();
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);
}

void main();
