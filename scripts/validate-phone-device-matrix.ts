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
  hasLandscapeCard: boolean;
  hasPortraitController: boolean;
  hasPortraitStats: boolean;
  hasPortraitActions: boolean;
  hasPortraitLeaveButton: boolean;
  hasPortraitRotateHint: boolean;
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
      portraitRotateHint: ".phone-portrait-rotate-hint"
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
      const documentScrollWidth = document.documentElement.scrollWidth;
      const documentScrollHeight = document.documentElement.scrollHeight;
      const windowInnerWidth = window.innerWidth;
      const windowInnerHeight = window.innerHeight;
      const hasLandscapeCard = Boolean(document.querySelector(".phone-sheet-card-landscape"));
      const hasPortraitController = Boolean(document.querySelector(".phone-portrait-controller"));
      const hasPortraitStats = Boolean(
        document.querySelector(".phone-portrait-body, .phone-portrait-stats, .phone-portrait-attributes, .phone-portrait-summary")
      );
      const hasPortraitActions = Boolean(document.querySelector(".phone-portrait-actions, .phone-sheet-actions"));
      const hasPortraitLeaveButton = Boolean(document.querySelector(".phone-portrait-topline button, .phone-sheet-leave-button"));
      const hasPortraitRotateHint = Boolean(document.querySelector(".phone-portrait-rotate-hint"));

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
        hasLandscapeCard,
        hasPortraitController,
        hasPortraitStats,
        hasPortraitActions,
        hasPortraitLeaveButton,
        hasPortraitRotateHint,
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

  if (metrics.verticalOverflow) {
    failures.push("vertical overflow");
  }

  if (mode === "portrait") {
    if (!metrics.hasPortraitController || !metrics.portraitPanelRect) {
      failures.push("missing portrait controller panel");
    }

    if (!metrics.portraitChipRowRect) {
      failures.push("missing portrait chip row");
    }

    if (metrics.hasLandscapeCard) {
      failures.push("landscape card rendered in portrait");
    }

    if (!metrics.hasPortraitStats) {
      failures.push("portrait missing stats/details");
    }

    if (!metrics.hasPortraitActions) {
      failures.push("portrait missing quick actions");
    }

    if (!metrics.hasPortraitLeaveButton) {
      failures.push("portrait missing leave button");
    }

    return failures;
  }

  if (!metrics.hasLandscapeCard) {
    failures.push("missing landscape player card");
  }

  if (!metrics.sheetCardRect || metrics.sheetCardRect.width < metrics.viewport.width * 0.85) {
    failures.push("sheet card too narrow");
  }

  if (!metrics.topbarRect || metrics.topbarRect.y < -1) {
    failures.push("topbar out of bounds");
  }

  if (!metrics.bottomRect || metrics.bottomRect.y + metrics.bottomRect.height > metrics.windowInnerHeight + 1) {
    failures.push("bottom action rail out of bounds");
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
            await page.getByRole("textbox", { name: "Display name" }).fill("QA");
            await page
              .locator("label.phone-character-option")
              .filter({ has: page.locator('input[name="characterId"][value="signal-witch"]') })
              .click();
            await page.getByRole("button", { name: "Join room" }).click();
            await page.locator(".phone-controller-layout").waitFor({ state: "visible", timeout: 10000 });
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
