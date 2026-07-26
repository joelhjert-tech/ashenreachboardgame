import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import WebSocket from "ws";

type InteractionMode = "co-op" | "rivalry";
type SessionMode = "single-player" | "multiplayer";

interface CampaignCase {
  id: string;
  scenarioId: string;
  scenarioName: string;
  playerCount: number;
  sessionMode: SessionMode;
  interactionMode: InteractionMode;
}

interface SessionResponse {
  roomCode: string;
  hostToken: string;
  status?: string;
  phase?: string;
}

interface SessionSummary {
  roomCode: string;
  status: "lobby" | "active" | "ended";
  phase: string;
  scenarioId: string;
  seats: Array<{
    seatId: string;
    displayName: string | null;
    connected: boolean;
    ready: boolean;
    kicked: boolean;
  }>;
}

interface DomButton {
  index: number;
  text: string;
  ariaLabel: string;
  className: string;
  testId: string;
  ancestorTestId: string;
  context: string;
  disabled: boolean;
  visible: boolean;
  pressed: boolean | null;
}

interface DomSnapshot {
  url: string;
  title: string;
  text: string;
  buttons: DomButton[];
  viewport: { width: number; height: number; dpr: number };
  documentSize: { width: number; height: number };
  horizontalOverflow: boolean;
  canvasCount: number;
  requiredAction: {
    status: string | null;
    transitionStage: string | null;
    text: string;
  } | null;
  movementState: string | null;
  resultGateVisible: boolean;
  matchResultVisible: boolean;
  matchResultOutcome: "victory" | "defeat" | "draw" | null;
}

interface ChosenAction {
  buttonIndex: number;
  button: DomButton;
  label: string;
  reason: string;
}

interface ActionEvidence {
  at: string;
  elapsedMs: number;
  seat: number;
  player: string;
  action: string;
  reason: string;
  phaseHint: string | null;
  transitionStage: string | null;
  resultGateVisible: boolean;
}

interface ViewportEvidence {
  at: string;
  seat: number;
  width: number;
  height: number;
  dpr: number;
  documentWidth: number;
  documentHeight: number;
  horizontalOverflow: boolean;
  canvasCount: number;
}

interface TypographyEvidence {
  checkpoint: string;
  capturedAt: string;
  viewport: { width: number; height: number; dpr: number };
  samples: Array<{
    selector: string;
    sample: string;
    kind: "interactive" | "heading" | "body" | "metadata";
    fontSizePx: number;
    lineHeightPx: number;
    width: number;
    height: number;
    targetWidth: number | null;
    targetHeight: number | null;
    clippedX: boolean;
    clippedY: boolean;
    overlapsNavigation: boolean;
    belowTarget: boolean;
    touchTargetTooSmall: boolean;
  }>;
  counts: {
    visibleText: number;
    belowTarget: number;
    clipped: number;
    navigationOverlap: number;
    smallTouchTargets: number;
  };
}

interface CampaignCaseResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  playerCount: number;
  interactionMode: InteractionMode;
  textScale: number;
  roomCode: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  outcome: "victory" | "defeat" | "ended-unknown" | "incomplete";
  terminalStatus: SessionSummary["status"];
  terminalPhase: string;
  actionCount: number;
  actionsBySeat: Record<string, number>;
  reconnectChecks: string[];
  mechanicsSeen: string[];
  screenshots: string[];
  recordings: string[];
  phoneConsoleErrors: string[];
  tvConsoleErrors: string[];
  requestFailures: string[];
  horizontalOverflowCount: number;
  canvasCountMaximum: number;
  stall: string | null;
  actions: ActionEvidence[];
  viewports: ViewportEvidence[];
  typography: TypographyEvidence[];
}

interface CampaignSummary {
  schemaVersion: 1;
  startedAt: string;
  completedAt: string;
  apiOrigin: string;
  clientOrigin: string;
  physicalDevice: {
    serial: string;
    model: string;
    viewport: { width: number; height: number; dpr: number };
  };
  casesRequested: string[];
  passed: number;
  failed: number;
  results: CampaignCaseResult[];
}

interface PhoneSurface {
  readonly label: string;
  readonly consoleErrors: string[];
  readonly requestFailures: string[];
  evaluate<T>(expression: string): Promise<T>;
  clickButton(button: DomButton): Promise<boolean>;
  fillInput(name: string, value: string): Promise<void>;
  snapshot(): Promise<DomSnapshot>;
  screenshot(path: string): Promise<void>;
  close(): Promise<void>;
}

const apiOrigin = process.env.ASHEN_REACH_API_ORIGIN ?? "http://127.0.0.1:8080";
const clientOrigin = process.env.ASHEN_REACH_CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const cdpOrigin = process.env.ASHEN_REACH_S21_CDP_ORIGIN ?? "http://127.0.0.1:9222";
const deviceSerial = process.env.ASHEN_REACH_ANDROID_SERIAL ?? "RFCNC0XMY5B";
const outputRoot = resolve(process.env.ASHEN_REACH_CAMPAIGN_OUTPUT ?? ".tmp-playtest/s21-full-game-campaign");
const maxActions = Number(readArg("max-actions") ?? process.env.ASHEN_REACH_CAMPAIGN_MAX_ACTIONS ?? 1200);
const maxStallMs = Number(readArg("max-stall-ms") ?? process.env.ASHEN_REACH_CAMPAIGN_MAX_STALL_MS ?? 20_000);
const selectedCase = readArg("case") ?? "all";
const textScale = Number(readArg("text-scale") ?? process.env.ASHEN_REACH_CAMPAIGN_TEXT_SCALE ?? 1);

const campaignCases: CampaignCase[] = [
  {
    id: "broken-seal-1p",
    scenarioId: "scenario_broken_seal",
    scenarioName: "The Broken Seal",
    playerCount: 1,
    sessionMode: "single-player",
    interactionMode: "co-op"
  },
  {
    id: "throne-of-ash-2p-rivalry",
    scenarioId: "scenario_throne_of_ash",
    scenarioName: "The Throne of Ash",
    playerCount: 2,
    sessionMode: "multiplayer",
    interactionMode: "rivalry"
  },
  {
    id: "mirror-false-heroes-3p",
    scenarioId: "scenario_mirror_of_false_heroes",
    scenarioName: "The Mirror of False Heroes",
    playerCount: 3,
    sessionMode: "multiplayer",
    interactionMode: "co-op"
  },
  {
    id: "devourer-beneath-4p",
    scenarioId: "scenario_devourer_beneath",
    scenarioName: "The Devourer Beneath",
    playerCount: 4,
    sessionMode: "multiplayer",
    interactionMode: "co-op"
  },
  {
    id: "dying-star-5p",
    scenarioId: "scenario_dying_star",
    scenarioName: "The Dying Star",
    playerCount: 5,
    sessionMode: "multiplayer",
    interactionMode: "co-op"
  },
  {
    id: "broken-concordance-6p",
    scenarioId: "scenario_broken_concordance",
    scenarioName: "The Broken Concordance",
    playerCount: 6,
    sessionMode: "multiplayer",
    interactionMode: "co-op"
  },
  {
    id: "labyrinth-engine-3p",
    scenarioId: "scenario_labyrinth_engine",
    scenarioName: "The Labyrinth Engine",
    playerCount: 3,
    sessionMode: "multiplayer",
    interactionMode: "co-op"
  }
];

const playerNames = ["S21", "P2", "P3", "P4", "P5", "P6"];
const pieceNames = ["Beacon", "Bastion", "Lantern", "Harrow", "Reliquary", "Compass"];
const operativeNames = ["Bjornis", "Brask Ode", "Cinder Wattle", "Deepdale", "Dessa Korr", "Dr. Yuna Castell"];
const ignoredButtonPatterns = [
  /^(operative|kit|inventory|objectives|move|battle|shop|action|more)/i,
  /^review lore$/i,
  /^view details$/i,
  /^inspect$/i,
  /^change$/i,
  /^dice result/i,
  /^movement roll/i,
  /^leave room$/i,
  /^player card$/i
];

const snapshotExpression = `(() => {
  const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const buttons = [...document.querySelectorAll("button")].map((button, index) => {
    const ancestorWithTestId = button.closest("[data-testid]");
    const movementCard = button.closest('[data-testid="movement-destination"]');
    const contextRoot = movementCard ?? button.closest("article, section, fieldset, [role=dialog]") ?? button.parentElement;
    return {
      index,
      text: normalize(button.textContent),
      ariaLabel: normalize(button.getAttribute("aria-label")),
      className: normalize(button.className),
      testId: normalize(button.getAttribute("data-testid")),
      ancestorTestId: normalize(ancestorWithTestId?.getAttribute("data-testid")),
      context: normalize(contextRoot?.textContent).slice(0, 700),
      disabled: Boolean(button.disabled || button.getAttribute("aria-disabled") === "true"),
      visible: visible(button),
      pressed: button.hasAttribute("aria-pressed") ? button.getAttribute("aria-pressed") === "true" : null
    };
  });
  const required = document.querySelector('[data-testid="phone-required-action-shell"]');
  const movement = document.querySelector('[data-testid="phone-movement-view"]');
  return {
    url: location.href,
    title: document.title,
    text: normalize(document.body.innerText).slice(0, 18000),
    buttons,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    documentSize: {
      width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    },
    horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth + 1,
    canvasCount: document.querySelectorAll("canvas").length,
    requiredAction: required ? {
      status: required.getAttribute("data-action-status"),
      transitionStage: required.getAttribute("data-transition-stage"),
      text: normalize(required.textContent).slice(0, 1000)
    } : null,
    movementState: movement?.getAttribute("data-movement-state") ?? null,
    resultGateVisible: Boolean(document.querySelector(".phone-result-gate")),
    matchResultVisible: Boolean(document.querySelector(".phone-match-result")),
    matchResultOutcome: document.querySelector(".phone-match-result--victory")
      ? "victory"
      : document.querySelector(".phone-match-result--draw")
        ? "draw"
        : document.querySelector(".phone-match-result--defeat")
          ? "defeat"
          : null
  };
})()`;

const typographyExpression = `(() => {
  const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
  const privateSelector = [
    '[data-testid="phone-private-match-result"]',
    '.phone-objective-card--agenda',
    '.phone-objective-detail--private',
    '[data-private="true"]'
  ].join(",");
  const navigation = document.querySelector(".phone-portrait-bottom-nav");
  const navigationRect = navigation?.getBoundingClientRect() ?? null;
  const directText = (element) => [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ");
  const elementSelector = (element) => {
    const testId = element.getAttribute("data-testid");
    if (testId) return '[data-testid="' + testId + '"]';
    const classes = [...element.classList].slice(0, 3);
    return element.tagName.toLowerCase() + (classes.length ? "." + classes.join(".") : "");
  };
  const classify = (element, style, interactive) => {
    if (interactive) return "interactive";
    if (/^H[1-6]$/.test(element.tagName) || element.getAttribute("role") === "heading") return "heading";
    const className = String(element.className ?? "");
    if (/eyebrow|meta|label|kicker|caption|micro|overline|tag|badge|step/i.test(className)) return "metadata";
    if (Number.parseFloat(style.fontSize) <= 12) return "metadata";
    return "body";
  };
  const targetFor = (kind) => kind === "interactive" || kind === "heading" ? 16 : kind === "body" ? 14 : 12;
  const elements = [...document.querySelectorAll("body *")];
  const samples = [];
  for (const element of elements) {
    if (element.closest(privateSelector)) continue;
    const text = normalize(directText(element));
    if (!text) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.bottom <= 0 ||
      rect.top >= innerHeight ||
      rect.right <= 0 ||
      rect.left >= innerWidth ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") <= 0.01
    ) continue;
    const interactiveElement = element.closest("button, a, input, select, textarea, [role=button], [role=tab], [role=radio]");
    const interactive = Boolean(interactiveElement);
    const targetRect = interactiveElement?.getBoundingClientRect() ?? null;
    const kind = classify(element, style, interactive);
    const fontSizePx = Number.parseFloat(style.fontSize);
    const parsedLineHeight = Number.parseFloat(style.lineHeight);
    const lineHeightPx = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSizePx * 1.2;
    const target = targetFor(kind);
    const overlapsNavigation = Boolean(
      navigationRect &&
      !element.closest(".phone-portrait-bottom-nav") &&
      rect.bottom > navigationRect.top + 1
    );
    samples.push({
      selector: elementSelector(element),
      sample: text.slice(0, 140),
      kind,
      fontSizePx: Math.round(fontSizePx * 100) / 100,
      lineHeightPx: Math.round(lineHeightPx * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      targetWidth: targetRect ? Math.round(targetRect.width * 100) / 100 : null,
      targetHeight: targetRect ? Math.round(targetRect.height * 100) / 100 : null,
      clippedX: element.scrollWidth > element.clientWidth + 1,
      clippedY: element.scrollHeight > element.clientHeight + 1,
      overlapsNavigation,
      belowTarget: fontSizePx + 0.01 < target,
      touchTargetTooSmall: Boolean(targetRect && (targetRect.width < 44 || targetRect.height < 44))
    });
  }
  return {
    capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    samples,
    counts: {
      visibleText: samples.length,
      belowTarget: samples.filter((sample) => sample.belowTarget).length,
      clipped: samples.filter((sample) => sample.clippedX || sample.clippedY).length,
      navigationOverlap: samples.filter((sample) => sample.overlapsNavigation).length,
      smallTouchTargets: samples.filter((sample) => sample.touchTargetTooSmall).length
    }
  };
})()`;

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function safeActionLabel(value: string): string {
  const normalized = normalize(value).slice(0, 160);
  if (/agenda|secret|private objective/i.test(normalized)) return "Owner-private action";
  return normalized;
}

async function api<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${pathname} failed ${response.status}: ${text}`);
  return JSON.parse(text) as T;
}

function visibleEnabled(snapshot: DomSnapshot): DomButton[] {
  return snapshot.buttons.filter((button) => button.visible && !button.disabled && button.text);
}

function buttonMatches(button: DomButton, pattern: RegExp): boolean {
  return pattern.test(button.text) || pattern.test(button.ariaLabel);
}

function firstMatching(buttons: DomButton[], patterns: RegExp[]): DomButton | null {
  for (const pattern of patterns) {
    const found = buttons.find((button) => buttonMatches(button, pattern));
    if (found) return found;
  }
  return null;
}

function isIgnored(button: DomButton): boolean {
  return ignoredButtonPatterns.some(
    (pattern) => pattern.test(button.text) || pattern.test(button.ariaLabel)
  );
}

function destinationScore(button: DomButton): number {
  const text = `${button.text} ${button.ariaLabel} ${button.context}`;
  let score = 0;
  if (/scenario objective/i.test(text)) score += 220;
  if (/\bmission\b/i.test(text)) score += 160;
  if (/inward|advance opportunity|crossing|inner reach|middle reach|center reach/i.test(text)) score += 140;
  if (/\bgate\b|cinder gate|guardian/i.test(text)) score += 100;
  if (/reward opportunity/i.test(text)) score += 45;
  if (/shop|services/i.test(text)) score += 25;
  if (/no visible threat/i.test(text)) score += 12;
  if (/route blocked|disabled/i.test(text)) score -= 500;
  if (/threat risk|blocker/i.test(text)) score -= 8;
  return score - button.index / 1000;
}

function interactionFingerprint(snapshot: DomSnapshot): string {
  return JSON.stringify({
    text: snapshot.text,
    requiredAction: snapshot.requiredAction,
    movementState: snapshot.movementState,
    resultGateVisible: snapshot.resultGateVisible,
    matchResultVisible: snapshot.matchResultVisible,
    buttons: visibleEnabled(snapshot).map((button) => [
      button.text,
      button.ariaLabel,
      button.disabled,
      button.pressed
    ])
  });
}

async function waitForInteractionChange(
  surface: PhoneSurface,
  previous: DomSnapshot,
  timeoutMs = 3_000
): Promise<void> {
  const previousFingerprint = interactionFingerprint(previous);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(120);
    const current = await surface.snapshot();
    if (interactionFingerprint(current) !== previousFingerprint) return;
  }
}

export function chooseCampaignAction(snapshot: DomSnapshot): ChosenAction | null {
  const buttons = visibleEnabled(snapshot);
  if (buttons.length === 0) return null;

  const use = (button: DomButton | null, reason: string): ChosenAction | null =>
    button
      ? {
          buttonIndex: button.index,
          button,
          label: safeActionLabel(button.text || button.ariaLabel),
          reason
        }
      : null;

  const returnToAction = firstMatching(buttons, [/^return to /i]);
  if (returnToAction) return use(returnToAction, "return-to-required-action");

  const helperResponse = firstMatching(buttons, [/^accept \+\d+/i, /^accept help/i]);
  if (helperResponse) return use(helperResponse, "cooperative-help-response");

  if (
    snapshot.requiredAction?.status === "blocked" ||
    snapshot.requiredAction?.status === "submitting" ||
    /^waiting\b/i.test(snapshot.requiredAction?.text ?? "")
  ) {
    return null;
  }

  const stableContinue = firstMatching(buttons, [
    /^continue$/i,
    /^continue resolution/i,
    /^continue scar consequence/i,
    /^continue to /i
  ]);
  if (stableContinue) return use(stableContinue, snapshot.resultGateVisible ? "result-gate-continue" : "continue-resolution");

  const forcedChoice = firstMatching(buttons, [
    /^choose [^·]+$/i,
    /^select [^,]+$/i,
    /accept .+this scar is permanent/i,
    /accept .+affliction/i,
    /^accept consequence/i,
    /^accept displacement/i,
    /^confirm replacement/i,
    /^recruit /i,
    /^equip$/i,
    /^replace /i,
    /^keep /i
  ]);
  if (forcedChoice && !/select destination/i.test(forcedChoice.text)) return use(forcedChoice, "required-choice");

  const helperProceed = firstMatching(buttons, [
    /^proceed with \d+ helper/i,
    /^proceed without help/i,
    /^roll .+ help/i
  ]);
  if (helperProceed) return use(helperProceed, "cooperative-help-progress");

  const askSelectedHelpers = firstMatching(buttons, [/^ask \d+ helper/i]);
  if (askSelectedHelpers) return use(askSelectedHelpers, "cooperative-help-submit");

  const selectableHelper = buttons.find((button) =>
    /phone-assistance-helper/.test(button.className) && button.pressed === false
  );
  if (selectableHelper) return use(selectableHelper, "cooperative-help-select");

  const askForHelp = firstMatching(buttons, [/^ask for help$/i]);
  if (askForHelp) return use(askForHelp, "cooperative-help-required");

  const continueWithoutHelp = firstMatching(buttons, [/^continue without help$/i]);
  if (continueWithoutHelp) return use(continueWithoutHelp, "cooperative-help-skipped");

  const movementPrimary = buttons.find((button) => button.testId === "movement-primary-action");
  if (movementPrimary && snapshot.movementState !== "needs-destination") {
    return use(movementPrimary, snapshot.movementState === "needs-roll" ? "movement-roll" : "movement-confirm");
  }

  if (snapshot.movementState === "needs-destination") {
    const destinations = buttons
      .filter((button) => button.ancestorTestId === "movement-destination" && /^select/i.test(button.ariaLabel || button.text))
      .sort((left, right) => destinationScore(right) - destinationScore(left));
    if (destinations[0]) return use(destinations[0], "scenario-aware-destination");
  }

  const roll = firstMatching(buttons, [
    /^roll (command|grit|signal|guile|forge)\b/i,
    /^roll battle/i,
    /^roll test/i,
    /^roll enemy/i,
    /^roll opposition/i
  ]);
  if (roll && !/^reroll/i.test(roll.text)) return use(roll, "authoritative-roll");

  const startResolution = firstMatching(buttons, [
    /^face the /i,
    /^begin /i,
    /^engage /i,
    /^resolve /i,
    /^attempt /i,
    /^start (tile|hazard|anomaly|encounter|challenge)/i,
    /^enter /i
  ]);
  if (startResolution) return use(startResolution, "start-authoritative-resolution");

  const missionChoice = firstMatching(buttons, [/^select mission$/i, /^choose mission$/i, /^accept [^·]+mission/i]);
  if (missionChoice) return use(missionChoice, "mission-selection");

  const completeContract = firstMatching(buttons, [/^complete /i]);
  if (completeContract) return use(completeContract, "complete-contract");

  const acceptContract = firstMatching(buttons, [/^accept /i]);
  if (acceptContract && /contract|mission/i.test(acceptContract.context)) return use(acceptContract, "accept-contract");

  const declineOptional = firstMatching(buttons, [
    /^decline$/i,
    /^skip$/i,
    /^skip shop/i,
    /^leave shop/i,
    /^leave market/i,
    /^not now$/i,
    /^cancel optional/i
  ]);
  if (declineOptional) return use(declineOptional, "decline-optional-action");

  const reroll = firstMatching(buttons, [/^reroll\b/i]);
  if (reroll) return use(reroll, "eligible-reroll");

  const endTurn = firstMatching(buttons, [/^end turn\b/i]);
  if (endTurn) return use(endTurn, "end-turn");

  const scenarioAction = buttons.find((button) =>
    !isIgnored(button) &&
    /scenario|confrontation|objective|stabilize|secure|ignite|seal|node|engine|claim|breach/i.test(
      `${button.text} ${button.context}`
    )
  );
  if (scenarioAction) return use(scenarioAction, "scenario-action");

  const safePrimary = buttons.find((button) =>
    !isIgnored(button) &&
    /(game-button-(primary|action|battle)|phone-resolution-continue|phone-action-priority-card)/.test(button.className) &&
    !/buy|sell|trade|duel|interfere|purge/i.test(button.text)
  );
  if (safePrimary) return use(safePrimary, "visible-primary-action");

  return null;
}

class BrowserPhoneSurface implements PhoneSurface {
  readonly consoleErrors: string[] = [];
  readonly requestFailures: string[] = [];

  constructor(
    readonly label: string,
    private readonly context: BrowserContext,
    private readonly page: Page
  ) {
    page.on("console", (message) => {
      if (message.type() === "error" && !/blocked call to navigator\.vibrate/i.test(message.text())) {
        this.consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => this.consoleErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "request failed";
      this.requestFailures.push(`${request.method()} ${request.url()} ${failure}`);
    });
  }

  static async create(browser: Browser, label: string, url: string): Promise<BrowserPhoneSurface> {
    const context = await browser.newContext({
      viewport: { width: 384, height: 722 },
      isMobile: true,
      deviceScaleFactor: 2.8125,
      reducedMotion: "no-preference"
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.readyState === "complete" || document.readyState === "interactive");
    return new BrowserPhoneSurface(label, context, page);
  }

  async evaluate<T>(expression: string): Promise<T> {
    return this.page.evaluate((source) => (0, eval)(source) as T, expression);
  }

  async clickButton(expected: DomButton): Promise<boolean> {
    return this.page.evaluate((candidate) => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const matches = (button: HTMLButtonElement) => {
        const text = String(button.textContent ?? "").replace(/\s+/g, " ").trim();
        const ariaLabel = String(button.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim();
        const testId = String(button.getAttribute("data-testid") ?? "").trim();
        return (
          (!candidate.testId || testId === candidate.testId) &&
          (!candidate.ariaLabel || ariaLabel === candidate.ariaLabel) &&
          (!candidate.text || text === candidate.text)
        );
      };
      const indexed = buttons[candidate.index];
      const button = indexed && matches(indexed) ? indexed : buttons.find(matches);
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return false;
      button.scrollIntoView({ block: "center", inline: "nearest" });
      button.click();
      return true;
    }, expected);
  }

  async fillInput(name: string, value: string): Promise<void> {
    await this.page.locator(`input[name="${name}"]`).fill(value);
  }

  async snapshot(): Promise<DomSnapshot> {
    return this.evaluate<DomSnapshot>(snapshotExpression);
  }

  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: false });
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

interface PendingCommand {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class AndroidCdpPhone implements PhoneSurface {
  readonly label = "S21";
  readonly consoleErrors: string[] = [];
  readonly requestFailures: string[] = [];
  private browserSocket: WebSocket | null = null;
  private outerId = 0;
  private innerId = 100_000;
  private readonly outerPending = new Map<number, PendingCommand>();
  private readonly innerPending = new Map<number, PendingCommand>();
  private sessionId: string | null = null;
  private targetId: string | null = null;

  async connect(): Promise<void> {
    const versionResponse = await fetch(`${cdpOrigin}/json/version`);
    if (!versionResponse.ok) throw new Error(`S21 CDP is unavailable at ${cdpOrigin}`);
    const version = await versionResponse.json() as { webSocketDebuggerUrl: string };
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    this.browserSocket = socket;
    await new Promise<void>((resolvePromise, reject) => {
      socket.once("open", () => resolvePromise());
      socket.once("error", reject);
    });
    socket.on("message", (raw) => this.handleMessage(String(raw)));
    socket.on("error", (error) => this.consoleErrors.push(`CDP: ${error.message}`));

    const targets = await this.outer("Target.getTargets") as {
      targetInfos: Array<{ targetId: string; type: string; url: string }>;
    };
    for (const target of targets.targetInfos) {
      if (target.type === "page" && target.url.startsWith(clientOrigin)) {
        await this.outer("Target.closeTarget", { targetId: target.targetId }).catch(() => undefined);
      }
    }
  }

  async open(url: string): Promise<void> {
    if (!this.browserSocket) await this.connect();
    if (this.targetId) {
      await this.outer("Target.closeTarget", { targetId: this.targetId }).catch(() => undefined);
      this.targetId = null;
      this.sessionId = null;
    }
    const created = await this.outer("Target.createTarget", { url }) as { targetId: string };
    this.targetId = created.targetId;
    await this.outer("Target.activateTarget", { targetId: created.targetId });
    const attached = await this.outer("Target.attachToTarget", {
      targetId: created.targetId,
      flatten: true
    }) as { sessionId: string };
    this.sessionId = attached.sessionId;
    await this.inner("Runtime.enable");
    await this.inner("Page.enable");
    await this.inner("Network.enable");
    await this.waitFor("document.readyState === 'complete' || document.readyState === 'interactive'", 15_000);
    if (textScale !== 1) {
      await this.evaluate(`(() => {
        document.documentElement.style.fontSize = ${JSON.stringify(`${Math.round(textScale * 100)}%`)};
        document.documentElement.dataset.qaTextScale = ${JSON.stringify(String(textScale))};
        return getComputedStyle(document.documentElement).fontSize;
      })()`);
    }
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as {
      id?: number;
      method?: string;
      sessionId?: string;
      error?: { message: string };
      result?: Record<string, unknown>;
      params?: {
        message?: string;
        type?: string;
        exceptionDetails?: { text?: string; exception?: { description?: string } };
        errorText?: string;
        canceled?: boolean;
        url?: string;
      };
    };
    if (message.sessionId && message.id && this.innerPending.has(message.id)) {
      const pending = this.innerPending.get(message.id)!;
      this.innerPending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
      return;
    }
    if (message.id && this.outerPending.has(message.id)) {
      const pending = this.outerPending.get(message.id)!;
      this.outerPending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
      return;
    }
    if (message.sessionId && message.method) {
      this.recordInnerEvent(message.method, message.params);
      return;
    }
    if (message.method === "Target.receivedMessageFromTarget" && message.params?.message) {
      const inner = JSON.parse(message.params.message) as {
        id?: number;
        method?: string;
        error?: { message: string };
        result?: Record<string, unknown>;
        params?: {
          type?: string;
          args?: Array<{ value?: unknown; description?: string }>;
          exceptionDetails?: { text?: string; exception?: { description?: string } };
          errorText?: string;
          canceled?: boolean;
          url?: string;
        };
      };
      if (inner.id && this.innerPending.has(inner.id)) {
        const pending = this.innerPending.get(inner.id)!;
        this.innerPending.delete(inner.id);
        clearTimeout(pending.timer);
        if (inner.error) pending.reject(new Error(inner.error.message));
        else pending.resolve(inner.result ?? {});
        return;
      }
      if (inner.method) this.recordInnerEvent(inner.method, inner.params);
    }
  }

  private recordInnerEvent(
    method: string,
    params: {
      type?: string;
      args?: Array<{ value?: unknown; description?: string }>;
      exceptionDetails?: { text?: string; exception?: { description?: string } };
      errorText?: string;
      canceled?: boolean;
      url?: string;
    } | undefined
  ): void {
    if (method === "Runtime.consoleAPICalled" && params?.type === "error") {
      const messageText = (params.args ?? []).map((entry) => entry.value ?? entry.description ?? "").join(" ");
      this.consoleErrors.push(String(messageText));
    }
    if (method === "Runtime.exceptionThrown") {
      this.consoleErrors.push(
        params?.exceptionDetails?.exception?.description ??
        params?.exceptionDetails?.text ??
        "Uncaught S21 page exception"
      );
    }
    if (method === "Network.loadingFailed" && !params?.canceled) {
      this.requestFailures.push(`${params?.url ?? "network request"} ${params?.errorText ?? "failed"}`);
    }
  }

  private outer(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (!this.browserSocket || this.browserSocket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("S21 CDP browser socket is not open"));
    }
    return new Promise((resolvePromise, reject) => {
      const id = ++this.outerId;
      const timer = setTimeout(() => {
        if (this.outerPending.delete(id)) reject(new Error(`S21 CDP outer timeout: ${method}`));
      }, 10_000);
      this.outerPending.set(id, { resolve: resolvePromise, reject, timer });
      this.browserSocket!.send(JSON.stringify({ id, method, params }));
    });
  }

  private async inner(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (!this.sessionId || !this.browserSocket || this.browserSocket.readyState !== WebSocket.OPEN) {
      throw new Error("S21 CDP target is not attached");
    }
    const id = ++this.innerId;
    const result = new Promise<Record<string, unknown>>((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        if (this.innerPending.delete(id)) reject(new Error(`S21 CDP inner timeout: ${method}`));
      }, 12_000);
      this.innerPending.set(id, { resolve: resolvePromise, reject, timer });
    });
    try {
      this.browserSocket.send(JSON.stringify({
        id,
        method,
        params,
        sessionId: this.sessionId
      }));
    } catch (error) {
      const pending = this.innerPending.get(id);
      if (pending) clearTimeout(pending.timer);
      this.innerPending.delete(id);
      throw error;
    }
    return result;
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.inner("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }) as {
      result?: { value?: T };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "S21 evaluation failed"
      );
    }
    return response.result?.value as T;
  }

  async clickButton(expected: DomButton): Promise<boolean> {
    return this.evaluate<boolean>(`(() => {
      const expected = ${JSON.stringify(expected)};
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const buttons = [...document.querySelectorAll("button")];
      const matches = (button) =>
        (!expected.testId || normalize(button.getAttribute("data-testid")) === expected.testId) &&
        (!expected.ariaLabel || normalize(button.getAttribute("aria-label")) === expected.ariaLabel) &&
        (!expected.text || normalize(button.textContent) === expected.text);
      const indexed = buttons[expected.index];
      const button = indexed && matches(indexed) ? indexed : buttons.find(matches);
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return false;
      button.scrollIntoView({ block: "center", inline: "nearest" });
      button.click();
      return true;
    })()`);
  }

  async fillInput(name: string, value: string): Promise<void> {
    await this.evaluate(`(() => {
      const input = document.querySelector('input[name=${JSON.stringify(name)}]');
      if (!input) throw new Error("Input ${name} is missing");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return input.value;
    })()`);
  }

  async waitFor(expression: string, timeoutMs = 10_000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await this.evaluate<boolean>(`Boolean(${expression})`)) return;
      await sleep(120);
    }
    throw new Error(`S21 wait timed out: ${expression}`);
  }

  async snapshot(): Promise<DomSnapshot> {
    return this.evaluate<DomSnapshot>(snapshotExpression);
  }

  async screenshot(path: string): Promise<void> {
    const result = await this.inner("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    }) as { data: string };
    await writeFile(path, Buffer.from(result.data, "base64"));
  }

  async closeTargetForReconnect(): Promise<void> {
    if (!this.targetId) return;
    await this.outer("Target.closeTarget", { targetId: this.targetId }).catch(() => undefined);
    this.targetId = null;
    this.sessionId = null;
    for (const pending of this.innerPending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("S21 target closed for reconnect"));
    }
    this.innerPending.clear();
  }

  async close(): Promise<void> {
    await this.closeTargetForReconnect();
    if (this.browserSocket) {
      this.browserSocket.close();
      this.browserSocket = null;
    }
  }
}

async function capturePhysicalDevice(path: string): Promise<void> {
  const capture = spawnSync("adb", ["-s", deviceSerial, "exec-out", "screencap", "-p"], {
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });
  if (capture.status !== 0 || !capture.stdout) {
    throw new Error(`S21 screencap failed: ${String(capture.stderr ?? "")}`);
  }
  await writeFile(path, capture.stdout);
}

async function waitForText(surface: PhoneSurface, pattern: RegExp, timeoutMs = 15_000): Promise<DomSnapshot> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snapshot = await surface.snapshot();
    if (pattern.test(snapshot.text)) return snapshot;
    await sleep(150);
  }
  throw new Error(`${surface.label} timed out waiting for ${pattern}`);
}

async function clickMatching(
  surface: PhoneSurface,
  patterns: RegExp[],
  timeoutMs = 15_000
): Promise<DomButton> {
  const started = Date.now();
  let latest: DomSnapshot | null = null;
  while (Date.now() - started < timeoutMs) {
    latest = await surface.snapshot();
    const match = firstMatching(visibleEnabled(latest), patterns);
    if (match) {
      if (await surface.clickButton(match)) return match;
    }
    await sleep(150);
  }
  throw new Error(
    `${surface.label} timed out waiting for button ${patterns.map(String).join(", ")}. ` +
    `Visible buttons: ${JSON.stringify(latest ? visibleEnabled(latest).map((button) => button.text) : [])}. ` +
    `Body: ${latest?.text.slice(0, 1200) ?? "unavailable"}`
  );
}

async function setupPhone(
  surface: PhoneSurface,
  playerIndex: number,
  onCheckpoint?: (checkpoint: "join" | "piece-selection" | "operative-selection" | "mission-selection") => Promise<void>
): Promise<void> {
  await waitForText(surface, /join room/i);
  await surface.fillInput("playerName", playerNames[playerIndex]!);
  await onCheckpoint?.("join");
  await clickMatching(surface, [/^join game$/i]);
  await waitForText(surface, /choose piece/i);
  await onCheckpoint?.("piece-selection");
  await clickMatching(surface, [new RegExp(`^${pieceNames[playerIndex]}`, "i")]).catch(() => undefined);
  await sleep(250);
  await clickMatching(surface, [/^continue to operative$/i]);
  await sleep(350);
  await onCheckpoint?.("operative-selection");
  await clickMatching(surface, [new RegExp(`^${operativeNames[playerIndex]}`, "i")]);
  await sleep(350);
  await waitForText(surface, /choose starting mission/i);
  await onCheckpoint?.("mission-selection");
  await clickMatching(surface, [/^select mission$/i]);
  await sleep(250);
  await clickMatching(surface, [/^ready$/i]);
}

function classifyMechanics(snapshot: DomSnapshot, mechanics: Set<string>): void {
  const text = snapshot.text;
  const matches: Array<[string, RegExp]> = [
    ["movement", /roll movement|legal destination|moving to/i],
    ["cross-reach-guidance", /advance opportunity|inner reaches|crossing/i],
    ["arrival", /tile arrival|arrived/i],
    ["tile-challenge", /hazard trial|anomaly trial|sector challenge/i],
    ["enemy-battle", /battle|enemy total|opposition/i],
    ["reward", /reward|gain \d|trophy gained/i],
    ["penalty", /penalty|gain \d wound|lose \d salvage/i],
    ["shop", /shop|market|buy|sell/i],
    ["inventory", /auto-equipped|equipment|follower/i],
    ["contract", /mission|contract/i],
    ["scar", /choose your scar|scar consequence/i],
    ["affliction", /affliction/i],
    ["scenario-progress", /win progress|scenario objective|confrontation/i],
    ["pressure", /loss pressure|global escalation/i],
    ["waiting", /waiting for/i],
    ["result-ready", /result ready/i],
    ["endgame", /match result|victory|defeat/i]
  ];
  for (const [label, pattern] of matches) {
    if (pattern.test(text)) mechanics.add(label);
  }
}

function captureCategory(snapshot: DomSnapshot, action: ChosenAction): string | null {
  if (action.reason === "movement-roll") return "movement-roll";
  if (action.reason === "scenario-aware-destination") return "movement-destination";
  if (action.reason === "movement-confirm") return "movement-route";
  if (action.reason === "authoritative-roll") return "resolution-roll";
  if (action.reason === "start-authoritative-resolution") return "resolution-entry";
  if (action.reason === "result-gate-continue" || snapshot.resultGateVisible) return "result-ready";
  if (action.reason === "end-turn") return "handoff";
  if (action.reason.startsWith("cooperative-help")) return "cooperative-help";
  if (action.reason === "mission-selection") return "mission-replacement";
  return null;
}

async function captureEvidence(
  caseDirectory: string,
  category: string,
  s21: AndroidCdpPhone,
  tv: Page,
  screenshots: string[],
  typography: TypographyEvidence[]
): Promise<void> {
  const s21PageName = `${category}-s21-page.png`;
  const s21PhysicalName = `${category}-s21-physical.png`;
  const tvName = `${category}-tv-1920x1080.png`;
  await s21.evaluate(`(() => {
    let style = document.getElementById("campaign-private-redaction");
    if (!style) {
      style = document.createElement("style");
      style.id = "campaign-private-redaction";
      style.textContent = [
        '[data-testid="phone-private-match-result"]',
        '.phone-objective-card--agenda',
        '.phone-objective-detail--private',
        '[data-private="true"]'
      ].join(",") + '{visibility:hidden!important}';
      document.head.append(style);
    }
    return true;
  })()`);
  try {
    await s21.screenshot(join(caseDirectory, s21PageName));
    await capturePhysicalDevice(join(caseDirectory, s21PhysicalName));
    const measurement = await s21.evaluate<Omit<TypographyEvidence, "checkpoint">>(typographyExpression);
    const checkpointMeasurement: TypographyEvidence = { checkpoint: category, ...measurement };
    typography.push(checkpointMeasurement);
    await writeFile(
      join(caseDirectory, `${category}-text-metrics.json`),
      JSON.stringify(checkpointMeasurement, null, 2)
    );
  } finally {
    await s21.evaluate(`document.getElementById("campaign-private-redaction")?.remove()`).catch(() => undefined);
  }
  await tv.screenshot({ path: join(caseDirectory, tvName), fullPage: false });
  screenshots.push(s21PageName, s21PhysicalName, tvName);
}

async function createTv(browser: Browser, session: SessionResponse): Promise<{
  context: BrowserContext;
  page: Page;
  consoleErrors: string[];
  requestFailures: string[];
}> {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(
    ({ roomCode, hostToken }: SessionResponse) => {
      localStorage.setItem("ashen-reach-tv-room-code", roomCode);
      localStorage.setItem("ashen-reach-tv-host-token", hostToken);
    },
    session
  );
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`);
  });
  await page.goto(`${clientOrigin}/tv?room=${session.roomCode}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.readyState === "complete" || document.readyState === "interactive");
  return { context, page, consoleErrors, requestFailures };
}

async function inferOutcome(tv: Page, phones: PhoneSurface[]): Promise<CampaignCaseResult["outcome"]> {
  const owner = await phones[0]!.snapshot();
  if (owner.matchResultOutcome === "victory") return "victory";
  if (owner.matchResultOutcome === "defeat") return "defeat";
  if (owner.matchResultOutcome === "draw") return "ended-unknown";
  const tvText = normalize(await tv.locator("body").innerText()).slice(-4000);
  if (/victory secured|expedition victory|session victory/i.test(tvText)) return "victory";
  if (/expedition defeated|loss declared|session defeat/i.test(tvText)) return "defeat";
  return "ended-unknown";
}

async function performReconnectCheck(
  campaignCase: CampaignCase,
  s21: AndroidCdpPhone,
  roomCode: string,
  reconnectChecks: string[],
  before: DomSnapshot,
  label: string
): Promise<void> {
  const storedAuth = await s21.evaluate<string | null>(
    `localStorage.getItem("ashenreach.controllerSession") ?? sessionStorage.getItem("ashenreach.controllerSession")`
  );
  if (!storedAuth) throw new Error("S21 reconnect check could not read stored controller authentication");
  await s21.closeTargetForReconnect();
  await sleep(2_500);
  await s21.open(`${clientOrigin}/?room=${roomCode}`);
  let restored = await s21.snapshot();
  const restoreStarted = Date.now();
  while (
    Date.now() - restoreStarted < 4_000 &&
    !/join room/i.test(restored.text) &&
    before.resultGateVisible &&
    !restored.resultGateVisible
  ) {
    await sleep(180);
    restored = await s21.snapshot();
  }
  if (/join room/i.test(restored.text)) {
    await s21.evaluate(`(() => {
      localStorage.setItem("ashenreach.controllerSession", ${JSON.stringify(storedAuth)});
      sessionStorage.setItem("ashenreach.controllerSession", ${JSON.stringify(storedAuth)});
      location.reload();
      return true;
    })()`).catch(() => undefined);
    await sleep(1_200);
    await s21.closeTargetForReconnect();
    await s21.open(`${clientOrigin}/?room=${roomCode}`);
    restored = await s21.snapshot();
  }
  if (/join room/i.test(restored.text)) {
    throw new Error(`S21 reconnect failed during ${campaignCase.id}`);
  }
  if (before.resultGateVisible && !restored.resultGateVisible) {
    throw new Error(
      `S21 result-ready state disappeared during reconnect in ${campaignCase.id}. ` +
      `Restored buttons: ${JSON.stringify(visibleEnabled(restored).map((button) => button.text))}. ` +
      `Restored body: ${restored.text.slice(0, 1400)}`
    );
  }
  reconnectChecks.push(label);
}

function reconnectTarget(campaignCase: CampaignCase, seatIndex: number, snapshot: DomSnapshot): string | null {
  if (seatIndex !== 0) return null;
  if (campaignCase.id === "broken-seal-1p" && snapshot.resultGateVisible) return "result-ready-restored";
  if (campaignCase.id === "throne-of-ash-2p-rivalry" && /waiting for/i.test(snapshot.text)) return "waiting-state-restored";
  if (campaignCase.id === "mirror-false-heroes-3p" && snapshot.movementState === "needs-confirm") {
    return "movement-selection-restored";
  }
  if (
    campaignCase.id === "devourer-beneath-4p" &&
    /choose your scar|affliction|choose one|select one|pending choice/i.test(snapshot.text)
  ) {
    return "pending-choice-restored";
  }
  return null;
}

async function runCase(browser: Browser, campaignCase: CampaignCase): Promise<CampaignCaseResult> {
  const startedAt = new Date();
  const caseDirectory = join(outputRoot, campaignCase.id);
  await mkdir(caseDirectory, { recursive: true });
  const session = await api<SessionResponse>("/api/session/create", {
    method: "POST",
    body: JSON.stringify({
      sessionMode: campaignCase.sessionMode,
      interactionMode: campaignCase.interactionMode,
      gameMode: "standard",
      playerCount: campaignCase.playerCount,
      scenarioId: campaignCase.scenarioId
    })
  });

  const s21 = new AndroidCdpPhone();
  await s21.connect();
  await s21.open(`${clientOrigin}/?room=${session.roomCode}&resetAuth=1`);
  const phones: PhoneSurface[] = [s21];
  const screenshots: string[] = [];
  const recordings: string[] = [];
  const reconnectChecks: string[] = [];
  const mechanics = new Set<string>();
  const actions: ActionEvidence[] = [];
  const viewports: ViewportEvidence[] = [];
  const typography: TypographyEvidence[] = [];
  const capturedCategories = new Set<string>();
  let stall: string | null = null;
  let terminal: SessionSummary = await api<SessionSummary>("/api/session");
  const tv = await createTv(browser, session);

  try {
    await setupPhone(s21, 0, async (checkpoint) => {
      await captureEvidence(caseDirectory, checkpoint, s21, tv.page, screenshots, typography);
    });
    for (let index = 1; index < campaignCase.playerCount; index += 1) {
      const phone = await BrowserPhoneSurface.create(
        browser,
        playerNames[index]!,
        `${clientOrigin}/?room=${session.roomCode}&resetAuth=1`
      );
      phones.push(phone);
      await setupPhone(phone, index);
    }
    await clickMatching(s21, [/^start game$/i], 20_000);
    await waitForText(s21, /roll movement|waiting for/i, 20_000);
      await captureEvidence(caseDirectory, "game-start", s21, tv.page, screenshots, typography);

    const loopStarted = Date.now();
    let lastProgressAt = Date.now();
    let actionsPerformed = 0;
    let reconnectDone = false;
    let consecutiveActionSignature = "";
    let consecutiveActionCount = 0;

    campaignLoop:
    while (actionsPerformed < maxActions) {
      terminal = await api<SessionSummary>("/api/session");
      if (terminal.status === "ended") break;

      let acted = false;
      for (let seatIndex = 0; seatIndex < phones.length; seatIndex += 1) {
        const surface = phones[seatIndex]!;
        const snapshot = await surface.snapshot();
        classifyMechanics(snapshot, mechanics);
        viewports.push({
          at: new Date().toISOString(),
          seat: seatIndex + 1,
          width: snapshot.viewport.width,
          height: snapshot.viewport.height,
          dpr: snapshot.viewport.dpr,
          documentWidth: snapshot.documentSize.width,
          documentHeight: snapshot.documentSize.height,
          horizontalOverflow: snapshot.horizontalOverflow,
          canvasCount: snapshot.canvasCount
        });
        if (/join room/i.test(snapshot.text)) {
          throw new Error(`${surface.label} unexpectedly returned to Join Room during ${campaignCase.id}`);
        }

        const reconnectLabel = !reconnectDone ? reconnectTarget(campaignCase, seatIndex, snapshot) : null;
        if (reconnectLabel) {
          await performReconnectCheck(
            campaignCase,
            s21,
            session.roomCode,
            reconnectChecks,
            snapshot,
            reconnectLabel
          );
          reconnectDone = true;
          lastProgressAt = Date.now();
          acted = true;
          await sleep(180);
          break;
        }

        const chosen = chooseCampaignAction(snapshot);
        if (!chosen) continue;

        const actionSignature = `${seatIndex}:${chosen.reason}:${chosen.label}`;
        if (actionSignature === consecutiveActionSignature) {
          consecutiveActionCount += 1;
        } else {
          consecutiveActionSignature = actionSignature;
          consecutiveActionCount = 1;
        }
        if (consecutiveActionCount > 8) {
          stall = `Repeated unchanged action: ${actionSignature}`;
          await writeFile(join(caseDirectory, "stall.json"), JSON.stringify({
            reason: stall,
            seat: seatIndex + 1,
            snapshot
          }, null, 2));
          await captureEvidence(caseDirectory, "stall", s21, tv.page, screenshots, typography);
          break campaignLoop;
        }

        const category = captureCategory(snapshot, chosen);
        if (category && !capturedCategories.has(category)) {
          capturedCategories.add(category);
          await captureEvidence(caseDirectory, category, s21, tv.page, screenshots, typography);
        }

        if (!await surface.clickButton(chosen.button)) {
          acted = true;
          await sleep(180);
          break;
        }
        actionsPerformed += 1;
        lastProgressAt = Date.now();
        actions.push({
          at: new Date().toISOString(),
          elapsedMs: Date.now() - loopStarted,
          seat: seatIndex + 1,
          player: playerNames[seatIndex]!,
          action: chosen.label,
          reason: chosen.reason,
          phaseHint: snapshot.requiredAction?.status ?? null,
          transitionStage: snapshot.requiredAction?.transitionStage ?? null,
          resultGateVisible: snapshot.resultGateVisible
        });
        console.log(
          `[${campaignCase.id}] #${actionsPerformed} ${playerNames[seatIndex]}: ${chosen.label} (${chosen.reason})`
        );
        acted = true;

        // Wait for the local or authoritative projection to replace the just-used
        // control. This mirrors human interaction and prevents the campaign loop
        // from manufacturing duplicate commands at raw CDP speed.
        await waitForInteractionChange(surface, snapshot);
        break;
      }

      if (!acted) {
        if (Date.now() - lastProgressAt > maxStallMs) {
          const phoneSummaries = await Promise.all(phones.map(async (phone, index) => {
            const snapshot = await phone.snapshot();
            return {
              seat: index + 1,
              requiredAction: snapshot.requiredAction,
              movementState: snapshot.movementState,
              buttons: visibleEnabled(snapshot).map((button) => safeActionLabel(button.text)).slice(0, 20),
              text: snapshot.text.slice(0, 1000)
            };
          }));
          stall = JSON.stringify(phoneSummaries);
          await writeFile(join(caseDirectory, "stall.json"), JSON.stringify(phoneSummaries, null, 2));
          await captureEvidence(caseDirectory, "stall", s21, tv.page, screenshots, typography);
          break;
        }
        await sleep(300);
      }
    }

    terminal = await api<SessionSummary>("/api/session");
    if (terminal.status === "ended") {
      await captureEvidence(caseDirectory, "endgame", s21, tv.page, screenshots, typography);
    }
    const completedAt = new Date();
    const outcome = terminal.status === "ended" ? await inferOutcome(tv.page, phones) : "incomplete";
    const actionsBySeat = Object.fromEntries(
      playerNames.slice(0, campaignCase.playerCount).map((name, index) => [
        name,
        actions.filter((action) => action.seat === index + 1).length
      ])
    );
    const phoneConsoleErrors = phones.flatMap((phone) => phone.consoleErrors.map((error) => `${phone.label}: ${error}`));
    const requestFailures = [
      ...phones.flatMap((phone) => phone.requestFailures.map((error) => `${phone.label}: ${error}`)),
      ...tv.requestFailures.map((error) => `TV: ${error}`)
    ];
    const result: CampaignCaseResult = {
      id: campaignCase.id,
      scenarioId: campaignCase.scenarioId,
      scenarioName: campaignCase.scenarioName,
      playerCount: campaignCase.playerCount,
      interactionMode: campaignCase.interactionMode,
      textScale,
      roomCode: session.roomCode,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      outcome,
      terminalStatus: terminal.status,
      terminalPhase: terminal.phase,
      actionCount: actions.length,
      actionsBySeat,
      reconnectChecks,
      mechanicsSeen: [...mechanics].sort(),
      screenshots,
      recordings,
      phoneConsoleErrors,
      tvConsoleErrors: tv.consoleErrors,
      requestFailures,
      horizontalOverflowCount: viewports.filter((entry) => entry.horizontalOverflow).length,
      canvasCountMaximum: Math.max(0, ...viewports.map((entry) => entry.canvasCount)),
      stall,
      actions,
      viewports,
      typography
    };
    await writeFile(join(caseDirectory, "result.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    await Promise.all(phones.map((phone) => phone.close().catch(() => undefined)));
    await tv.context.close();
  }
}

async function verifyPhysicalDevice(): Promise<CampaignSummary["physicalDevice"]> {
  const devices = spawnSync("adb", ["devices", "-l"], { encoding: "utf8" });
  if (devices.status !== 0 || !devices.stdout.includes(deviceSerial) || !devices.stdout.includes("device")) {
    throw new Error(`Physical S21 ${deviceSerial} is not connected`);
  }
  const model = spawnSync("adb", ["-s", deviceSerial, "shell", "getprop", "ro.product.model"], {
    encoding: "utf8"
  }).stdout.trim();
  const version = await fetch(`${cdpOrigin}/json/version`);
  if (!version.ok) throw new Error(`Chrome DevTools is unavailable at ${cdpOrigin}`);
  return {
    serial: deviceSerial,
    model,
    viewport: { width: 384, height: 722, dpr: 2.8125 }
  };
}

async function main(): Promise<void> {
  const requestedCases = selectedCase === "all"
    ? campaignCases
    : campaignCases.filter((entry) => entry.id === selectedCase || entry.scenarioId === selectedCase);
  if (requestedCases.length === 0) {
    throw new Error(`Unknown campaign case ${selectedCase}`);
  }
  await mkdir(outputRoot, { recursive: true });
  const physicalDevice = await verifyPhysicalDevice();
  const startedAt = new Date();
  const browser = await chromium.launch({ headless: true });
  const results: CampaignCaseResult[] = [];
  try {
    for (const campaignCase of requestedCases) {
      console.log(`START ${campaignCase.scenarioName} ${campaignCase.playerCount}P ${campaignCase.interactionMode}`);
      const result = await runCase(browser, campaignCase);
      results.push(result);
      console.log(`${result.terminalStatus === "ended" ? "PASS" : "FAIL"} ${campaignCase.id} ${result.outcome}`);
      if (result.terminalStatus !== "ended") break;
    }
  } finally {
    await browser.close();
  }

  const completedAt = new Date();
  const summary: CampaignSummary = {
    schemaVersion: 1,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    apiOrigin,
    clientOrigin,
    physicalDevice,
    casesRequested: requestedCases.map((entry) => entry.id),
    passed: results.filter((result) => result.terminalStatus === "ended").length,
    failed: results.filter((result) => result.terminalStatus !== "ended").length +
      Math.max(0, requestedCases.length - results.length),
    results
  };
  await writeFile(join(outputRoot, "campaign-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    outputRoot,
    requested: requestedCases.length,
    passed: summary.passed,
    failed: summary.failed
  }, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
