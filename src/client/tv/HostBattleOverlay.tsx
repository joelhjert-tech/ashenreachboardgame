import type { ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { ChallengeBadge } from "../shared/ChallengeBadge.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { statLabelById } from "../shared/statLabels.js";
import type { ActiveResolution, PublicPatchPayload, PublicPlayer, StatePatch, Stat } from "../shared/types.js";
import { HostCinematicFxLayer } from "./HostCinematicFxLayer.js";
import { isHostBattleActive } from "./hostBattleState.js";
import { BattleDiceAnimation } from "./BattleDiceAnimation.js";

interface HostBattleDisplayModel {
  playerName: string;
  playerTitle: string;
  playerPortraitUrl: string | null;
  challengeStat: Stat;
  playerStatLabel: string;
  playerBattleValue: number | null;
  playerWounds: number | null;
  playerHeat: number | null;
  enemyCardId: string | null;
  enemyName: string;
  enemyType: string;
  enemyRulesText: string | null;
  enemyBattleValue: number | null;
  playerDice: number[];
  enemyDice: number[];
  playerModifier: number | null;
  enemyModifier: number | null;
  playerTotal: number | null;
  enemyTotal: number | null;
  playerFormula: string;
  enemyFormula: string;
  outcomeLabel: string | null;
  resultTone: "victory" | "failure" | "neutral";
  cardMovementText: string | null;
  logEntries: string[];
  autoResolveAvailable: boolean;
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

function formatDiceExpression(dice: number[]): string {
  return dice.length > 0 ? dice.join(" + ") : "-";
}

function formatBattleFormula({
  dice,
  modifier,
  modifierLabel,
  total,
  fallbackLabel
}: {
  dice: number[];
  modifier: number | null;
  modifierLabel: string;
  total: number | null;
  fallbackLabel: string;
}): string {
  if (total === null) {
    return fallbackLabel;
  }

  const diceExpression = formatDiceExpression(dice);

  if (modifier === null) {
    return `${diceExpression} = ${total}`;
  }

  return `${diceExpression} + ${modifierLabel} ${modifier} = ${total}`;
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

function buildBattleModel(
  patch: StatePatch<PublicPatchPayload>,
  activePlayer: PublicPlayer
): HostBattleDisplayModel | null {
  const resolution = patch.payload.activeResolution ?? null;
  const encounter = patch.payload.encounter;
  const pendingEnemyRoll = patch.payload.pendingEnemyRoll;
  const battle = resolution?.battle;
  const card = resolution?.card;
  const enemyName = battle?.enemyName ?? encounter?.enemyName ?? encounter?.title ?? pendingEnemyRoll?.encounterTitle ?? null;

  if (!enemyName || !isHostBattleActive(patch, activePlayer)) {
    return null;
  }

  const stat = battle?.stat ?? encounter?.stat ?? pendingEnemyRoll?.stat ?? "grit";
  const outcome = patch.payload.outcomeSummary;
  const playerDice = resolution?.roll?.dice ?? [outcome?.die1, outcome?.die2].filter((die): die is number => typeof die === "number");
  const enemyDice = [outcome?.enemyDie1, outcome?.enemyDie2].filter((die): die is number => typeof die === "number");
  const playerTotal = resolution?.roll?.finalTotal ?? outcome?.checkTotal ?? null;
  const enemyTotal = outcome?.enemyTotal ?? (resolution?.roll?.target && resolution.card?.type === "enemy" ? resolution.roll.target : null);
  const playerBattleValue = getPlayerBattleValue(resolution, activePlayer);
  const enemyBattleValue = getEnemyBattleValue(resolution, patch);
  const outcomeText = resolution?.outcome?.text ?? outcome?.summary ?? null;
  const outcomeLabel =
    resolution?.roll?.success === true || outcome?.success === true
      ? `${activePlayer.character.name} wins the battle`
      : resolution?.roll?.success === false || outcome?.success === false
        ? `${activePlayer.character.name} is driven back`
      : null;
  const resultTone =
    resolution?.roll?.success === true || outcome?.success === true
      ? "victory"
      : resolution?.roll?.success === false || outcome?.success === false
        ? "failure"
        : "neutral";
  const cardMovementText = getCardMovementText(enemyName, outcomeText);
  const logEntries = [
    `${activePlayer.character.name} engages ${enemyName}`,
    playerDice.length > 0 || enemyDice.length > 0 ? "Battle dice rolled" : null,
    cardMovementText,
    outcomeText,
    outcomeLabel
  ].filter((entry): entry is string => Boolean(entry));

  return {
    playerName: activePlayer.character.name,
    playerTitle: activePlayer.character.archetype,
    playerPortraitUrl: getCharacterPortraitPath(activePlayer.character.id),
    challengeStat: stat,
    playerStatLabel: statLabelById[stat],
    playerBattleValue,
    playerWounds: activePlayer.character.wounds,
    playerHeat: activePlayer.character.heat,
    enemyCardId: card?.id ?? encounter?.id ?? pendingEnemyRoll?.encounterCardId ?? null,
    enemyName,
    enemyType: card?.type ?? encounter?.cardType ?? "enemy",
    enemyRulesText: card?.flavor ?? encounter?.flavor ?? null,
    enemyBattleValue,
    playerDice,
    enemyDice,
    playerModifier: playerBattleValue,
    enemyModifier: enemyBattleValue,
    playerTotal,
    enemyTotal,
    playerFormula: formatBattleFormula({
      dice: playerDice,
      modifier: playerBattleValue,
      modifierLabel: statLabelById[stat],
      total: playerTotal,
      fallbackLabel: `${statLabelById[stat]} ${playerBattleValue ?? "-"}`
    }),
    enemyFormula: formatBattleFormula({
      dice: enemyDice,
      modifier: enemyBattleValue,
      modifierLabel: "Battle",
      total: enemyTotal,
      fallbackLabel: `Battle ${enemyBattleValue ?? "-"}`
    }),
    outcomeLabel,
    resultTone,
    cardMovementText,
    logEntries,
    autoResolveAvailable: Boolean(pendingEnemyRoll)
  };
}

function formatNumber(value: number | null): string {
  return value === null ? "-" : String(value);
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
        <article className="host-battle-combatant host-battle-player host-battle-parallax-card" data-testid="host-battle-player">
          <header className="host-battle-copy">
            <span>Active operative</span>
            <h2>{model.playerName}</h2>
            <p>{model.playerTitle}</p>
          </header>
          <div className="host-battle-portrait">
            {model.playerPortraitUrl ? (
              <img src={model.playerPortraitUrl} alt={model.playerName} />
            ) : (
              <div className="host-battle-fallback">Operative</div>
            )}
          </div>
          <div className="host-battle-stat-grid">
            <div>
              <ChallengeBadge stat={model.challengeStat} value={formatNumber(model.playerBattleValue)} active />
            </div>
            <div>
              <span>Wounds</span>
              <strong>{formatNumber(model.playerWounds)}</strong>
            </div>
            <div>
              <span>Heat</span>
              <strong>{formatNumber(model.playerHeat)}</strong>
            </div>
          </div>
        </article>

        <div className="host-battle-vs" aria-hidden="true">
          <div className="host-battle-crossed-icon">
            <span />
            <span />
          </div>
          <strong>VS</strong>
        </div>

        <article className="host-battle-combatant host-battle-enemy host-battle-parallax-card" data-testid="host-battle-enemy">
          <header className="host-battle-copy">
            <span>{model.enemyType}</span>
            <h2>{model.enemyName}</h2>
            <p>{model.enemyRulesText ?? "Enemy rules will appear here once the threat is revealed."}</p>
          </header>
          <div className="host-battle-portrait host-battle-card-art">
            <CardArtImage cardType="threat" cardId={model.enemyCardId} alt={model.enemyName} />
          </div>
          <div className="host-battle-stat-grid">
            <div>
              <ChallengeBadge stat={model.challengeStat} value={formatNumber(model.enemyBattleValue)} label="Battle" active />
            </div>
          </div>
        </article>

        <div className="host-battle-rolls" data-testid="host-battle-rolls">
          <div className="host-battle-formula host-battle-formula-player">
            <span>Player total</span>
            <strong>{formatNumber(model.playerTotal)}</strong>
            <p>{model.playerFormula}</p>
          </div>
          <div className="host-battle-dice-animation">
            <BattleDiceAnimation
              attackValue={model.playerTotal}
              defenseValue={model.enemyTotal}
              modifierValue={model.playerModifier}
              attackDieFace={model.playerDice[0] ?? null}
              defenseDieFace={model.enemyDice[0] ?? model.playerDice[1] ?? null}
              modifierDieFace={model.playerDice[1] ?? null}
              attackSuccess={model.outcomeLabel?.includes("wins") ?? false}
              defenseSuccess={model.outcomeLabel?.includes("driven back") ?? false}
              challengeStat={model.challengeStat}
            />
          </div>
          <div className="host-battle-formula host-battle-formula-enemy">
            <span>Enemy total</span>
            <strong>{formatNumber(model.enemyTotal)}</strong>
            <p>{model.enemyFormula}</p>
          </div>
          <div className="host-battle-battle-line">
            <span><ChallengeBadge stat={model.challengeStat} value={formatNumber(model.playerModifier)} size="compact" /></span>
            <strong>vs</strong>
            <span><ChallengeBadge stat={model.challengeStat} value={formatNumber(model.enemyModifier)} label="Battle" size="compact" /></span>
          </div>
        </div>

        <div className="host-battle-actions">
          <div className="host-battle-status-chip" role="status">
            {model.outcomeLabel ? "Awaiting player continue" : "Battle resolving"}
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
