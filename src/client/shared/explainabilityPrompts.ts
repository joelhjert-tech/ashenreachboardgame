import { statLabelById } from "./statLabels.js";
import type {
  ActiveResolution,
  PublicMoveDestination,
  PhonePatchPayload,
  PublicMovementPlannerState,
  PublicPatchPayload,
  PublicPlayer,
  PublicSectorExplorationSummary,
  PublicShopEncounterState,
  StatePatch
} from "./types.js";

export type ExplainabilityTone = "waiting" | "move" | "battle" | "shop" | "action" | "result";

export interface CurrentTablePrompt {
  phaseLabel: string;
  publicText: string;
  requiredActorSeatId: string | null;
  requiredActorName: string | null;
  phaseReason: string;
  availableActionSummary: string;
  lockedReason: string | null;
  lastOutcomeSummary: string | null;
  watchText: string;
  tone: ExplainabilityTone;
}

export interface CurrentPlayerPrompt {
  phaseLabel: string;
  privateText: string;
  requiredAction: string;
  actionSummary: string;
  disabledReasons: string[];
  usefulNow: string;
  lastOutcomeSummary: string | null;
  waitText: string;
  tone: ExplainabilityTone;
  targetTab?: "move" | "battle" | "shop" | "action";
}

export interface RoutePreviewCopy {
  exactText: string;
  pathText: string;
  statusLabel: "Reachable" | "Blocked" | "Selected";
  statusReason: string;
  riskText: string | null;
  rewardText: string | null;
  tagLabels: string[];
}

export interface SectorExplorationCopy {
  printedIconsText: string;
  unresolvedText: string;
  drawDueText: string;
  lockText: string;
  lines: string[];
}

function toTitleCase(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatThreatIconName(icon: string): string {
  return icon.charAt(0).toUpperCase() + icon.slice(1);
}

function formatThreatIconCounts(icons: string[]): string {
  const counts = icons.reduce<Record<string, number>>((accumulator, icon) => {
    accumulator[icon] = (accumulator[icon] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([icon, count]) => `${count} ${icon}`)
    .join(", ");
}

function normalizeTagLabel(tag: string): string {
  return tag.replace(/[-_]/g, " ");
}

function getActiveSeatId(payload: PublicPatchPayload): string | null {
  return payload.turnOrder[payload.activeSeatIndex] ?? null;
}

function getPlayerName(payload: PublicPatchPayload, seatId: string | null | undefined): string | null {
  if (!seatId) {
    return null;
  }

  return (
    payload.players.find((player) => player.seatId === seatId)?.character.name ??
    payload.seats.find((seat) => seat.seatId === seatId)?.displayName ??
    seatId
  );
}

function getSeatDisplayName(payload: PublicPatchPayload, seatId: string | null | undefined): string | null {
  if (!seatId) {
    return null;
  }

  return payload.seats.find((seat) => seat.seatId === seatId)?.displayName ?? null;
}

function getActivePlayer(payload: PublicPatchPayload): PublicPlayer | null {
  const activeSeatId = getActiveSeatId(payload);
  return payload.players.find((player) => player.seatId === activeSeatId) ?? null;
}

function describeShopBlocker(shop: PublicShopEncounterState): string | null {
  const blocker = shop.blockingThreats[0];

  if (blocker) {
    const stat = blocker.challenge?.stat ? ` (${statLabelById[blocker.challenge.stat]} ${blocker.challenge.value})` : "";
    return `Shop locked: clear ${blocker.name}${stat} first.`;
  }

  return shop.blockedReasonText ?? (shop.blocked ? "Shop locked: clear the blocking threat first." : null);
}

function describeMovement(planner: PublicMovementPlannerState): {
  text: string;
  summary: string;
  lockedReason: string | null;
} {
  if (planner.destinations.length === 0) {
    return {
      text: `You rolled ${planner.movementValue}, but no exact-distance route is legal from ${planner.currentSectorName}.`,
      summary: "No legal destination.",
      lockedReason: "No exact route matches the rolled movement value."
    };
  }

  return {
    text: `You rolled ${planner.movementValue}. Choose one glowing space exactly ${planner.movementValue} step${planner.movementValue === 1 ? "" : "s"} away.`,
    summary: `${planner.destinations.length} legal destination${planner.destinations.length === 1 ? "" : "s"} from ${planner.currentSectorName}.`,
    lockedReason: null
  };
}

export function buildRoutePreviewCopy(
  destination: PublicMoveDestination,
  movementValue: number,
  currentSectorName: string,
  selected = false
): RoutePreviewCopy {
  const isBlocked = Boolean(destination.disabledReason);
  const routeNames = destination.routeNames ?? destination.route;
  const exactText =
    destination.distance === movementValue
      ? `Legal: exactly ${movementValue} step${movementValue === 1 ? "" : "s"} from ${currentSectorName}.`
      : `Blocked: route is ${destination.distance} step${destination.distance === 1 ? "" : "s"}, not ${movementValue}.`;
  const blockerNames = destination.faceUpThreats.map((threat) => threat.name);
  const tagLabels = [
    ...new Set(
      [
        ...destination.tags,
        ...destination.strategicTags,
        destination.threatIcons.length > 0 || destination.faceUpThreats.length > 0 ? "threat" : null,
        destination.shop ? "shop" : null,
        destination.scenarioMarkers?.length ? "objective" : null
      ]
        .filter((tag): tag is string => Boolean(tag))
        .filter((tag) => ["shop", "hazard", "objective", "sanctuary", "anomaly", "threat", "danger", "reward", "gate", "nemesis", "safe", "locked"].includes(tag))
        .map(normalizeTagLabel)
    )
  ].slice(0, 6);
  const riskText = destination.disabledReason
    ? `Blocked: ${destination.disabledReason}.`
    : destination.faceUpThreats.length > 0
      ? `Risk: ${blockerNames.join(", ")} already blocks the sector.`
      : destination.nemesisPresent
        ? "Risk: Nemesis present."
        : destination.threatIcons.length > 0
          ? `Risk: ${formatThreatIconCounts(destination.threatIcons)} printed threat icon${destination.threatIcons.length === 1 ? "" : "s"}.`
          : null;
  const rewardText = destination.shop
    ? destination.shop.status === "locked"
      ? "Reward: shop available after threats are clear."
      : `Reward: ${destination.shop.shopName} services are available.`
    : destination.scenarioMarkers?.length
      ? `Reward: ${destination.scenarioMarkers.join(", ")} objective marker.`
      : destination.strategicTags.includes("reward")
        ? "Reward: public upside if the sector stays clear."
        : null;

  return {
    exactText,
    pathText: `Path: ${routeNames.join(" -> ")}.`,
    statusLabel: selected ? "Selected" : isBlocked || destination.faceUpThreats.length > 0 ? "Blocked" : "Reachable",
    statusReason: isBlocked
      ? destination.disabledReason ?? "Route blocked."
      : destination.faceUpThreats.length > 0
        ? `${formatCount(destination.faceUpThreats.length, "blocker")} must be cleared.`
        : `Reachable by the stored movement roll of ${movementValue}.`,
    riskText,
    rewardText,
    tagLabels
  };
}

export function buildSectorExplorationCopy(summary: PublicSectorExplorationSummary | null | undefined): SectorExplorationCopy | null {
  if (!summary) {
    return null;
  }

  const drawEntries = (["red", "blue", "yellow"] as const).flatMap((icon) => (
    summary.drawCountsDue[icon] > 0 ? [`${summary.drawCountsDue[icon]} ${icon}`] : []
  ));
  const printedIconsText = summary.printedThreatIcons.length > 0
    ? `Printed icons: ${formatThreatIconCounts(summary.printedThreatIcons)}.`
    : "Printed icons: none.";
  const unresolvedText = summary.unresolvedThreats.length > 0
    ? `Unresolved blockers: ${summary.unresolvedThreats.map((threat) => threat.name).join(", ")}.`
    : "Unresolved blockers: none.";
  const drawDueText = drawEntries.length > 0 ? `Draw due: ${drawEntries.join(", ")}.` : "Draw due: none.";
  const lockText = summary.lockedReason ?? (
    summary.sectorTextLocked || summary.shopLocked
      ? "Actions locked until unresolved threats are clear."
      : "Action unlocked: sector text and services are clear."
  );

  return {
    printedIconsText,
    unresolvedText,
    drawDueText,
    lockText,
    lines: summary.explanationLines.length > 0
      ? summary.explanationLines
      : [printedIconsText, unresolvedText, drawDueText, lockText]
  };
}

function describeResolutionMath(resolution: ActiveResolution | null | undefined): string | null {
  if (!resolution?.roll) {
    return null;
  }

  const stat = resolution.battle?.stat ? statLabelById[resolution.battle.stat] : "Base";
  return `${stat} ${resolution.roll.modifierTotal} + Roll ${resolution.roll.baseTotal} = Total ${resolution.roll.finalTotal} vs ${resolution.roll.target}.`;
}

function getLatestPublicOutcome(payload: PublicPatchPayload): string | null {
  return (
    payload.rivalryAgendaCompletion?.summary ??
    payload.rivalryAgendaReveal?.summary ??
    payload.activeResolution?.outcome?.text ??
    payload.outcomeSummary?.summary ??
    null
  );
}

function getScenarioSummary(payload: PublicPatchPayload): string {
  const pressure = payload.scenarioPressure;

  if (!pressure) {
    return `Escalation ${payload.escalationLevel}/${payload.escalationThreshold}.`;
  }

  return `${pressure.objectiveProgress.label}: ${pressure.objectiveProgress.current}/${pressure.objectiveProgress.required}. ${pressure.collapseTrack.name}: ${pressure.collapseTrack.current}/${pressure.collapseTrack.max}.`;
}

export function buildCurrentTablePrompt(patch: StatePatch<PublicPatchPayload> | null): CurrentTablePrompt {
  if (!patch) {
    return {
      phaseLabel: "Host setup",
      publicText: "Create a room to bring the command board online.",
      requiredActorSeatId: null,
      requiredActorName: null,
      phaseReason: "No live session is connected.",
      availableActionSummary: "Choose scenario, mode, and player count.",
      lockedReason: null,
      lastOutcomeSummary: null,
      watchText: "Share the room code once setup is complete.",
      tone: "waiting"
    };
  }

  const payload = patch.payload;
  const activeSeatId = getActiveSeatId(payload);
  const activePlayer = getActivePlayer(payload);
  const activeName = activePlayer?.character.name ?? getPlayerName(payload, activeSeatId) ?? "the active operative";
  const latestOutcome = getLatestPublicOutcome(payload);

  if (payload.status === "ended") {
    const winnerName = getSeatDisplayName(payload, payload.winnerSeatId) ?? getPlayerName(payload, payload.winnerSeatId) ?? null;

    return {
      phaseLabel: "Game over",
      publicText: winnerName ? `${winnerName} secured the final outcome.` : "The campaign has ended.",
      requiredActorSeatId: null,
      requiredActorName: null,
      phaseReason: "Final state reached.",
      availableActionSummary: "Review the outcome or restart.",
      lockedReason: null,
      lastOutcomeSummary: latestOutcome,
      watchText: "Review the table outcome.",
      tone: "result"
    };
  }

  if (payload.status === "lobby") {
    const joined = payload.seats.filter((seat) => seat.displayName).length;
    const ready = payload.seats.filter((seat) => seat.displayName && seat.ready).length;
    const readyText =
      joined > 0 && ready >= joined
        ? "All joined operatives are ready. Host may start when setup is correct."
        : `Waiting for all players to ready on phone. Ready ${ready}/${Math.max(joined, 1)}.`;

    return {
      phaseLabel: joined > 0 ? "Ready check" : "Character selection",
      publicText: joined > 0 ? readyText : "Share the room code while players choose operatives.",
      requiredActorSeatId: null,
      requiredActorName: null,
      phaseReason: "The expedition has not started.",
      availableActionSummary: "Players join and ready from phones.",
      lockedReason: joined > 0 && ready < joined ? "Start is locked until joined players are ready." : null,
      lastOutcomeSummary: latestOutcome,
      watchText: "Phones control character selection.",
      tone: "waiting"
    };
  }

  if (payload.pendingEnemyRoll) {
    const rollerName = getPlayerName(payload, payload.pendingEnemyRoll.assignedRollerSeatId) ?? payload.pendingEnemyRoll.assignedRollerSeatId;
    return {
      phaseLabel: "Enemy roll",
      publicText: `${rollerName} must roll for ${payload.pendingEnemyRoll.encounterTitle}.`,
      requiredActorSeatId: payload.pendingEnemyRoll.assignedRollerSeatId,
      requiredActorName: rollerName,
      phaseReason: `${activeName} is engaged; the table assigned the enemy dice to another phone.`,
      availableActionSummary: "Assigned phone rolls the enemy dice.",
      lockedReason: null,
      lastOutcomeSummary: latestOutcome,
      watchText: "Watch the center duel.",
      tone: "battle"
    };
  }

  if (payload.activeResolution?.battle || payload.encounter) {
    const resolution = payload.activeResolution ?? null;
    const opponent = resolution?.battle?.enemyName ?? resolution?.card?.title ?? payload.encounter?.enemyName ?? payload.encounter?.title ?? "the encounter";
    const math = describeResolutionMath(resolution);
    return {
      phaseLabel: resolution?.battle ? "Battle resolving" : resolution ? "Resolution" : "Encounter",
      publicText: `Waiting on ${activeName} to resolve ${opponent}.`,
      requiredActorSeatId: resolution?.playerId ?? activeSeatId,
      requiredActorName: activeName,
      phaseReason: math ?? "Resolve the current threat before the table advances.",
      availableActionSummary: resolution ? toTitleCase(resolution.stage) : "Roll or stage the check on phone.",
      lockedReason: null,
      lastOutcomeSummary: latestOutcome,
      watchText: "Compare the relevant stat, roll, modifiers, and total.",
      tone: "battle"
    };
  }

  if (payload.shopEncounter) {
    const blocker = describeShopBlocker(payload.shopEncounter);
    const isBlocked = payload.shopEncounter.status === "locked" || payload.shopEncounter.blocked || payload.shopEncounter.blockingThreats.length > 0;
    return {
      phaseLabel: isBlocked ? "Shop blocked" : "Shop open",
      publicText: isBlocked
        ? blocker ?? "Shop is locked until blockers are cleared."
        : `Waiting on ${payload.shopEncounter.activePlayer.name} to choose a shop action at ${payload.shopEncounter.shopName}.`,
      requiredActorSeatId: payload.shopEncounter.activePlayer.playerId,
      requiredActorName: payload.shopEncounter.activePlayer.name,
      phaseReason: isBlocked ? "Threats or blockers prevent normal shopping." : `${payload.shopEncounter.activePlayer.name} has ${payload.shopEncounter.activePlayer.salvage} Salvage.`,
      availableActionSummary: isBlocked ? "Clear the blocker first." : "Buy and sell on the active phone.",
      lockedReason: isBlocked ? blocker : null,
      lastOutcomeSummary: payload.shopEncounter.recentOutcome?.summary ?? latestOutcome,
      watchText: "Phone confirms purchases and sales.",
      tone: "shop"
    };
  }

  if (patch.phase === "navigation" && payload.movementPlanner?.active) {
    const movement = describeMovement(payload.movementPlanner);
    return {
      phaseLabel: "Movement",
      publicText: `Waiting on ${activeName} to choose a legal destination. ${movement.text}`,
      requiredActorSeatId: activeSeatId,
      requiredActorName: activeName,
      phaseReason: movement.summary,
      availableActionSummary: "Legal destinations glow on the map.",
      lockedReason: movement.lockedReason,
      lastOutcomeSummary: latestOutcome,
      watchText: "Route glow shows the exact path.",
      tone: "move"
    };
  }

  return {
    phaseLabel: toTitleCase(patch.phase),
    publicText: `${activeName} has the command channel.`,
    requiredActorSeatId: activeSeatId,
    requiredActorName: activeName,
    phaseReason: getScenarioSummary(payload),
    availableActionSummary: patch.phase === "broadcast" ? "Turn is passing to the next operative." : "Active phone chooses the next legal action.",
    lockedReason: null,
    lastOutcomeSummary: latestOutcome,
    watchText: "Watch the active phone and TV state.",
    tone: patch.phase === "broadcast" ? "waiting" : "action"
  };
}

export function buildCurrentPlayerPrompt(patch: PhonePatchPayload): CurrentPlayerPrompt {
  const activeSeatId = getActiveSeatId(patch);
  const self = patch.self;
  const latestOutcome = getLatestPublicOutcome(patch);
  const isActive = Boolean(self && activeSeatId === self.seatId);
  const activeName = getPlayerName(patch, activeSeatId) ?? "another operative";

  if (!self) {
    return {
      phaseLabel: "No seat",
      privateText: "Join a room before orders appear.",
      requiredAction: "Join room",
      actionSummary: "Enter room code and name.",
      disabledReasons: [],
      usefulNow: "Choose an operative after joining.",
      lastOutcomeSummary: latestOutcome,
      waitText: "Watch the TV for room setup.",
      tone: "waiting"
    };
  }

  if (patch.status === "ended") {
    const winner = getPlayerName(patch, patch.winnerSeatId) ?? patch.winnerSeatId ?? "the table";

    return {
      phaseLabel: "Session complete",
      privateText: `${winner} secured the final outcome. Watch the TV for the table summary.`,
      requiredAction: "Run ended",
      actionSummary: "No actions remain.",
      disabledReasons: [],
      usefulNow: "Review final outcome.",
      lastOutcomeSummary: latestOutcome,
      waitText: "Watch the TV summary.",
      tone: "result"
    };
  }

  if (!isActive && patch.pendingEnemyRoll?.assignedRollerSeatId !== self.seatId) {
    return {
      phaseLabel: "Standby",
      privateText: `${activeName} is acting. Your controls stay locked until your turn or assigned roll.`,
      requiredAction: `Waiting for ${activeName}`,
      actionSummary: "Watch the TV command table.",
      disabledReasons: ["notYourTurn"],
      usefulNow: "Review your card, inventory, and quest.",
      lastOutcomeSummary: latestOutcome,
      waitText: `Waiting for ${activeName}.`,
      tone: "waiting"
    };
  }

  if (patch.pendingEnemyRoll) {
    const assignedToSelf = patch.pendingEnemyRoll.assignedRollerSeatId === self.seatId;
    const rollerName = getPlayerName(patch, patch.pendingEnemyRoll.assignedRollerSeatId) ?? patch.pendingEnemyRoll.assignedRollerSeatId;
    return {
      phaseLabel: "Enemy roll",
      privateText: assignedToSelf
        ? `Roll for ${patch.pendingEnemyRoll.encounterTitle}. You are controlling the enemy dice.`
        : `${rollerName} is rolling for ${patch.pendingEnemyRoll.encounterTitle}.`,
      requiredAction: assignedToSelf ? "Roll enemy dice" : "Wait",
      actionSummary: assignedToSelf ? "Resolve the enemy roll from the Battle tab." : "Watch the TV result.",
      disabledReasons: assignedToSelf ? [] : ["notYourTurn"],
      usefulNow: assignedToSelf ? "Roll when the table is ready." : "Watch the center duel.",
      lastOutcomeSummary: latestOutcome,
      waitText: `Waiting on ${rollerName}.`,
      tone: "battle",
      targetTab: "battle"
    };
  }

  if (patch.movementPlanner?.active) {
    const movement = describeMovement(patch.movementPlanner);
    return {
      phaseLabel: "Movement",
      privateText: movement.text,
      requiredAction: patch.movementPlanner.destinations.length > 0 ? "Choose destination" : "No legal destination",
      actionSummary: movement.summary,
      disabledReasons: movement.lockedReason ? ["noExactRoute"] : [],
      usefulNow: "Open Move to compare routes, blockers, shops, and danger.",
      lastOutcomeSummary: latestOutcome,
      waitText: "Watch route glow on the TV.",
      tone: "move",
      targetTab: "move"
    };
  }

  if (patch.activeResolution?.battle || patch.encounter) {
    const resolution = patch.activeResolution ?? null;
    const opponent = resolution?.battle?.enemyName ?? resolution?.card?.title ?? patch.encounter?.enemyName ?? patch.encounter?.title ?? "the encounter";
    const math = describeResolutionMath(resolution);
    const requiredAction = resolution?.roll
      ? "Confirm result"
      : patch.encounter?.cardType === "enemy" || resolution?.battle
        ? "Roll battle"
        : "Resolve event";
    return {
      phaseLabel: resolution ? "Resolution" : "Encounter",
      privateText: math ?? `${opponent} is waiting for the relevant roll.`,
      requiredAction,
      actionSummary: `${opponent}: ${resolution?.battle?.stat ? statLabelById[resolution.battle.stat] : patch.encounter?.stat ? statLabelById[patch.encounter.stat] : "check"}.`,
      disabledReasons: [],
      usefulNow: "Use Battle to roll, compare totals, or continue.",
      lastOutcomeSummary: latestOutcome,
      waitText: "Watch the TV duel.",
      tone: "battle",
      targetTab: "battle"
    };
  }

  if (patch.shopEncounter) {
    const blocker = describeShopBlocker(patch.shopEncounter);
    const isBlocked = patch.shopEncounter.status === "locked" || patch.shopEncounter.blocked || patch.shopEncounter.blockingThreats.length > 0;
    return {
      phaseLabel: isBlocked ? "Shop blocked" : "Shop",
      privateText: isBlocked
        ? blocker ?? "Shop is locked until blockers are cleared."
        : `${patch.shopEncounter.shopName} is open. Buy, sell, or leave from the Shop tab.`,
      requiredAction: isBlocked ? "Clear blocker" : "Choose shop action",
      actionSummary: isBlocked ? "Buy and sell controls are locked." : `${patch.shopEncounter.activePlayer.salvage} Salvage available.`,
      disabledReasons: isBlocked ? [patch.shopEncounter.blockedReason ?? "shopBlockedByThreat"].map(String) : [],
      usefulNow: isBlocked ? "Clear the named threat first." : "Compare stock costs and sell values.",
      lastOutcomeSummary: patch.shopEncounter.recentOutcome?.summary ?? latestOutcome,
      waitText: "TV shows the public shop state.",
      tone: "shop",
      targetTab: "shop"
    };
  }

  if (patch.privateRivalry?.revealState === "completed") {
    return {
      phaseLabel: "Rivalry",
      privateText: patch.privateRivalry.scoring?.completionSummary ?? "Your rivalry agenda is complete.",
      requiredAction: "Review agenda",
      actionSummary: `${patch.privateRivalry.objective.progressLabel}: ${patch.privateRivalry.objective.progress}/${patch.privateRivalry.objective.target}.`,
      disabledReasons: [],
      usefulNow: "Quest tab shows owner-only scoring details.",
      lastOutcomeSummary: latestOutcome,
      waitText: "TV only shows the public-safe summary.",
      tone: "result",
      targetTab: "action"
    };
  }

  if (patch.scenarioPressure) {
    return {
      phaseLabel: "Action",
      privateText: "Choose a legal action for the current sector.",
      requiredAction: "Choose action",
      actionSummary: getScenarioSummary(patch),
      disabledReasons: [],
      usefulNow: "Action, Shop, Battle, and Move tabs explain what is available.",
      lastOutcomeSummary: latestOutcome,
      waitText: "Watch the TV pressure and objective tracks.",
      tone: "action",
      targetTab: "action"
    };
  }

  return {
    phaseLabel: toTitleCase(patch.phase),
    privateText: "Choose the next legal action, or end the turn if nothing remains.",
    requiredAction: "Choose action",
    actionSummary: "No forced prompt is waiting.",
    disabledReasons: [],
    usefulNow: "Use the tabs to compare legal options.",
    lastOutcomeSummary: latestOutcome,
    waitText: "Watch the TV for public state.",
    tone: "action",
    targetTab: "action"
  };
}
