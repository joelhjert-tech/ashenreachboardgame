import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; hostToken: string }
type Stage = "guardian-locked" | "guardian-cleared" | "core-locked" | "core-cleared";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page, apiOrigin: string, clientOrigin: string): Promise<Auth> {
  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Map QA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Omit<Auth, "hostToken">;
  return { ...stored, hostToken: session.hostToken };
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "map-progression");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const auth = await startPhone(phone, apiOrigin, clientOrigin);
  const tv = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashenreach-tv-host-token", hostToken), { hostToken: auth.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${auth.roomCode}`);

  for (const stage of ["guardian-locked", "guardian-cleared", "core-locked", "core-cleared"] satisfies Stage[]) {
    await postJson(`${apiOrigin}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "map-transition", stage } });
    const showTabs = phone.getByRole("button", { name: "Show Tabs" });
    if (await showTabs.isVisible()) await showTabs.click();
    await phone.getByRole("tab", { name: "Move", exact: true }).click();
    await phone.getByTestId("movement-planner").waitFor();
    const transitionTarget = stage.startsWith("core-") ? "The Ashen Reach Core" : "Melted Gate";
    await phone.getByText(transitionTarget, { exact: true }).last().scrollIntoViewIfNeeded();
    await tv.getByLabel("Ashen Reach rectangular tactical board").waitFor();
    const phoneMetrics = await phone.evaluate(() => ({ body: document.body.scrollWidth, viewport: innerWidth }));
    if (phoneMetrics.body > phoneMetrics.viewport) throw new Error(`${stage} phone overflow: ${JSON.stringify(phoneMetrics)}`);
    const markerCount = await tv.locator("[data-testid^='ring-transition-marker-']").count();
    const routeCount = await tv.locator("[data-testid^='ring-transition-'][data-source-sector-id]").count();
    if (markerCount < 13 || routeCount < 1) throw new Error(`${stage} transition presentation incomplete: markers=${markerCount}, highlightedRoutes=${routeCount}`);
    await phone.screenshot({ path: join(output, `phone-390x844-${stage}.png`), fullPage: false });
    await tv.screenshot({ path: join(output, `tv-1366x768-${stage}.png`), fullPage: false });
  }

  if (errors.length) throw new Error(`Console errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, captures: 8 }, null, 2));
}

await main();
