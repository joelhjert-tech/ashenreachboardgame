import type { ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { ChallengeBadge } from "../shared/ChallengeBadge.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { statLabelById } from "../shared/statLabels.js";
import { ResultDeltaRow } from "../shared/ResultDeltaChips.js";
import type { ActiveResolution, PublicPatchPayload, PublicPlayer, ResultDelta, StatePatch, Stat } from "../shared/types.js";
import { HostCinematicFxLayer } from "./HostCinematicFxLayer.js";
import { isHostBattleActive } from "./hostBattleState.js";
import { DiceRollScene } from "./DiceRollScene.js";

interface ResolutionSideModel {
  name: string;
  eyebrow: string;
  detail: string;
  artUrl?: string | null;
  cardId?: string | null;
  cardType?: "threat" | "anomaly" | "contract" | "artifact" | "scar" | "escalation" | null;
  stat: Stat;
  statLabel: string;
  statValue: number | null;
  rollTotal: number | null;
  modifier: number | null;
  total: number | null;
  formula: string;
}

interface HostBattleDisplayModel {
  player: ResolutionSideModel;
  opponent: ResolutionSideModel;
  challengeStat: Stat;
  resolutionType: string;
  playerDice: number[];
  enemyDice: number[];
  playerTotal: number | null;
  enemyTotal: number | null;
  playerModifier: number | null;
  outcomeLabel: "SUCCESS" | "DEFEAT" | "DRAW" | "RESOLVING";
  outcomeCopy: string;
  resultTone: "victory" | "failure" | "neutral";
  marginText: string;
  cardMovementText: string | null;
  logEntries: string[];
  autoResolveAvailable: boolean;
  resultDeltas: ResultDelta[];
}

function sumDice(dice: number[]): number | null {
  return dice.length > 0 ? dice.reduce((total, die) => total + die, 0) : null;
}

function formatNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatDiceExpression(dice: number[]): string {
  return dice.length > 0 ? dice.join(" + ") : "-";
}

function formatResolutionType(resolution: ActiveResolution | null, fallbackType: string | null | undefined): string {
  if (resolution?.card?.type === "enemy" || resolution?.battle?.enemyName) {
    return "Engagement";
  }

  if (resolution?.battle) {
    return "Test";
  }

  return fallbackType ? `${fallbackType} resolution` : "Resolution";
}

function formatFormula({
  statLabel,
  statValue,
  rollTotal,
  modifier,
  total,
  difficulty
}: {
  statLabel: string;
  statValue: number | null;
  rollTotal: number | null;
  modifier: number | null;
  total: number | null;
  difficulty?: boolean;
}): string {
  if (difficulty) {
    return `${statLabel} ${formatNumber(statValue)} = Total ${formatNumber(total)}`;
  }

  const modifierCopy = modifier && modifier !== 0 ? ` + Mod ${modifier}` : "";
  return `${statLabel} ${formatNumber(statValue)} + Roll ${formatNumber(rollTotal)}${modifierCopy} = Total ${formatNumber(total)}`;
}

function getEnemyBattleValue(resolution: ActiveResolution | null, patch: StatePatch<PublicPatchPayload>): number | null {
  return (
    patch.payload.outcomeSummary?.enemyBonus ??
    resolution?.battle?.modifiers.find((modifier) => modifier.label.toLowerCase() === "enemy")?.value ??
    resolution?.battle?.difficulty ??
    patch.payload.encounter?.difficulty ??
    null
  );
}

function getPlayerBattleValue(resolution: ActiveResolution | null, activePlayer: PublicPlayer | null): number | null {
  if (resolution?.roll) {
    return resolution.roll.modifierTotal;
  }

  const stat = resolution?.battle?.stat;
  return stat && activePlayer ? activePlayer.character.stats[stat] : null;
}

function getCardMovementText(enemyName: string, outcomeText: string | null | undefined): string | null {
  if (!outcomeText) {
    return null;
  }

  if (/trophy pile/i.test(outcomeText)) {
    return `${enemyName} added to Trophy Pile`;
  }

  if (/discard/i.test(outcomeText)) {
    return `${enemyName} moved to discard`;
  }

  if (/current space|this space|place this enemy/i.test(outcomeText)) {
    return `${enemyName} remains on this space`;
  }

  return null;
}

function getOutcomeLabel(success: boolean | null, playerTotal: number | null, enemyTotal: number | null): HostBattleDisplayModel["outcomeLabel"] {
  if (playerTotal !== null && enemyTotal !== null && playerTotal === enemyTotal && success === null) {
    return "DRAW";
  }

  if (success === true) {
    return "SUCCESS";
  }

  if (success === false) {
    return "DEFEAT";
  }

  return "RESOLVING";
}

function getMarginText(outcomeLabel: HostBattleDisplayModel["outcomeLabel"], playerTotal: number | null, enemyTotal: number | null): string {
  if (playerTotal === null || enemyTotal === null) {
    return "Totals pending";
  }

  const margin = Math.abs(playerTotal - enemyTotal);

  if (outcomeLabel === "DRAW" || margin === 0) {
    return "No margin";
  }

  return outcomeLabel === "SUCCESS" ? `Wins by ${margin}` : `Fails by ${margin}`;
}

function getOpponentCardType(resolution: ActiveResolution | null): ResolutionSideModel["cardType"] {
  const artType = resolution?.card?.artType ?? resolution?.source ?? null;

  if (artType === "anomaly" || artType === "contract" || artType === "artifact" || artType === "scar" || artType === "escalation") {
    return artType;
  }

  return "threat";
}

function battleResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  const battleTypes = new Set<ResultDelta["type"]>([
    "wound",
    "heat",
    "trophy",
    "threatDefeated",
    "threatRemains",
    "scarGained",
    "modifierApplied"
  ]);

  return (deltas ?? []).filter((delta) =>
    delta.source === "combat" ||
    delta.source === "resolution-effect" ||
    battleTypes.has(delta.type)
  );
}

function buildBattleModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostBattleDisplayModel | null {
  const resolution = patch.payload.activeResolution ?? null;
  const encounter = patch.payload.encounter;
  const pendingEnemyRoll = patch.payload.pendingEnemyRoll;
  const battle = resolution?.battle;
  const card = resolution?.card;
  const opponentName = battle?.enemyName ?? card?.title ?? encounter?.enemyName ?? encounter?.title ?? pendingEnemyRoll?.encounterTitle ?? null;

  if (!opponentName || !isHostBattleActive(patch, activePlayer)) {
    return null;
  }

  const stat = battle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? "grit";
  const statLabel = statLabelById[stat];
  const outcome = patch.payload.outcomeSummary;
  const playerDice = resolution?.roll?.dice ?? [outcome?.die1, outcome?.die2].filter((die): die is number => typeof die === "number");
  const enemyDice = [outcome?.enemyDie1, outcome?.enemyDie2].filter((die): die is number => typeof die === "number");
  const playerRollTotal = sumDice(playerDice);
  const enemyRollTotal = sumDice(enemyDice);
  const playerTotal = resolution?.roll?.finalTotal ?? outcome?.checkTotal ?? null;
  const enemyTotal = outcome?.enemyTotal ?? (resolution?.roll?.target ?? battle?.difficulty ?? encounter?.difficulty ?? null);
  const playerBattleValue = getPlayerBattleValue(resolution, activePlayer);
  const enemyBattleValue = getEnemyBattleValue(resolution, patch);
  const success = resolution?.roll?.success ?? outcome?.success ?? null;
  const outcomeLabel = getOutcomeLabel(success, playerTotal, enemyTotal);
  const resultTone = outcomeLabel === "SUCCESS" ? "victory" : outcomeLabel === "DEFEAT" ? "failure" : "neutral";
  const outcomeText = resolution?.outcome?.text ?? outcome?.summary ?? null;
  const cardMovementText = getCardMovementText(opponentName, outcomeText);
  const resolutionType = formatResolutionType(resolution, encounter?.cardType);
  const opponentIsRolled = enemyDice.length > 0;
  const opponentStatLabel = opponentIsRolled ? "Battle" : "Difficulty";
  const opponentFormula = opponentIsRolled
    ? formatFormula({
        statLabel: opponentStatLabel,
        statValue: enemyBattleValue,
        rollTotal: enemyRollTotal,
        modifier: null,
        total: enemyTotal
      })
    : formatFormula({
        statLabel: opponentStatLabel,
        statValue: enemyBattleValue,
        rollTotal: null,
        modifier: null,
        total: enemyTotal,
        difficulty: true
      });
  const outcomeCopy =
    outcomeText ??
    (outcomeLabel === "SUCCESS"
      ? `${activePlayer.character.name} wins the resolution.`
      : outcomeLabel === "DEFEAT"
        ? `${activePlayer.character.name} fails the resolution.`
        : "Resolution pending.");
  const logEntries = [
    `${activePlayer.character.name} faces ${opponentName}`,
    `${statLabel} is the relevant stat.`,
    playerDice.length > 0 || enemyDice.length > 0 ? "Dice rolled." : null,
    cardMovementText,
    outcomeText
  ].filter((entry): entry is string => Boolean(entry));

  return {
    player: {
      name: activePlayer.character.name,
      eyebrow: "Active operative",
      detail: activePlayer.character.archetype,
      artUrl: getCharacterPortraitPath(activePlayer.character.id),
      stat,
      statLabel,
      statValue: playerBattleValue,
      rollTotal: playerRollTotal,
      modifier: null,
      total: playerTotal,
      formula: formatFormula({
        statLabel,
        statValue: playerBattleValue,
        rollTotal: playerRollTotal,
        modifier: null,
        total: playerTotal
      })
    },
    opponent: {
      name: opponentName,
      eyebrow: card?.type ?? encounter?.cardType ?? "Opposition",
      detail: card?.flavor ?? encounter?.flavor ?? "Resolve the revealed threat or event.",
      cardId: card?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterCardId ?? null,
      cardType: getOpponentCardType(resolution),
      stat,
      statLabel: opponentStatLabel,
      statValue: enemyBattleValue,
      rollTotal: enemyRollTotal,
      modifier: null,
      total: enemyTotal,
      formula: opponentFormula
    },
    challengeStat: stat,
    resolutionType,
    playerDice,
    enemyDice,
    playerTotal,
    enemyTotal,
    playerModifier: playerBattleValue,
    outcomeLabel,
    outcomeCopy,
    resultTone,
    marginText: getMarginText(outcomeLabel, playerTotal, enemyTotal),
    cardMovementText,
    logEntries,
    autoResolveAvailable: Boolean(pendingEnemyRoll),
    resultDeltas: patch.payload.publicResultDeltas ?? []
  };
}

function StatTotalFooter({ side }: { side: ResolutionSideModel }): ReactElement {
  return (
    <footer className="host-battle-total-footer" data-testid={`host-battle-total-${side.eyebrow.toLowerCase().replace(/\s+/g, "-")}`}>
      <ChallengeBadge stat={side.stat} value={formatNumber(side.statValue)} label={side.statLabel} active />
      <p>{side.formula}</p>
    </footer>
  );
}

function HostBattleCard({ side, variant }: { side: ResolutionSideModel; variant: "player" | "opponent" }): ReactElement {
  const sideClass = variant === "opponent" ? "enemy" : "player";

  return (
    <article className={`host-battle-combatant host-battle-${sideClass} host-battle-parallax-card`} data-testid={variant === "player" ? "host-battle-player" : "host-battle-enemy"}>
      <header className="host-battle-copy">
        <span>{side.eyebrow}</span>
        <h2>{side.name}</h2>
        <p>{side.detail}</p>
      </header>
      <div className={`host-battle-portrait${variant === "opponent" ? " host-battle-card-art" : ""}`}>
        {variant === "player" && side.artUrl ? (
          <img src={side.artUrl} alt={side.name} />
        ) : variant === "opponent" ? (
          <CardArtImage cardType={side.cardType ?? "threat"} cardId={side.cardId ?? null} alt={side.name} />
        ) : (
          <div className="host-battle-fallback">Operative</div>
        )}
      </div>
      <StatTotalFooter side={side} />
    </article>
  );
}

export function HostBattleOverlay({
  patch,
  activePlayer
}: {
  patch: StatePatch<PublicPatchPayload> | null;
  activePlayer: PublicPlayer | null;
}): ReactElement | null {
  if (!patch || !activePlayer) {
    return null;
  }

  const model = buildBattleModel(patch, activePlayer);

  if (!model) {
    return null;
  }

  return (
    <section className="host-battle-overlay" aria-label="Host battle overlay" data-testid="host-battle-overlay">
      <div
        className={`host-battle-panel host-battle-panel-${model.resultTone} host-battle-panel-${model.challengeStat}`}
        style={getChallengeThemeStyle(model.challengeStat)}
      >
        <HostCinematicFxLayer
          variant="battle"
          tone={model.resultTone}
          burstActive={model.resultTone !== "neutral"}
          testId="host-battle-fx-layer"
        />

        <HostBattleCard side={model.player} variant="player" />

        <section className="host-battle-vs-block" aria-label="Resolution comparison" data-testid="host-battle-vs-block">
          <span>{model.resolutionType}</span>
          <strong>VS</strong>
          <ChallengeBadge stat={model.challengeStat} label={statLabelById[model.challengeStat]} size="compact" active />
          <div className="host-battle-dice-animation host-battle-dice-large">
            <DiceRollScene
              attackValue={model.playerTotal}
              defenseValue={model.enemyTotal}
              modifierValue={model.playerModifier}
              attackDieFace={model.playerDice[0] ?? null}
              defenseDieFace={model.enemyDice[0] ?? model.playerDice[1] ?? null}
              modifierDieFace={model.playerDice[1] ?? null}
              attackSuccess={model.outcomeLabel === "SUCCESS"}
              defenseSuccess={model.outcomeLabel === "DEFEAT"}
              challengeStat={model.challengeStat}
              className="battle-dice-animation"
              testId="battle-dice-animation"
            />
          </div>
          <div className={`host-battle-result-banner host-battle-result-${model.outcomeLabel.toLowerCase()}`} data-testid="host-battle-result-banner">
            <b>{model.outcomeLabel}</b>
            <span>{model.marginText}</span>
          </div>
        </section>

        <HostBattleCard side={model.opponent} variant="opponent" />

        <div className="host-battle-rolls" data-testid="host-battle-rolls">
          <div className="host-battle-formula host-battle-formula-player">
            <span>Player total</span>
            <strong>{formatNumber(model.playerTotal)}</strong>
            <p>{model.player.formula}</p>
          </div>
          <div className="host-battle-battle-line">
            <span><ChallengeBadge stat={model.challengeStat} value={formatNumber(model.player.statValue)} size="compact" /></span>
            <strong>vs</strong>
            <span><ChallengeBadge stat={model.challengeStat} value={formatNumber(model.opponent.statValue)} label={model.opponent.statLabel} size="compact" /></span>
          </div>
          <div className="host-battle-formula host-battle-formula-enemy">
            <span>Opposition total</span>
            <strong>{formatNumber(model.enemyTotal)}</strong>
            <p>{model.opponent.formula}</p>
          </div>
        </div>

        <div className="host-battle-actions">
          <div className="host-battle-status-chip" role="status">
            {model.outcomeCopy}
          </div>
          {model.cardMovementText && (
            <div className="host-battle-status-chip host-battle-status-chip-secondary" role="status">
              {model.cardMovementText}
            </div>
          )}
          {model.autoResolveAvailable && (
            <div className="host-battle-status-chip host-battle-status-chip-secondary" role="status">
              Enemy roller pending
            </div>
          )}
          <ResultDeltaRow deltas={model.resultDeltas} publicOnly className="host-battle-delta-row" />
        </div>

        <div className="host-battle-log" data-testid="host-battle-log">
          {model.logEntries.slice(0, 2).map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
