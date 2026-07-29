import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

type Stage = "equipment-reveal" | "follower-reveal" | "auto-equipped" | "equip-choice" | "command-item-invalid" | "grit-item-valid";
interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatToken: string }

const stages: Stage[] = ["equipment-reveal", "follower-reveal", "auto-equipped", "equip-choice", "command-item-invalid", "grit-item-valid"];
const tvViewports = [{ name: "1920x1080", width: 1920, height: 1080 }, { name: "1366x768", width: 1366, height: 768 }];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page, api: string, client: string): Promise<{ session: SessionResponse; auth: Auth }> {
  const session = await postJson<SessionResponse>(`${api}/api/session/create`, { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("DiscoveryQA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone auth missing");
  return { session, auth };
}

async function assertViewport(page: Page, width: number, label: string): Promise<void> {
  const metrics = await page.evaluate(() => ({ body: document.body.scrollWidth, root: document.documentElement.scrollWidth, viewport: innerWidth }));
  if (Math.max(metrics.body, metrics.root) > width) throw new Error(`${label} horizontal overflow: ${JSON.stringify(metrics)}`);
}

async function waitForVisibleImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const images = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      await image.decode().catch(() => undefined);
    }));
  });
}

async function main(): Promise<void> {
  const api = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const client = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "ui", "discovery-equipment");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(`phone: ${message.text()}`); });
  phone.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  const { session, auth } = await startPhone(phone, api, client);
  const tv = await browser.newPage({ viewport: tvViewports[0] });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(`tv: ${message.text()}`); });
  tv.on("pageerror", (error) => errors.push(`tv: ${error.message}`));
  await tv.addInitScript(({ hostToken }) => localStorage.setItem("ashen-reach-tv-host-token", hostToken), { hostToken: session.hostToken });
  await tv.goto(`${client}/tv?room=${session.roomCode}`);
  await tv.getByTestId("tv-command-main").waitFor();

  const captures: Array<{ file: string; stage: Stage; viewport: string }> = [];
  for (const stage of stages) {
    await postJson(`${api}/api/qa/phase1-fixture`, { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "discovery-equipment", stage } });
    await phone.waitForTimeout(450);
    await tv.waitForTimeout(450);
    if (stage === "command-item-invalid" || stage === "grit-item-valid") {
      const gear = phone.getByRole("button", { name: /^Gear$/i });
      if (await gear.isVisible().catch(() => false)) await gear.click();
    }
    await waitForVisibleImages(phone);
    await waitForVisibleImages(tv);
    const phoneFile = `phone-${stage}-390x844.png`;
    await phone.screenshot({ path: join(output, phoneFile), fullPage: false });
    captures.push({ file: phoneFile, stage, viewport: "390x844" });
    await assertViewport(phone, 390, `phone-${stage}`);
    for (const viewport of tvViewports) {
      await tv.setViewportSize(viewport);
      const tvFile = `tv-${stage}-${viewport.name}.png`;
      await tv.screenshot({ path: join(output, tvFile), fullPage: false });
      captures.push({ file: tvFile, stage, viewport: viewport.name });
      await assertViewport(tv, viewport.width, `tv-${stage}-${viewport.name}`);
    }
  }

  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  await writeFile(join(output, "index.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), captures }, null, 2)}\n`, "utf8");
  await browser.close();
  console.log(JSON.stringify({ output, screenshots: captures.length, stages }, null, 2));
}

void main();
