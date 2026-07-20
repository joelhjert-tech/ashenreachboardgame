import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

type Stage = "payment" | "optional-payment" | "insufficient" | "battle-reward" | "event-reward";
interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string }

const api = process.env.SALVAGE_QA_API ?? "http://127.0.0.1:18080";
const client = process.env.SALVAGE_QA_CLIENT ?? "http://127.0.0.1:15173";
const output = resolve("reports", "ui", "salvage-resolution");
const tvViewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 }
] as const;

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page): Promise<{ auth: Auth; session: SessionResponse }> {
  const session = await post<SessionResponse>("/api/session/create", {
    sessionMode: "single-player",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 1
  });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`, { waitUntil: "networkidle" });
  await page.getByLabel("Player name").fill("Salvage QA");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authorization was not stored");
  return { auth, session };
}

async function applyFixture(auth: Auth, stage: Stage): Promise<void> {
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "salvage-resolution", stage }
  });
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth
  }));
  if (Math.max(sizes.body, sizes.root) > sizes.viewport) {
    throw new Error(`${label} horizontal overflow: ${JSON.stringify(sizes)}`);
  }
}

async function capturePhone(page: Page, file: string): Promise<void> {
  await assertNoOverflow(page, file);
  await page.screenshot({ path: join(output, file), fullPage: false });
}

async function continueResolution(phone: Page): Promise<void> {
  const button = phone.getByRole("button", { name: /^Continue$/i }).first();
  await button.waitFor();
  await button.click();
  await phone.waitForTimeout(180);
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(`phone: ${message.text()}`); });
  phone.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  const { auth, session } = await startPhone(phone);

  const tv = await browser.newPage({ viewport: tvViewports[0] });
  tv.on("console", (message) => { if (message.type() === "error") errors.push(`tv: ${message.text()}`); });
  tv.on("pageerror", (error) => errors.push(`tv: ${error.message}`));
  await tv.addInitScript(({ token }) => localStorage.setItem("ashen-reach-tv-host-token", token), { token: session.hostToken });
  await tv.goto(`${client}/tv?room=${session.roomCode}`, { waitUntil: "networkidle" });
  await tv.getByTestId("tv-command-main").waitFor();

  const captures: Array<{ file: string; state: string; viewport: string }> = [];
  const shotPhone = async (file: string, state: string) => {
    await capturePhone(phone, file);
    captures.push({ file, state, viewport: "390x844" });
  };

  await applyFixture(auth, "payment");
  await continueResolution(phone);
  await phone.getByRole("button", { name: /Pay 1 Salvage/i }).waitFor();
  await shotPhone("payment-required-390x844.png", "Required payment");

  await phone.goto(`${client}/?room=${auth.roomCode}&seat=${auth.seatId}`, { waitUntil: "networkidle" });
  await phone.getByRole("button", { name: /Pay 1 Salvage/i }).waitFor();
  await shotPhone("payment-reconnect-390x844.png", "Required payment after reconnect");
  await phone.getByRole("button", { name: /Pay 1 Salvage/i }).click();
  await phone.getByText(/Paid 1 Salvage/i).first().waitFor();
  await shotPhone("payment-resolved-390x844.png", "Payment applied once");

  await applyFixture(auth, "optional-payment");
  await continueResolution(phone);
  const optionalPayment = phone.locator("button").filter({ hasText: /Pay 1 Salvage to heal 1 Wound/i }).first();
  try {
    await optionalPayment.waitFor({ timeout: 5_000 });
  } catch {
    await phone.screenshot({ path: join(output, "diagnostic-optional-payment.png"), fullPage: true });
    throw new Error(`Optional payment did not open. Visible phone text: ${(await phone.locator("body").innerText()).slice(-3_000)}`);
  }
  await shotPhone("payment-optional-390x844.png", "Optional payment");
  await phone.locator("button").filter({ hasText: /Decline/i }).first().click();
  await phone.getByText(/Declined the recovery offer/i).first().waitFor();
  await shotPhone("payment-declined-390x844.png", "Optional payment declined");

  await applyFixture(auth, "insufficient");
  await continueResolution(phone);
  await phone.getByText(/No debt was created/i).first().waitFor();
  await shotPhone("payment-insufficient-390x844.png", "Insufficient funds floors at zero");

  for (const stage of ["battle-reward", "event-reward"] as const) {
    await applyFixture(auth, stage);
    await continueResolution(phone);
    await phone.getByText(/\+1 Salvage/i).first().waitFor();
    await shotPhone(`${stage}-390x844.png`, stage === "battle-reward" ? "Battle reward" : "Event reward");
    for (const viewport of tvViewports) {
      await tv.setViewportSize(viewport);
      await tv.waitForTimeout(120);
      const file = `${stage}-${viewport.name}.png`;
      await assertNoOverflow(tv, file);
      await tv.screenshot({ path: join(output, file), fullPage: false });
      captures.push({ file, state: stage, viewport: viewport.name });
    }
  }

  await browser.close();
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  await writeFile(join(output, "index.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), captures }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, screenshots: captures.length, errors: 0 }, null, 2));
}

void main();
