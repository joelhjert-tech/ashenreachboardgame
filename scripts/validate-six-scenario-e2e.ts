import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser } from "playwright";

type ScenarioCatalogEntry = {
  id: string;
  name: string;
};

type CharacterCatalogEntry = {
  id: string;
};

type SessionCreateResponse = {
  roomCode: string;
  hostToken: string;
};

type JoinResponse = {
  roomCode: string;
  seatId: string;
  seatToken: string;
};

type SmokeMetrics = {
  scenarioVisible: boolean;
  noActiveScenarioVisible: boolean;
  cinderGateVisible: boolean;
  boardPresent: boolean;
  surfacePresent: boolean;
  tileCount: number;
  labeledTiles: number;
  cardRevealPresent: boolean;
  rightRailPresent: boolean;
  insideSafeArea: boolean;
};

type PhoneMetrics = {
  controllerVisible: boolean;
  playerVisible: boolean;
  joinScreenGone: boolean;
  horizontalOverflow: boolean;
  verticalOverflow: boolean;
};

type ScenarioSmokeResult = {
  scenarioId: string;
  scenarioName: string;
  roomCode: string;
  pass: boolean;
  tv: {
    errors: string[];
    metrics: SmokeMetrics;
  };
  phone: {
    errors: string[];
    metrics: PhoneMetrics;
  };
};

const apiBaseUrl = process.env.SCENARIO_E2E_API_URL ?? "http://127.0.0.1:8080";
const clientBaseUrl = process.env.SCENARIO_E2E_CLIENT_URL ?? "http://127.0.0.1:5173";
const outputDirectory = resolve(process.env.SCENARIO_E2E_OUTPUT_DIR ?? ".tmp-playtest/six-scenario-e2e");

async function api<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${pathname} failed ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

function slug(value: string): string {
  return value
    .replace(/^scenario_/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function inspectTv(browser: Browser, scenario: ScenarioCatalogEntry, session: SessionCreateResponse) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(
    ({ roomCode, hostToken }: { roomCode: string; hostToken: string }) => {
      window.localStorage.setItem("ashen-reach-tv-room-code", roomCode);
      window.localStorage.setItem("ashen-reach-tv-host-token", hostToken);
    },
    session
  );

  const page = await context.newPage();
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${clientBaseUrl}/tv`, { waitUntil: "networkidle" });
  await page
    .waitForFunction((scenarioName) => document.body.innerText.toLowerCase().includes(String(scenarioName).toLowerCase()), scenario.name, {
      timeout: 7000
    })
    .catch(() => undefined);
  await page.waitForTimeout(700);

  const metrics = await page.evaluate((scenarioName): SmokeMetrics => {
    const bodyText = document.body.innerText || "";
    const normalizedBody = bodyText.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedScenario = String(scenarioName).toLowerCase().replace(/\s+/g, " ").trim();
    const board = document.querySelector(".tv-board-panel");
    const surface = document.querySelector(".talisman-board-surface");
    const boardRect = board?.getBoundingClientRect();
    const tileCount = document.querySelectorAll(".talisman-board-tile").length;
    const labeledTiles = Array.from(document.querySelectorAll(".talisman-board-tile")).filter((tile) =>
      (tile.textContent || tile.getAttribute("aria-label") || "").trim().length > 0
    ).length;
    const unsafeX = window.innerWidth * 0.05;
    const unsafeY = window.innerHeight * 0.05;

    return {
      scenarioVisible: normalizedBody.includes(normalizedScenario),
      noActiveScenarioVisible: /no active scenario/i.test(bodyText),
      cinderGateVisible: /cinder gate/i.test(bodyText),
      boardPresent: Boolean(board),
      surfacePresent: Boolean(surface),
      tileCount,
      labeledTiles,
      cardRevealPresent: /card reveal/i.test(bodyText),
      rightRailPresent: /scenario/i.test(bodyText) && /escalation/i.test(bodyText) && /contracts/i.test(bodyText),
      insideSafeArea:
        !boardRect ||
        (boardRect.left >= unsafeX &&
          boardRect.top >= unsafeY &&
          boardRect.right <= window.innerWidth - unsafeX &&
          boardRect.bottom <= window.innerHeight - unsafeY)
    };
  }, scenario.name);

  await page.screenshot({ path: join(outputDirectory, `${slug(scenario.id)}-tv.png`), fullPage: true });
  await context.close();

  return { errors, metrics };
}

async function inspectPhone(browser: Browser, auth: JoinResponse & { displayName: string }) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
  await context.addInitScript((storedAuth: JoinResponse & { displayName: string }) => {
    window.localStorage.setItem("ashen-reach-phone-auth", JSON.stringify(storedAuth));
  }, auth);

  const page = await context.newPage();
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${clientBaseUrl}/?debug`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const metrics = await page.evaluate((displayName): PhoneMetrics => {
    const bodyText = document.body.innerText || "";

    return {
      controllerVisible: /controller|actions|move|roll|end turn|rejoining session/i.test(bodyText),
      playerVisible: bodyText.includes(String(displayName)),
      joinScreenGone: !/claim your seat/i.test(bodyText),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      verticalOverflow: document.documentElement.scrollHeight > window.innerHeight + 1
    };
  }, auth.displayName);

  await page.screenshot({ path: join(outputDirectory, `${auth.roomCode}-phone.png`), fullPage: true });
  await context.close();

  return { errors, metrics };
}

function didPass(result: ScenarioSmokeResult): boolean {
  return (
    result.tv.errors.length === 0 &&
    result.phone.errors.length === 0 &&
    result.tv.metrics.scenarioVisible &&
    !result.tv.metrics.noActiveScenarioVisible &&
    result.tv.metrics.cinderGateVisible &&
    result.tv.metrics.boardPresent &&
    result.tv.metrics.surfacePresent &&
    result.tv.metrics.tileCount >= 27 &&
    result.tv.metrics.labeledTiles >= 27 &&
    result.tv.metrics.cardRevealPresent &&
    result.tv.metrics.rightRailPresent &&
    result.tv.metrics.insideSafeArea &&
    result.phone.metrics.controllerVisible &&
    result.phone.metrics.playerVisible &&
    result.phone.metrics.joinScreenGone &&
    !result.phone.metrics.horizontalOverflow
  );
}

async function main(): Promise<void> {
  mkdirSync(outputDirectory, { recursive: true });

  const [{ scenarios }, { characters }] = await Promise.all([
    api<{ scenarios: ScenarioCatalogEntry[] }>("/api/scenarios"),
    api<{ characters: CharacterCatalogEntry[] }>("/api/characters")
  ]);

  if (scenarios.length !== 6) {
    throw new Error(`Expected 6 authored scenarios, found ${scenarios.length}`);
  }

  if (characters.length === 0) {
    throw new Error("No characters returned from /api/characters");
  }

  const browser = await chromium.launch({ headless: true });
  const results: ScenarioSmokeResult[] = [];

  try {
    for (const [index, scenario] of scenarios.entries()) {
      const session = await api<SessionCreateResponse>("/api/session/create", {
        method: "POST",
        body: JSON.stringify({
          sessionMode: "multiplayer",
          interactionMode: "rivalry",
          scenarioId: scenario.id
        })
      });
      const displayName = `Smoke ${index + 1}`;
      const join = await api<JoinResponse>("/api/session/join", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          displayName,
          characterId: characters[index % characters.length]?.id
        })
      });
      await api("/api/session/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          hostToken: session.hostToken
        })
      });

      const result: ScenarioSmokeResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        roomCode: session.roomCode,
        pass: false,
        tv: await inspectTv(browser, scenario, session),
        phone: await inspectPhone(browser, { ...join, displayName })
      };

      result.pass = didPass(result);
      results.push(result);
      console.log(`${result.pass ? "PASS" : "FAIL"} ${scenario.name}`);
    }
  } finally {
    await browser.close();
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    apiBaseUrl,
    clientBaseUrl,
    scenarioCount: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results
  };

  writeFileSync(join(outputDirectory, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ scenarioCount: summary.scenarioCount, passed: summary.passed, failed: summary.failed, outputDirectory }, null, 2));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

void main();
