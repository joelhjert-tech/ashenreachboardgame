import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface StoredControllerAuth { roomCode: string; seatId: string; seatToken: string; displayName: string; hostToken: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page, apiOrigin: string, clientOrigin: string): Promise<StoredControllerAuth> {
  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Economy QA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(window.localStorage.getItem("ashenreach.controllerSession") ?? "null")) as StoredControllerAuth | null;
  if (!auth) throw new Error("Phone auth was not stored");
  return { ...auth, hostToken: session.hostToken };
}

async function seed(apiOrigin: string, auth: StoredControllerAuth, completedContracts: 0 | 1 | 2 | 3): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "relic-trade", completedContracts } });
}

async function assertPhoneSafe(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({ body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  if (Math.max(metrics.body, metrics.root) > 390) throw new Error(`Phone overflow ${JSON.stringify(metrics)}`);
}

async function openShop(page: Page): Promise<void> {
  const showTabs = page.getByRole("button", { name: "Show Tabs" });
  const shopTab = page.getByRole("tab", { name: "Shop", exact: true });
  await showTabs.or(shopTab).waitFor({ state: "visible" });
  if (await showTabs.isVisible()) await showTabs.click();
  if (await shopTab.isVisible()) await shopTab.click();
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "economy");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const auth = await startPhone(phone, apiOrigin, clientOrigin);

  await seed(apiOrigin, auth, 2);
  await openShop(phone);
  await phone.getByText(/2\/3 completed Contracts/i).first().waitFor();
  await assertPhoneSafe(phone);
  await phone.screenshot({ path: join(output, "phone-390x844-insufficient-contracts.png"), fullPage: false });

  await seed(apiOrigin, auth, 3);
  await openShop(phone);
  const exchange = phone.getByRole("button", { name: /Exchange Contracts for Artifact/i });
  await exchange.waitFor();
  await phone.screenshot({ path: join(output, "phone-390x844-exchange-ready.png"), fullPage: false });
  await exchange.click();
  await phone.getByText(/Choose one Artifact/i).waitFor();
  await assertPhoneSafe(phone);
  await phone.screenshot({ path: join(output, "phone-390x844-private-artifact-options.png"), fullPage: true });

  await phone.getByRole("button", { name: "Choose", exact: true }).first().click();
  await phone.getByRole("dialog", { name: "Confirm Artifact" }).waitFor();
  await phone.screenshot({ path: join(output, "phone-390x844-confirm-artifact.png"), fullPage: false });
  await phone.getByRole("button", { name: "Confirm Artifact" }).click();
  await phone.getByText(/Completed Contracts/i).first().waitFor();

  await phone.goto(`${clientOrigin}/?room=${auth.roomCode}`);
  await phone.waitForLoadState("networkidle");
  const showTabs = phone.getByRole("button", { name: "Show Tabs" });
  if (await showTabs.isVisible()) await showTabs.click();
  await phone.getByRole("tab", { name: "Inventory", exact: true }).click();
  await phone.getByLabel("Completed Contract ledger").waitFor();
  await phone.screenshot({ path: join(output, "phone-390x844-reconnect-ledger.png"), fullPage: false });

  const tv = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await tv.addInitScript(({ hostToken }) => window.localStorage.setItem("ashen-reach-tv-host-token", hostToken), { hostToken: auth.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${auth.roomCode}`);
  await tv.waitForLoadState("networkidle");
  if ((await tv.locator("body").innerText()).includes("Choose one Artifact")) throw new Error("Private Artifact choices leaked to TV");
  await tv.screenshot({ path: join(output, "tv-1366x768-public-exchange.png"), fullPage: false });

  if (errors.length) throw new Error(`Console errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, captures: 6 }, null, 2));
}

await main();
