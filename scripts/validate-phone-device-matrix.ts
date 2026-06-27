import { chromium, firefox, webkit, type BrowserType } from "playwright";

type Viewport = {
  width: number;
  height: number;
};

type DeviceProfile = {
  name: string;
  portrait: Viewport;
  landscape: Viewport;
};

type LayoutMetrics = {
  viewport: Viewport;
  documentScrollWidth: number;
  documentScrollHeight: number;
  windowInnerWidth: number;
  windowInnerHeight: number;
  sheetCardRect: RectLike | null;
  topbarRect: RectLike | null;
  layoutRect: RectLike | null;
  bottomRect: RectLike | null;
  debugRect: RectLike | null;
  portraitPanelRect: RectLike | null;
  portraitChipRowRect: RectLike | null;
  portraitRotateHintRect: RectLike | null;
  characterWaitingRect: RectLike | null;
  hasLandscapeCard: boolean;
  hasPortraitController: boolean;
  hasCharacterWaiting: boolean;
  hasPortraitStats: boolean;
  hasPortraitActions: boolean;
  hasPortraitLeaveButton: boolean;
  hasWaitingBackButton: boolean;
  hasWaitingMessage: boolean;
  hasPortraitRotateHint: boolean;
  hasRotateWarning: boolean;
  horizontalOverflow: boolean;
  verticalOverflow: boolean;
};

type RectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DeviceResult = {
  browser: string;
  device: string;
  portrait: LayoutMetrics;
  landscape: LayoutMetrics;
  pass: boolean;
  failures: string[];
};

type BrowserProfile = {
  label: string;
  type: BrowserType;
};

type BrowserSkip = {
  browser: string;
  reason: string;
};

const deviceProfiles: DeviceProfile[] = [
  { name: "iPhone 15", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 15 Pro", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 16", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 16 Pro", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 16 Plus", portrait: { width: 430, height: 932 }, landscape: { width: 932, height: 430 } },
  { name: "iPhone 16 Pro Max", portrait: { width: 430, height: 932 }, landscape: { width: 932, height: 430 } },
  { name: "iPhone 17", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 17 Pro", portrait: { width: 393, height: 852 }, landscape: { width: 852, height: 393 } },
  { name: "iPhone 17 Pro Max", portrait: { width: 430, height: 932 }, landscape: { width: 932, height: 430 } },
  { name: "Galaxy S24", portrait: { width: 360, height: 780 }, landscape: { width: 780, height: 360 } },
  { name: "Galaxy S25", portrait: { width: 360, height: 780 }, landscape: { width: 780, height: 360 } },
  { name: "Galaxy S25+", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Galaxy S25 Ultra", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Galaxy A54", portrait: { width: 384, height: 854 }, landscape: { width: 854, height: 384 } },
  { name: "Pixel 8", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Pixel 9", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Pixel 9 Pro", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Pixel 9 Pro XL", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Moto G Stylus", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
  { name: "Motorola Edge", portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } }
];

const browserProfiles: BrowserProfile[] = [
  { label: "chromium", type: chromium },
  { label: "webkit", type: webkit },
  { label: "firefox", type: firefox }
];

function getBaseUrl(): string {
  return process.env.PHONE_UI_BASE_URL ?? "http://127.0.0.1:5173";
}

function getApiBaseUrl(): string {
  if (process.env.PHONE_UI_API_URL) {
    return process.env.PHONE_UI_API_URL;
  }

  return getBaseUrl().replace(":5173", ":8086");
}

async function collectMetrics(page: import("playwright").Page, viewport: Viewport): Promise<LayoutMetrics> {
  const payload = JSON.stringify({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    selectors: {
      sheetCard: ".phone-sheet-card",
      topbar: ".phone-sheet-topbar",
      layout: ".phone-sheet-layout",
      bottom: ".phone-sheet-bottom",
      debug: ".phone-debug-anchor",
      portraitPanel: ".phone-portrait-panel",
      portraitChipRow: ".phone-portrait-chip-row",
      portraitRotateHint: ".phone-portrait-rotate-hint",
      characterWaiting: ".phone-character-waiting-panel",
      rotateWarning: ".phone-rotate-warning"
    }
  });

  return await page.evaluate(`
    (() => {
      const { viewportWidth, viewportHeight, selectors } = ${payload};
      const getRect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };

      const sheetCardRect = getRect(selectors.sheetCard);
      const topbarRect = getRect(selectors.topbar);
      const layoutRect = getRect(selectors.layout);
      const bottomRect = getRect(selectors.bottom);
      const debugRect = getRect(selectors.debug);
      const portraitPanelRect = getRect(selectors.portraitPanel);
      const portraitChipRowRect = getRect(selectors.portraitChipRow);
      const portraitRotateHintRect = getRect(selectors.portraitRotateHint);
      const characterWaitingRect = getRect(selectors.characterWaiting);
      const documentScrollWidth = document.documentElement.scrollWidth;
      const documentScrollHeight = document.documentElement.scrollHeight;
      const windowInnerWidth = window.innerWidth;
      const windowInnerHeight = window.innerHeight;
      const hasLandscapeCard = Boolean(document.querySelector(".phone-sheet-card-landscape"));
      const hasPortraitController = Boolean(document.querySelector(".phone-portrait-controller"));
      const hasCharacterWaiting = Boolean(document.querySelector(".phone-character-waiting-panel"));
      const hasPortraitStats = Boolean(
        document.querySelector(".phone-portrait-body, .phone-portrait-stats, .phone-portrait-attributes, .phone-portrait-summary")
      );
      const hasPortraitActions = Boolean(document.querySelector(".phone-portrait-actions, .phone-sheet-actions"));
      const hasPortraitLeaveButton = Boolean(document.querySelector(".phone-portrait-leave-button, .phone-sheet-leave-button"));
      const hasWaitingBackButton = Boolean(document.querySelector(".phone-lobby-ready-button"));
      const hasWaitingMessage = Array.from(document.querySelectorAll("p, span, strong")).some((element) =>
        /waiting for host to start/i.test(element.textContent ?? "")
      );
      const hasPortraitRotateHint = Boolean(document.querySelector(".phone-portrait-rotate-hint"));
      const hasRotateWarning = Boolean(document.querySelector(selectors.rotateWarning));

      return {
        viewport: { width: viewportWidth, height: viewportHeight },
        documentScrollWidth,
        documentScrollHeight,
        windowInnerWidth,
        windowInnerHeight,
        sheetCardRect,
        topbarRect,
        layoutRect,
        bottomRect,
        debugRect,
        portraitPanelRect,
        portraitChipRowRect,
        portraitRotateHintRect,
        characterWaitingRect,
        hasLandscapeCard,
        hasPortraitController,
        hasCharacterWaiting,
        hasPortraitStats,
        hasPortraitActions,
        hasPortraitLeaveButton,
        hasWaitingBackButton,
        hasWaitingMessage,
        hasPortraitRotateHint,
        hasRotateWarning,
        horizontalOverflow: documentScrollWidth > windowInnerWidth + 1,
        verticalOverflow: documentScrollHeight > windowInnerHeight + 1
      };
    })()
  `);
}

function validateMetrics(metrics: LayoutMetrics, mode: "portrait" | "landscape"): string[] {
  const failures: string[] = [];

  if (metrics.horizontalOverflow) {
    failures.push("horizontal overflow");
  }

  if (mode === "portrait") {
    const hasPortraitScreen = metrics.hasPortraitController || metrics.hasCharacterWaiting;
    const isInGameController = metrics.hasPortraitController && !metrics.hasCharacterWaiting;

    if (!hasPortraitScreen || (!metrics.portraitPanelRect && !metrics.characterWaitingRect)) {
      failures.push("missing portrait controller or waiting panel");
    }

    if (isInGameController && !metrics.portraitChipRowRect) {
      failures.push("missing portrait chip row");
    }

    if (metrics.hasLandscapeCard) {
      failures.push("landscape card rendered in portrait");
    }

    if (!metrics.hasPortraitStats) {
      failures.push("portrait missing stats/details");
    }

    if (isInGameController && !metrics.hasPortraitActions) {
      failures.push("portrait missing quick actions");
    }

    if (isInGameController && !metrics.hasPortraitLeaveButton) {
      failures.push("portrait missing leave button");
    }

    if (metrics.hasCharacterWaiting && !metrics.hasWaitingBackButton) {
      failures.push("waiting screen missing back button");
    }

    if (metrics.hasCharacterWaiting && !metrics.hasWaitingMessage) {
      failures.push("waiting screen missing host waiting message");
    }

    return failures;
  }

  if (!metrics.hasRotateWarning) {
    failures.push("missing portrait rotation warning");
  }

  if (metrics.hasLandscapeCard) {
    failures.push("landscape player card rendered");
  }

  if (metrics.hasPortraitController) {
    failures.push("portrait controller rendered in landscape");
  }

  return failures;
}

async function main(): Promise<void> {
  const results: DeviceResult[] = [];
  const skippedBrowsers: BrowserSkip[] = [];

  try {
    for (const browserProfile of browserProfiles) {
      let browser: import("playwright").Browser | null = null;

      try {
        browser = await browserProfile.type.launch({ headless: true });
      } catch (error) {
        skippedBrowsers.push({
          browser: browserProfile.label,
          reason: error instanceof Error ? error.message : "Browser launch failed"
        });
        continue;
      }

      try {
        for (const profile of deviceProfiles) {
          const sessionResponse = await fetch(`${getApiBaseUrl()}/api/session/create`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({})
          });

          if (!sessionResponse.ok) {
            throw new Error(`Could not create session for ${browserProfile.label} ${profile.name}`);
          }

          const session = (await sessionResponse.json()) as { roomCode?: string };
          const roomCode = session.roomCode;

          if (!roomCode) {
            throw new Error(`Session response missing room code for ${browserProfile.label} ${profile.name}`);
          }

          const context = await browser.newContext({ viewport: profile.portrait });
          const page = await context.newPage();

          try {
            await page.goto(`${getBaseUrl()}/`, { waitUntil: "domcontentloaded" });
            await page.getByRole("textbox", { name: "Room code" }).fill(roomCode);
            await page.getByRole("textbox", { name: "Player name" }).fill("QA");
            await page.getByRole("button", { name: "Continue" }).click();
            await page.getByRole("button", { name: /signal witch/i }).click();
            await page.locator(".phone-character-waiting-panel").waitFor({ state: "visible", timeout: 10000 });
            await page.waitForTimeout(350);

            const portraitMetrics = await collectMetrics(page, profile.portrait);

            await page.setViewportSize(profile.landscape);
            await page.waitForTimeout(700);

            const landscapeMetrics = await collectMetrics(page, profile.landscape);
            const failures = [
              ...validateMetrics(portraitMetrics, "portrait").map((failure) => `portrait: ${failure}`),
              ...validateMetrics(landscapeMetrics, "landscape").map((failure) => `landscape: ${failure}`)
            ];

            results.push({
              browser: browserProfile.label,
              device: profile.name,
              portrait: portraitMetrics,
              landscape: landscapeMetrics,
              pass: failures.length === 0,
              failures
            });
          } finally {
            await context.close();
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    // no-op, per-browser cleanup happens in-loop
  }

  const failures = results.filter((result) => !result.pass);
  console.log(JSON.stringify({ checked: results.length, failures: failures.length, skippedBrowsers, results }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

void main();
