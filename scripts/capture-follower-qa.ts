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
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Player name").fill("Follower QA");
  await page.getByRole("button", { name: "Join as Host Phone" }).click();
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

async function seed(apiOrigin: string, auth: StoredControllerAuth, stage: "acquired" | "used" | "reconnected"): Promise<void> {
  await postJson(`${apiOrigin}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "follower", stage } });
}

async function openInventory(page: Page): Promise<void> {
  const showTabs = page.getByRole("button", { name: "Show Tabs" });
  const inventoryTab = page.getByRole("tab", { name: "Inventory", exact: true });
  await showTabs.or(inventoryTab).waitFor({ state: "visible" });
  if (await showTabs.isVisible()) await showTabs.click();
  await inventoryTab.click();
  await page.getByText("Lucy, Hell Puppy", { exact: true }).waitFor();
  await page.getByText("Lucy, Hell Puppy", { exact: true }).scrollIntoViewIfNeeded();
}

async function assertSafe(page: Page, width: number): Promise<void> {
  const metrics = await page.evaluate(() => ({ body: document.body.scrollWidth, root: document.documentElement.scrollWidth, canvas: document.querySelectorAll("canvas").length }));
  if (Math.max(metrics.body, metrics.root) > width) throw new Error(`Horizontal overflow: ${JSON.stringify(metrics)}`);
  if (metrics.canvas !== 0) throw new Error(`Unexpected canvas count ${metrics.canvas}`);
  if ((await page.locator("body").innerText()).includes("Black Lantern broker: a contract lead")) throw new Error("Private follower note leaked");
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "followers");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const auth = await startPhone(phone, apiOrigin, clientOrigin);

  await seed(apiOrigin, auth, "acquired");
  await openInventory(phone);
  await assertSafe(phone, 390);
  await phone.screenshot({ path: join(output, "phone-390x844-acquired.png"), fullPage: false });

  await seed(apiOrigin, auth, "used");
  await phone.getByText("Exhausted", { exact: true }).waitFor();
  await assertSafe(phone, 390);
  await phone.screenshot({ path: join(output, "phone-390x844-used.png"), fullPage: false });

  await phone.goto(`${clientOrigin}/?room=${auth.roomCode}`);
  await phone.waitForLoadState("networkidle");
  await openInventory(phone);
  await assertSafe(phone, 390);
  await phone.screenshot({ path: join(output, "phone-390x844-reconnected.png"), fullPage: false });

  const tv = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await tv.addInitScript(({ hostToken }) => {
    window.localStorage.setItem("ashen-reach-tv-host-token", hostToken);
  }, { hostToken: auth.hostToken });
  await tv.goto(`${clientOrigin}/tv?room=${auth.roomCode}`);
  await tv.waitForLoadState("networkidle");
  await tv.getByLabel("Bjornis followers").getByText("Lucy, Hell Puppy", { exact: true }).waitFor();
  await assertSafe(tv, 1366);
  await tv.screenshot({ path: join(output, "tv-1366x768-public-follower.png"), fullPage: false });

  if (errors.length) throw new Error(`Console errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(JSON.stringify({ output, captures: 4 }, null, 2));
}

await main();
