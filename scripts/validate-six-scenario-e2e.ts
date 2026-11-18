import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import WebSocket from "ws";
import { createInitialSessionState } from "../src/server/sessionState.js";
import { GameRoomServer, type ConnectedClient } from "../src/server/roomServer.js";
import { createSequenceRandomSource } from "../src/game/engine/dice.js";
import { reduceGameState } from "../src/game/engine/reducer.js";
import { getEscalationCollapseLevel, getEscalationModifier } from "../src/game/engine/escalation.js";
import { getScenarioDefinition, isScenarioEligibleForSession } from "../src/game/data/scenarios.js";
import { nemeses } from "../src/game/data/nemeses.js";
import type { GameState, SessionMode } from "../src/game/schema/session.schema.js";
import type { SectorCollapsedAction } from "../src/game/engine/actions.js";

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
  hostPresent: boolean;
  environmentPresent: boolean;
  operativeVisible: boolean;
  cardRevealPresent: boolean;
  progressionPresent: boolean;
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
  matrix: string;
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

type MatrixConfig = {
  label: string;
  sessionMode: SessionMode;
  seatCount: number;
  interactionMode: "co-op" | "rivalry";
};

type ScenarioTerminalResult = {
  scenarioId: string;
  scenarioName: string;
  matrix: string;
  victory: {
    pass: boolean;
    status: GameState["status"];
    winnerSeatId: string | null;
    errors: string[];
  };
  defeat: {
    pass: boolean;
    status: GameState["status"];
    winnerSeatId: string | null;
    errors: string[];
  };
};

const apiBaseUrl = process.env.SCENARIO_E2E_API_URL ?? "http://127.0.0.1:8080";
const clientBaseUrl = process.env.SCENARIO_E2E_CLIENT_URL ?? "http://127.0.0.1:5173";
const outputDirectory = resolve(process.env.SCENARIO_E2E_OUTPUT_DIR ?? ".tmp-playtest/six-scenario-e2e");
const smokeMatrices: MatrixConfig[] = [
  { label: "solo-1p", sessionMode: "single-player", seatCount: 1, interactionMode: "co-op" },
  { label: "coop-4p", sessionMode: "multiplayer", seatCount: 4, interactionMode: "co-op" },
  { label: "multiplayer-2p", sessionMode: "multiplayer", seatCount: 2, interactionMode: "rivalry" },
  { label: "multiplayer-4p", sessionMode: "multiplayer", seatCount: 4, interactionMode: "rivalry" },
  { label: "multiplayer-6p", sessionMode: "multiplayer", seatCount: 6, interactionMode: "rivalry" }
];

function isSupportedMatrix(scenario: ScenarioCatalogEntry, matrix: MatrixConfig): boolean {
  const definition = getScenarioDefinition(scenario.id);
  return Boolean(definition && isScenarioEligibleForSession(
    definition,
    matrix.sessionMode,
    matrix.interactionMode,
    "standard",
    matrix.seatCount
  ));
}

async function api<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${pathname}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Connection": "close",
        ...options.headers
      }
    });
  } catch (error) {
    throw new Error(`${options.method ?? "GET"} ${pathname} failed before a response`, { cause: error });
  }
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${pathname} failed ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

function getWsBaseUrl(): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}

async function markSeatReady(join: JoinResponse): Promise<WebSocket> {
  const socket = new WebSocket(`${getWsBaseUrl()}/?view=phone&token=${encodeURIComponent(join.seatToken)}`);

  await new Promise<void>((resolve, reject) => {
    let missionRequested = false;
    let characterRequested = false;
    let readyRequested = false;
    const requestedBonusOffers = new Set<string>();
    let setupDiagnostic = "No state patch received";
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`Timed out while setting ${join.seatId} ready: ${setupDiagnostic}`));
    }, 5000);

    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as {
        type?: string;
        reason?: string;
        payload?: {
          seats?: Array<{ seatId: string; ready: boolean; characterSelected?: boolean; characterId?: string; displayName?: string | null; kicked?: boolean }>;
          characterOptions?: Array<{ character: { id: string }; eligible: boolean }>;
          startingContractOptions?: Array<{ id: string }>;
          selectedStartingContract?: { id: string } | null;
          startingBonusSelection?: {
            offerId: string;
            options: Array<{ kind: "gear"; item: { id: string } } | { kind: "follower"; follower: { id: string } }>;
          } | null;
          startingBonusPickCount?: number;
        };
      };

      if (message.type === "INTENT_REJECTED") {
        clearTimeout(timeout);
        socket.close();
        reject(new Error(message.reason ?? `Ready rejected for ${join.seatId}`));
        return;
      }

      const ownSeat = message.payload?.seats?.find((seat) => seat.seatId === join.seatId);
      if (message.type === "STATE_PATCH") setupDiagnostic = JSON.stringify({
        ownSeat,
        bonusPicks: message.payload?.startingBonusPickCount,
        selectedContract: message.payload?.selectedStartingContract?.id,
        eligibleCharacters: message.payload?.characterOptions?.filter((entry) => entry.eligible).map((entry) => entry.character.id)
      });
      if (message.type === "STATE_PATCH" && ownSeat && !ownSeat.characterSelected) {
        const taken = new Set(message.payload?.seats?.filter((seat) => seat.seatId !== join.seatId && seat.displayName && !seat.kicked && seat.characterSelected !== false).map((seat) => seat.characterId));
        const option = message.payload?.characterOptions?.find((entry) => entry.eligible && !taken.has(entry.character.id));
        if (option && !characterRequested) {
          characterRequested = true;
          socket.send(JSON.stringify({ type: "SELECT_CHARACTER", seatId: join.seatId, characterId: option.character.id }));
        }
        return;
      }
      const firstMissionId = message.payload?.startingContractOptions?.[0]?.id;
      if (message.type === "STATE_PATCH" && firstMissionId && !missionRequested) {
        missionRequested = true;
        socket.send(
          JSON.stringify({
            type: "SELECT_STARTING_CONTRACT",
            seatId: join.seatId,
            contractId: firstMissionId
          })
        );
        return;
      }

      const bonusOffer = message.payload?.startingBonusSelection;
      const bonusOption = bonusOffer?.options[0];
      if (message.type === "STATE_PATCH" && bonusOffer && bonusOption && !requestedBonusOffers.has(bonusOffer.offerId)) {
        requestedBonusOffers.add(bonusOffer.offerId);
        socket.send(JSON.stringify({
          type: "SELECT_STARTING_BONUS",
          seatId: join.seatId,
          offerId: bonusOffer.offerId,
          optionKind: bonusOption.kind,
          optionId: bonusOption.kind === "gear" ? bonusOption.item.id : bonusOption.follower.id
        }));
        return;
      }

      if (message.type === "STATE_PATCH" && message.payload?.selectedStartingContract && message.payload.startingBonusPickCount === 2 && !readyRequested) {
        readyRequested = true;
        socket.send(
          JSON.stringify({
            type: "SET_READY",
            seatId: join.seatId,
            ready: true
          })
        );
      }

      if (
        message.type === "STATE_PATCH" &&
        message.payload?.seats?.some((seat) => seat.seatId === join.seatId && seat.ready)
      ) {
        clearTimeout(timeout);
        resolve();
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return socket;
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
  try {
    await page.waitForFunction(
      (scenarioName) => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes(String(scenarioName).toLowerCase()) && Boolean(document.querySelector('[data-testid="signal-environment-stage"]'));
      },
      scenario.name,
      { timeout: 10000 }
    );
  } catch (error) {
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 500);
    throw new Error(`TV did not settle for ${scenario.name} in room ${session.roomCode}: ${bodyText}`, { cause: error });
  }

  const metrics = await page.evaluate((scenarioName): SmokeMetrics => {
    const bodyText = document.body.innerText || "";
    const normalizedBody = bodyText.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedScenario = String(scenarioName).toLowerCase().replace(/\s+/g, " ").trim();
    const board = document.querySelector('[data-testid="signal-theatre-host"]');
    const surface = document.querySelector('[data-testid="signal-environment-stage"]');
    const boardRect = board?.getBoundingClientRect();
    const cardReveal = document.querySelector('[data-testid="tv-card-reveal"], [aria-label="Card reveal"]');
    return {
      scenarioVisible: normalizedBody.includes(normalizedScenario),
      noActiveScenarioVisible: /no active scenario/i.test(bodyText),
      hostPresent: Boolean(board),
      environmentPresent: Boolean(surface),
      operativeVisible: Boolean(document.querySelector(".signal-theatre__operative h2")?.textContent?.trim()),
      cardRevealPresent: Boolean(cardReveal),
      progressionPresent: Boolean(document.querySelector('[aria-label="Scenario progress and pressure"]')?.textContent?.trim()),
      insideSafeArea:
        !boardRect ||
        (boardRect.left >= 0 &&
          boardRect.top >= 0 &&
          boardRect.right <= window.innerWidth &&
          boardRect.bottom <= window.innerHeight)
    };
  }, scenario.name);

  await page.screenshot({ path: join(outputDirectory, `${slug(scenario.id)}-tv.png`), fullPage: true });
  await context.close();

  return { errors, metrics };
}

async function inspectPhone(browser: Browser, auth: JoinResponse & { displayName: string }) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
  await context.addInitScript((storedAuth: JoinResponse & { displayName: string }) => {
    window.localStorage.setItem("ashenreach.controllerSession", JSON.stringify(storedAuth));
  }, auth);

  const page = await context.newPage();
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !/blocked call to navigator\.vibrate/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(clientBaseUrl, { waitUntil: "networkidle" });
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
    result.tv.metrics.hostPresent &&
    result.tv.metrics.environmentPresent &&
    result.tv.metrics.operativeVisible &&
    result.tv.metrics.progressionPresent &&
    result.tv.metrics.insideSafeArea &&
    result.phone.metrics.controllerVisible &&
    result.phone.metrics.playerVisible &&
    result.phone.metrics.joinScreenGone &&
    !result.phone.metrics.horizontalOverflow
  );
}

function makeClient(seatId: string, errors: string[]): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        const message = JSON.parse(payload) as { type?: string; reason?: string };

        if (message.type === "INTENT_REJECTED") {
          errors.push(message.reason ?? "Intent rejected");
        }
      },
      close() {}
    } as ConnectedClient["socket"]
  };
}

function configuredTerminalState(scenario: ScenarioCatalogEntry, matrix: MatrixConfig): GameState {
  const definition = getScenarioDefinition(scenario.id);

  if (!definition) {
    throw new Error(`Unknown scenario ${scenario.id}`);
  }

  const occupiedSeatIds = Array.from({ length: matrix.seatCount }, (_, index) => `seat-${index + 1}`);
  const linkedNemesis = nemeses.find((nemesis) => nemesis.scenarioId === scenario.id) ?? null;
  const effectiveVictoryThreshold = linkedNemesis?.stats.life ?? definition.victoryThreshold;
  const state = createInitialSessionState(
    `terminal-${slug(scenario.id)}-${matrix.label}`,
    matrix.sessionMode,
    scenario.id,
    matrix.interactionMode
  );

  const configured: GameState = {
    ...state,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: occupiedSeatIds,
    scenarioProgress: {
      ...state.scenarioProgress,
      [definition.winConditionKey]: Math.max(effectiveVictoryThreshold, state.scenarioProgress[definition.winConditionKey] ?? 0),
      sealTokens: Math.max(6, state.scenarioProgress.sealTokens ?? 0),
      starTokens: Math.max(5, state.scenarioProgress.starTokens ?? 0),
      engineKeys: Math.max(3, state.scenarioProgress.engineKeys ?? 0)
    },
    seats: state.seats.map((seat) => {
      const occupied = occupiedSeatIds.includes(seat.seatId);

      return {
        ...seat,
        displayName: occupied ? `Terminal ${seat.seatId}` : null,
        connected: occupied,
        ready: occupied,
        characterSelected: occupied
      };
    }),
    players: state.players.map((player) =>
      player.seatId === "seat-1"
        ? {
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate",
              heat: 0,
              wounds: 0,
              trophies: 10,
              stats: {
                command: 20,
                grit: 20,
                signal: 20,
                guile: 20,
                forge: 20
              }
            }
          }
        : player
    )
  };

  if (scenario.id === "scenario_broken_concordance") {
    configured.scenarioPreparation = {
      ...configured.scenarioPreparation,
      resources: { ...configured.scenarioPreparation.resources, concordanceNodes: 3 },
      completedObjectiveIds: [
        "concordance-node-black-relay",
        "concordance-node-webglass",
        "concordance-node-cinder-lattice"
      ]
    };
    configured.scenarioConfrontation = {
      ...configured.scenarioConfrontation,
      progress: { ...configured.scenarioConfrontation.progress, concordanceStages: 2 }
    };
    const active = configured.players.find((player) => player.seatId === "seat-1");
    if (active) {
      active.private.notes = [...active.private.notes, "gate-of-cinders-breached"];
    }
  }

  return configured;
}

function runTerminalVictory(scenario: ScenarioCatalogEntry, matrix: MatrixConfig): ScenarioTerminalResult["victory"] {
  const errors: string[] = [];
  const server = new GameRoomServer(
    configuredTerminalState(scenario, matrix),
    [],
    createSequenceRandomSource(Array.from({ length: 30 }, () => 5))
  );

  server.handleIntent(makeClient("seat-1", errors), {
    type: "SCENARIO_CONFRONTATION_REQUESTED",
    seatId: "seat-1"
  });

  if (scenario.id === "scenario_broken_concordance") {
    const test = server.getState().pendingCooperativeTest;
    if (!test) {
      errors.push("Broken Concordance did not create its final cooperative test.");
    } else {
      server.handleIntent(makeClient("seat-1", errors), {
        type: "COOPERATIVE_ASSISTANCE_REQUESTED",
        seatId: "seat-1",
        sourceId: test.sourceId,
        stat: test.stat,
        helperSeatIds: ["seat-2"]
      });
      const request = server.getState().cooperativeAssistance;
      if (!request) {
        errors.push("Broken Concordance did not open its required assistance request.");
      } else {
        server.handleIntent(makeClient("seat-2", errors), {
          type: "COOPERATIVE_ASSISTANCE_RESPONDED",
          seatId: "seat-2",
          requestId: request.id,
          accept: true
        });
        server.handleIntent(makeClient("seat-1", errors), {
          type: "COOPERATIVE_ASSISTANCE_LOCKED",
          seatId: "seat-1",
          requestId: request.id
        });
        server.handleIntent(makeClient("seat-1", errors), {
          type: "COOPERATIVE_TEST_ROLL_REQUESTED",
          seatId: "seat-1",
          testId: test.id
        });
      }
    }
  }

  const state = server.getState();

  return {
    pass: errors.length === 0 && state.status === "ended" && state.winnerSeatId === "seat-1",
    status: state.status,
    winnerSeatId: state.winnerSeatId,
    errors
  };
}

function runTerminalDefeat(scenario: ScenarioCatalogEntry, matrix: MatrixConfig): ScenarioTerminalResult["defeat"] {
  const state = configuredTerminalState(scenario, matrix);
  const threshold = getEscalationCollapseLevel(matrix.sessionMode);
  const action = {
    type: "SECTOR_COLLAPSED",
    seatId: "seat-1",
    threshold,
    modifier: getEscalationModifier(threshold),
    summary: `${scenario.name} forced-defeat terminal check.`,
    createdAt: new Date().toISOString()
  } satisfies SectorCollapsedAction;
  const result = reduceGameState(state, action);

  if (!result.ok) {
    return {
      pass: false,
      status: state.status,
      winnerSeatId: state.winnerSeatId,
      errors: [result.rejection.reason]
    };
  }

  return {
    pass: result.state.status === "ended" && result.state.winnerSeatId === null,
    status: result.state.status,
    winnerSeatId: result.state.winnerSeatId,
    errors: []
  };
}

function runTerminalChecks(scenarios: ScenarioCatalogEntry[]): ScenarioTerminalResult[] {
  return scenarios.flatMap((scenario) =>
    smokeMatrices.filter((matrix) => isSupportedMatrix(scenario, matrix)).map((matrix) => {
      const victory = runTerminalVictory(scenario, matrix);
      const defeat = runTerminalDefeat(scenario, matrix);

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        matrix: matrix.label,
        victory,
        defeat
      };
    })
  );
}

async function main(): Promise<void> {
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });

  const [{ scenarios }, { characters }] = await Promise.all([
    api<{ scenarios: ScenarioCatalogEntry[] }>("/api/scenarios"),
    api<{ characters: CharacterCatalogEntry[] }>("/api/characters")
  ]);

  if (scenarios.length === 0) {
    throw new Error("No authored scenarios returned from /api/scenarios");
  }

  if (characters.length === 0) {
    throw new Error("No characters returned from /api/characters");
  }

  const browser = await chromium.launch({ headless: true });
  const results: ScenarioSmokeResult[] = [];
  const terminalResults = runTerminalChecks(scenarios);

  try {
    for (const [scenarioIndex, scenario] of scenarios.entries()) {
      for (const [matrixIndex, matrix] of smokeMatrices.entries()) {
      if (!isSupportedMatrix(scenario, matrix)) continue;
      const session = await api<SessionCreateResponse>("/api/session/create", {
        method: "POST",
        body: JSON.stringify({
          sessionMode: matrix.sessionMode,
          interactionMode: matrix.interactionMode,
          scenarioId: scenario.id
        })
      });
      const joinedSeats: Array<JoinResponse & { displayName: string }> = [];
      const readySockets: WebSocket[] = [];

      for (let seatIndex = 0; seatIndex < matrix.seatCount; seatIndex += 1) {
        const displayName = `S${scenarioIndex + 1}M${matrixIndex + 1}P${seatIndex + 1}`;
        const join = await api<JoinResponse>("/api/session/join", {
          method: "POST",
          body: JSON.stringify({
            roomCode: session.roomCode,
            displayName
          })
        });
        joinedSeats.push({ ...join, displayName });
        readySockets.push(await markSeatReady(join));
      }

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
        matrix: matrix.label,
        roomCode: session.roomCode,
        pass: false,
        tv: await inspectTv(browser, scenario, session),
        phone: await inspectPhone(browser, joinedSeats[0]!)
      };
      readySockets.forEach((socket) => socket.close());

      result.pass = didPass(result);
      results.push(result);
      console.log(`${result.pass ? "PASS" : "FAIL"} ${scenario.name} ${matrix.label}`);
      }
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
    terminalCount: terminalResults.length,
    terminalPassed: terminalResults.filter((result) => result.victory.pass && result.defeat.pass).length,
    terminalFailed: terminalResults.filter((result) => !result.victory.pass || !result.defeat.pass).length,
    terminalResults,
    results
  };

  writeFileSync(join(outputDirectory, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        scenarioCount: summary.scenarioCount,
        passed: summary.passed,
        failed: summary.failed,
        terminalCount: summary.terminalCount,
        terminalPassed: summary.terminalPassed,
        terminalFailed: summary.terminalFailed,
        outputDirectory
      },
      null,
      2
    )
  );

  if (summary.failed > 0 || summary.terminalFailed > 0) {
    process.exitCode = 1;
  }
}

void main();
