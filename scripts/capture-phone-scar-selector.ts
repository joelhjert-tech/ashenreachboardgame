import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

interface SessionResponse { roomCode: string; hostToken: string }
interface Auth { roomCode: string; seatId: string; seatToken: string; displayName: string }

const api = process.env.SCAR_QA_API ?? "http://127.0.0.1:18080";
const client = process.env.SCAR_QA_CLIENT ?? "http://127.0.0.1:15173";
const output = resolve("reports", "ui", "scar-selector-production");

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function startPhone(page: Page): Promise<Auth> {
  const session = await post<SessionResponse>("/api/session/create", { sessionMode: "single-player", gameMode: "standard", playerCount: 1 });
  await page.goto(`${client}/?room=${session.roomCode}&resetAuth=1`, { waitUntil: "networkidle" });
  await page.getByLabel("Player name").fill("Scar Witness");
  await page.getByRole("button", { name: "Join Game" }).click();
  await page.getByRole("heading", { name: "Choose Piece" }).waitFor();
  await page.getByRole("button", { name: "Continue to Operative" }).click();
  await page.getByRole("heading", { name: "Choose Operative" }).waitFor();
  await page.getByRole("button", { name: /Bjornis/i }).click();
  await page.getByRole("heading", { name: "Choose Starting Contract" }).waitFor();
  await page.getByRole("button", { name: "Select Contract" }).first().click();
  for (let pick = 0; pick < 2; pick += 1) {
    await page.getByRole("heading", { name: "Choose one provision" }).waitFor();
    await page.getByRole("button", { name: /Choose (Equipment|Follower)/ }).first().click();
  }
  await page.getByRole("button", { name: "Ready" }).click();
  await page.getByRole("button", { name: "Start Game" }).click();
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("ashenreach.controllerSession") ?? "null")) as Auth | null;
  if (!auth) throw new Error("Phone authorization was not stored");
  await post("/api/qa/phase1-fixture", {
    roomCode: auth.roomCode,
    seatToken: auth.seatToken,
    fixture: { kind: "scar-system", stage: "choice" }
  });
  return auth;
}

async function assertPhone(page: Page, label: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    viewportHeight: innerHeight,
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    canvasCount: document.querySelectorAll("canvas").length,
    bodyText: document.body.innerText,
    phoneNavigationVisible: Boolean(document.querySelector('[aria-label="Phone navigation"]')),
    visibleScarCards: document.querySelectorAll(".scar-choice-carousel > .scar-choice-card").length,
    positionText: document.querySelector<HTMLElement>(".scar-choice-carousel__position")?.innerText ?? null,
    acceptRect: (() => {
      const button = document.querySelector<HTMLButtonElement>(".accept-scar-button");
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    })()
  }));
  if (metrics.width > metrics.viewport) throw new Error(`${label} horizontal overflow: ${metrics.width} > ${metrics.viewport}`);
  if (metrics.canvasCount !== 0) throw new Error(`${label} unexpectedly rendered ${metrics.canvasCount} canvases`);
  if (/selectionId|candidateIds|sourceEventId/i.test(metrics.bodyText)) throw new Error(`${label} leaked internal Scar state`);
  if (!/SCAR CHOICE REQUIRED/i.test(metrics.bodyText)) throw new Error(`${label} omitted the blocking Scar footer`);
  if (metrics.phoneNavigationVisible) throw new Error(`${label} left normal phone navigation visible during a blocking Scar choice`);
  if (metrics.visibleScarCards !== 1) throw new Error(`${label} rendered ${metrics.visibleScarCards} Scar cards instead of one`);
  if (!metrics.positionText || !/\d+ of \d+/i.test(metrics.positionText)) throw new Error(`${label} omitted the Scar carousel position`);
  if (metrics.acceptRect && (metrics.acceptRect.top < 0 || metrics.acceptRect.bottom > metrics.viewportHeight)) {
    throw new Error(`${label} acceptance action is outside the viewport: ${JSON.stringify(metrics.acceptRect)}`);
  }
}

async function openSelector(page: Page, auth: Auth, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(`${client}/?room=${auth.roomCode}&seat=${auth.seatId}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Choose Your Scar" }).waitFor();
  await page.waitForFunction(() => {
    const frames = Array.from(document.querySelectorAll<HTMLElement>(".scar-choice-card__art [data-artwork-status]"));
    return frames.length === 1 && frames.every((frame) => frame.dataset.artworkStatus === "ready");
  });
  await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".phone-scar-choice-content");
    if (scroller) scroller.scrollTop = 0;
  });
  await page.waitForTimeout(180);
}

async function shot(page: Page, fileName: string): Promise<void> {
  await assertPhone(page, fileName);
  await page.screenshot({ path: join(output, fileName), fullPage: false });
}

async function assertScrollAfterViewportTransition(page: Page, auth: Auth): Promise<void> {
  await openSelector(page, auth, 390, 844);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.waitForTimeout(120);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);

  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".phone-scar-choice-content");
    const inner = document.querySelector<HTMLElement>(".phone-action-content-root");
    if (!scroller) return null;
    scroller.scrollTop = scroller.scrollHeight;
    const activeAccept = document.querySelector<HTMLElement>(".accept-scar-button")?.getBoundingClientRect() ?? null;
    const ancestry: Array<Record<string, string | number>> = [];
    let ancestor: HTMLElement | null = document.querySelector<HTMLElement>(".scar-prototype");
    while (ancestor && ancestry.length < 8) {
      const style = getComputedStyle(ancestor);
      const rect = ancestor.getBoundingClientRect();
      ancestry.push({
        element: `${ancestor.tagName.toLowerCase()}.${ancestor.className}`,
        height: rect.height,
        scrollHeight: ancestor.scrollHeight,
        clientHeight: ancestor.clientHeight,
        overflowY: style.overflowY,
        display: style.display,
        position: style.position
      });
      ancestor = ancestor.parentElement;
    }
    return {
      outerOverflowY: getComputedStyle(scroller).overflowY,
      innerOverflowY: inner ? getComputedStyle(inner).overflowY : "absent",
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      activeAccept: activeAccept ? { top: activeAccept.top, bottom: activeAccept.bottom } : null,
      viewportHeight: innerHeight,
      ancestry
    };
  });

  if (!metrics) throw new Error("Scar comparison scroll owners were not rendered");
  if (metrics.outerOverflowY !== "auto") throw new Error(`Scar comparison outer overflow is ${metrics.outerOverflowY}`);
  if (metrics.innerOverflowY !== "visible" && metrics.innerOverflowY !== "absent") throw new Error(`Scar comparison retained nested overflow ${metrics.innerOverflowY}`);
  if (metrics.scrollHeight > metrics.clientHeight && metrics.scrollTop <= 0) {
    throw new Error(`Overflowing Scar comparison did not remain scrollable after viewport transition: ${JSON.stringify(metrics)}`);
  }
  if (
    !metrics.activeAccept ||
    metrics.activeAccept.top < 0 ||
    metrics.activeAccept.bottom > metrics.viewportHeight
  ) {
    throw new Error(`Active Scar acceptance action could not be reached: ${JSON.stringify(metrics)}`);
  }

  await page.screenshot({ path: join(output, "scar-selector-after-viewport-transition-scroll-390x844.png"), fullPage: false });
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  const sentFrames: string[] = [];
  const receivedFrames: string[] = [];
  phone.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  phone.on("pageerror", (error) => errors.push(error.message));
  phone.on("websocket", (socket) => {
    socket.on("framesent", (event) => {
      if (typeof event.payload === "string") sentFrames.push(event.payload);
    });
    socket.on("framereceived", (event) => {
      if (typeof event.payload === "string") receivedFrames.push(event.payload);
    });
  });
  const auth = await startPhone(phone);

  for (const [width, height] of [[360, 800], [390, 844], [412, 915], [430, 932]] as const) {
    await openSelector(phone, auth, width, height);
    await shot(phone, `scar-selector-${width}x${height}.png`);
  }

  await assertScrollAfterViewportTransition(phone, auth);
  await openSelector(phone, auth, 390, 844);
  await phone.getByRole("button", { name: "Next Scar" }).click();
  await phone.getByText("2 of 2").waitFor();
  await phone.locator('.scar-choice-card__art [data-artwork-status="ready"]').waitFor();
  await phone.waitForTimeout(220);
  await shot(phone, "scar-selector-second-choice-390x844.png");
  await phone.getByRole("button", { name: /inspect /i }).first().click();
  const inspector = phone.getByRole("dialog");
  await inspector.waitFor();
  await inspector.locator('[data-artwork-status="ready"]').waitFor();
  await inspector.locator("img").evaluateAll(async (images) => {
    await Promise.all((images as HTMLImageElement[]).map((image) => image.decode()));
  });
  await phone.screenshot({ path: join(output, "scar-selector-inspect-390x844.png"), fullPage: false });
  await phone.getByRole("button", { name: /^close$/i }).click();
  await phone.getByRole("button", { name: /accept /i }).first().click();
  try {
    await phone.getByRole("heading", { name: "Choose Your Scar" }).waitFor({ state: "detached", timeout: 6_000 });
  } catch {
    const visibleText = (await phone.locator("body").innerText()).slice(-1_500);
    const scarFrame = [...sentFrames].reverse().find((frame) => frame.includes("CHOOSE_SCAR")) ?? "NO CHOOSE_SCAR FRAME";
    const received = receivedFrames.slice(-4).join(" | ").slice(-3_000);
    throw new Error(`Authoritative Scar choice did not resolve. Sent: ${scarFrame}. Received: ${received}. Visible: ${visibleText}`);
  }
  await phone.waitForTimeout(180);
  await phone.screenshot({ path: join(output, "scar-selector-resolved-390x844.png"), fullPage: false });

  await browser.close();
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ output, captures: 8, oneCardCarouselVerified: true, viewportTransitionScrollVerified: true, authoritativeChoiceResolved: true, errors: 0 }, null, 2));
}

void main();
