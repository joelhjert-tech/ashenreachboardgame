import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse {
  roomCode: string;
  hostToken: string;
}

const tvViewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 }
] as const;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function joinPhone(page: Page, clientOrigin: string, roomCode: string, name: string, character: RegExp, activeSession = false): Promise<void> {
  await page.goto(`${clientOrigin}/?room=${roomCode}&resetAuth=1`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Select operative" }).waitFor();
  await page.getByRole("button", { name: character }).click();
  await page.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await page.getByRole("button", { name: "Select Mission" }).first().click();
  await page.getByRole("button", { name: activeSession ? "Join Game" : "Ready" }).click();
}

async function captureTv(page: Page, output: string, state: string): Promise<void> {
  for (const viewport of tvViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth);
    if (overflow) throw new Error(`${state} overflowed at ${viewport.name}`);
    await page.screenshot({ path: join(output, `${state}-${viewport.name}.png`), fullPage: false });
  }
}

async function main(): Promise<void> {
  const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
  const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  const output = resolve("reports", "mid-game-join-qa");
  await mkdir(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const tv = await browser.newPage({ viewport: tvViewports[0] });
  const first = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const second = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const third = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const fourth = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const rejected = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const page of [tv, first, second, third, fourth, rejected]) {
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
  }

  const session = await postJson<SessionResponse>(`${apiOrigin}/api/session/create`, {
    sessionMode: "multiplayer",
    interactionMode: "co-op",
    gameMode: "standard",
    playerCount: 4
  });
  await tv.addInitScript(({ roomCode, hostToken }) => {
    localStorage.setItem("ashenreach-tv-room-code", roomCode);
    localStorage.setItem("ashenreach-tv-host-token", hostToken);
  }, session);
  await tv.goto(`${clientOrigin}/tv?room=${session.roomCode}`);

  await joinPhone(first, clientOrigin, session.roomCode, "Host Player", /Bjornis/i);
  await joinPhone(second, clientOrigin, session.roomCode, "Second Player", /Brask Ode/i);
  await first.getByRole("button", { name: "Start Game" }).click();
  await first.getByText("Host Player").first().waitFor();
  await captureTv(tv, output, "two-player-session-active");

  await third.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await third.getByLabel("Player name").fill("Late Player");
  await third.getByRole("button", { name: "Join Game" }).click();
  await third.getByRole("heading", { name: "Select operative" }).waitFor();
  await captureTv(tv, output, "late-join-operative-pending");
  await third.screenshot({ path: join(output, "late-join-private-operative-390x844.png"), fullPage: false });
  await third.getByRole("button", { name: /Dessa Korr/i }).click();
  await third.getByRole("heading", { name: "Choose Starting Mission" }).waitFor();
  await captureTv(tv, output, "late-join-mission-pending");
  await third.screenshot({ path: join(output, "late-join-private-mission-390x844.png"), fullPage: false });

  const pendingTvText = await tv.locator("body").innerText();
  if (/Select operative|Choose Starting Mission|Select Mission/i.test(pendingTvText)) {
    throw new Error("Private late-join setup leaked to the TV");
  }

  await third.getByRole("button", { name: "Select Mission" }).first().click();
  await third.getByRole("button", { name: "Join Game" }).click();
  await tv.waitForTimeout(500);
  await captureTv(tv, output, "late-join-completed");

  await third.goto(`${clientOrigin}/?room=${session.roomCode}`);
  await third.waitForTimeout(2_000);
  await third.screenshot({ path: join(output, "late-join-reconnect-phone-390x844.png"), fullPage: false });
  if (await third.getByRole("main", { name: "Phone content" }).count() === 0) {
    throw new Error(`Late-join phone did not restore authoritative content after reload:\n${await third.locator("body").innerText()}`);
  }
  await captureTv(tv, output, "late-join-reconnected");

  await joinPhone(fourth, clientOrigin, session.roomCode, "Fourth Player", /Deepdale/i, true);
  await tv.waitForTimeout(500);
  await captureTv(tv, output, "full-room");

  await rejected.goto(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  await rejected.getByLabel("Player name").fill("Rejected Player");
  await rejected.getByRole("button", { name: "Join Game" }).click();
  await rejected.getByText(/No open seats remain/i).waitFor();
  await rejected.screenshot({ path: join(output, "full-room-join-rejected-390x844.png"), fullPage: false });

  const tvText = await tv.locator("body").innerText();
  if (/Choose one Artifact|Private agenda|Rivalry target/i.test(tvText)) throw new Error("Private content leaked to TV");
  const unexpectedErrors = errors.filter((entry) => !/Failed to load resource: the server responded with a status of 400/i.test(entry));
  if (unexpectedErrors.length > 0) throw new Error(`Console errors:\n${unexpectedErrors.join("\n")}`);

  await browser.close();
  console.log(JSON.stringify({ output, roomCode: session.roomCode, screenshots: 16 }, null, 2));
}

await main();
