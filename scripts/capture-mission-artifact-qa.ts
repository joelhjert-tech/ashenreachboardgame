import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface ControllerAuth { roomCode: string; seatId: string; seatToken: string; displayName: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function openTab(page: Page, name: string): Promise<void> {
  const showTabs = page.getByRole("button", { name: "Show Tabs" });
  const tab = page.getByRole("tab", { name, exact: true });
  await showTabs.or(tab).waitFor({ state: "visible" });
  if (await showTabs.isVisible()) await showTabs.click();
  await tab.waitFor({ state: "visible" });
  await tab.click();
}

async function assertNoOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  if (overflow > 1) throw new Error(`Horizontal overflow: ${overflow}px`);
}

async function startPhone(page: Page, api: string, client: string): Promise<{ session: SessionResponse; auth: ControllerAuth }> {
  const session = await postJson<SessionResponse>(`${api}/api/session/create`, { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Missioner");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.getByRole("button", { name: /Roll movement/i }).waitFor({ state: "visible" });
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as ControllerAuth | null;
  if (!auth) throw new Error("Controller authentication was not stored");
  return { session, auth };
}

async function seed(api: string, auth: ControllerAuth, fixture: unknown): Promise<void> {
  await postJson(`${api}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture });
}

async function main(): Promise<void> {
  const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "mission-artifact");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  phone.on("pageerror", (error) => errors.push(error.message));
  const { session, auth } = await startPhone(phone, api, client);

  await seed(api, auth, { kind: "mission-reward", stage: "progress" });
  await openTab(phone, "Quest");
  await phone.getByText("Echo Triangulation").waitFor();
  await assertNoOverflow(phone);
  await phone.screenshot({ path: join(output, "phone-390x844-mission-progress.png"), fullPage: false });

  await seed(api, auth, { kind: "mission-reward", stage: "ready" });
  await openTab(phone, "Quest");
  await phone.getByText(/Progress 3\/3 stops/i).waitFor();
  await openTab(phone, "Action");
  await phone.locator("details").filter({ hasText: /^Contracts/i }).locator("summary").click();
  const complete = phone.getByRole("button", { name: /Complete Echo Triangulation/i });
  await complete.waitFor();
  await phone.screenshot({ path: join(output, "phone-390x844-mission-ready.png"), fullPage: false });
  await complete.click();
  await phone.getByText(/Mission Complete|Contract completed|Completed Echo Triangulation/i).first().waitFor();
  await phone.screenshot({ path: join(output, "phone-390x844-mission-reward.png"), fullPage: false });
  const continueButton = phone.getByRole("button", { name: /Continue/i });
  if (await continueButton.isVisible().catch(() => false)) await continueButton.click();
  await phone.getByRole("region", { name: "Choose new mission" }).waitFor();
  await assertNoOverflow(phone);
  await phone.screenshot({ path: join(output, "phone-390x844-replacement-mission.png"), fullPage: false });

  const adminSession = await postJson<{ roomCode: string; hostToken: string }>(`${api}/api/session/create`, {
    sessionMode: "single-player",
    scenarioId: "scenario_broken_seal"
  });
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  tv.on("pageerror", (error) => errors.push(error.message));
  await tv.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashen-reach-tv-room-code", roomCode);
    localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, adminSession);
  await tv.goto(`${client}/tv?room=${adminSession.roomCode}&admin=library`);
  await tv.getByRole("region", { name: "Admin card library" }).waitFor();
  await tv.getByLabel("Search archive").fill("choir-echo-triangulation");
  await tv.getByRole("button", { name: /Echo Triangulation/i }).first().click();
  await assertNoOverflow(tv);
  await tv.screenshot({ path: join(output, "tv-1920x1080-mission-inspector.png"), fullPage: false });
  await tv.getByRole("button", { name: /Open Simulation Lab/i }).click();
  await tv.getByRole("region", { name: /Simulation Lab for/i }).waitFor();
  await tv.getByLabel("Resolution mode").selectOption("calculated");
  await tv.getByRole("button", { name: /Resolve Simulation/i }).click();
  await tv.getByText("gain_salvage", { exact: true }).last().waitFor();
  await assertNoOverflow(tv);
  await tv.screenshot({ path: join(output, "tv-1920x1080-mission-reward-simulation.png"), fullPage: false });

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, captures: 6 }, null, 2));
}

await main();
