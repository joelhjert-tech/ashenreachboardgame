import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }
type ScarStage = "choice" | "owned-one" | "owned-two" | "third-warning" | "removal" | "retired" | "adaptation-available" | "adaptation-used";

const api = "http://127.0.0.1:8080";
const client = "http://127.0.0.1:5173";
const output = resolve("reports", "ui", "scar-system");

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page): Promise<{ session: SessionResponse; auth: Auth }> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "single-player", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill("Scar Witness");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authorization was not stored");
  return { session, auth };
}

async function seed(auth: Auth, stage: ScarStage): Promise<void> {
  await post("/api/qa/phase1-fixture", { roomCode: auth.roomCode, seatToken: auth.seatToken, fixture: { kind: "scar-system", stage } });
}

async function assertViewport(page: Page, label: string): Promise<void> {
  const metrics = await page.evaluate(() => ({ width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth), viewport: innerWidth, text: document.body.innerText }));
  if (metrics.width > metrics.viewport) throw new Error(`${label} overflow: ${metrics.width} > ${metrics.viewport}`);
  if (/sourceEventId|selectionId|candidateIds|scarDecks/i.test(metrics.text)) throw new Error(`${label} leaked internal Scar state`);
}

async function shot(page: Page, fileName: string): Promise<void> {
  await page.waitForTimeout(160);
  await assertViewport(page, fileName);
  await page.screenshot({ path: join(output, fileName), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  for (const page of [phone]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }
  const { session, auth } = await startPhone(phone);
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  tv.on("pageerror", (error) => errors.push(error.message));
  await tv.addInitScript(({ roomCode, hostToken }) => { localStorage.setItem("ashen-reach-tv-room-code", roomCode); localStorage.setItem("ashen-reach-tv-host-token", hostToken); }, session);
  await tv.goto(`${client}/tv?room=${session.roomCode}`);

  await seed(auth, "choice");
  await phone.getByRole("button", { name: /Choose / }).first().waitFor();
  await shot(phone, "phone-choice-390x844.png");
  await tv.getByText("The Wound Did Not Close", { exact: true }).first().waitFor();
  await shot(tv, "tv-choice-1920x1080.png");
  await tv.setViewportSize({ width: 1366, height: 768 });
  await shot(tv, "tv-choice-1366x768.png");

  await phone.goto(`${client}/?room=${session.roomCode}`);
  await phone.getByRole("button", { name: /Choose / }).first().waitFor();
  await shot(phone, "phone-choice-reconnect-390x844.png");

  await seed(auth, "third-warning");
  await phone.getByText(/third Scar/i).first().waitFor();
  await shot(phone, "phone-third-scar-warning-390x844.png");

  await seed(auth, "removal");
  await phone.getByRole("button", { name: /Purge .*4 Salvage/i }).waitFor();
  await shot(phone, "phone-sable-machine-choir-removal-390x844.png");

  await seed(auth, "adaptation-available");
  await phone.getByRole("button", { name: /Use |Scar/i }).first().waitFor();
  await shot(phone, "phone-adaptation-available-390x844.png");

  await seed(auth, "adaptation-used");
  await phone.getByText(/already been used.*round/i).first().waitFor();
  await shot(phone, "phone-adaptation-used-390x844.png");

  await phone.goto(`${client}/?room=${session.roomCode}`);
  await phone.getByText(/already been used.*round/i).first().waitFor();
  await shot(phone, "phone-adaptation-reconnect-390x844.png");

  await seed(auth, "retired");
  await tv.getByText(/third Scar retired/i).first().waitFor();
  await shot(tv, "tv-third-scar-retirement-1366x768.png");

  await tv.emulateMedia({ reducedMotion: "reduce" });
  await seed(auth, "choice");
  await tv.getByText("The Wound Did Not Close", { exact: true }).first().waitFor();
  await shot(tv, "tv-choice-reduced-motion-1366x768.png");

  await browser.close();
  if (errors.length) throw new Error(`Browser console errors: ${errors.join(" | ")}`);
}

void main();
