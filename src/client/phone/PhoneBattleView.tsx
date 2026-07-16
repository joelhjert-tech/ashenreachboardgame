import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { GameButton } from "../shared/GameButton.js";
import { formatResultDelta } from "../shared/resultDeltas.js";
import { getCardArtPath, getCharacterPortraitPath } from "../shared/assetPaths.js";
import { statLabelById } from "../shared/statLabels.js";
import type {
  ClientIntent,
  PhonePatchPayload,
  PhoneSelfState,
  ResultDelta,
  ResultDeltaType,
  Stat
} from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
import { getBattleAssistViewModel } from "./inventoryPresentation.js";

export interface PhoneBattleChoiceAction {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface PhoneBattleViewProps {
  patch: PhonePatchPayload;
  self: PhoneSelfState;
  onIntent: (intent: ClientIntent) => void;
  choiceActions?: PhoneBattleChoiceAction[];
  optionalActions?: PhoneBattleChoiceAction[];
}

type BattleContext = "battle" | "operative" | "gear" | "log";

const consequenceGlyphByType: Record<ResultDeltaType, string> = {
  wound: "✚",
  salvage: "S",
  trophy: "T",
  gearGained: "+",
  gearLost: "−",
  itemBought: "+",
  itemSold: "S",
  contractProgress: "C",
  contractCompleted: "C",
  scenarioProgress: "◇",
  scenarioPressure: "!",
  agendaProgress: "A",
  agendaCompleted: "A",
  threatDefeated: "†",
  threatRemains: "!",
  sectorUnlocked: "↗",
  shopUnlocked: "S",
  afflictionDrawn: "!",
  afflictionFlipped: "◇",
  scarGained: "✚",
  recallTriggered: "↩",
  fateSpent: "F",
  statUpgrade: "↑",
  modifierApplied: "±"
};

function normalizeCopy(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;
}

function enemyArtType(patch: PhonePatchPayload): CardImageType {
  const artType = patch.activeResolution?.card?.artType;
  if (artType === "anomaly" || artType === "artifact" || artType === "contract" || artType === "escalation" || artType === "threat") {
    return artType;
  }
  return "threat";
}

export function isOpposedPhoneBattleActive(patch: PhonePatchPayload | null | undefined): boolean {
  return Boolean(
    patch?.pendingEnemyRoll ||
      patch?.encounter?.cardType === "enemy" ||
      patch?.activeResolution?.card?.type === "enemy"
  );
}

export function getPhoneBattleIdentity(patch: PhonePatchPayload): string | null {
  if (!isOpposedPhoneBattleActive(patch)) return null;
  return (
    patch.activeResolution?.id ??
    (patch.pendingEnemyRoll
      ? `${patch.pendingEnemyRoll.fighterSeatId}:${patch.pendingEnemyRoll.encounterCardId}`
      : patch.encounter?.id ?? null)
  );
}

function visibleBattleDeltas(patch: PhonePatchPayload): ResultDelta[] {
  const deltas = patch.playerResultDeltas ?? patch.publicResultDeltas ?? [];
  const battleTypes = new Set<ResultDeltaType>([
    "wound",
    "scarGained",
    "salvage",
    "trophy",
    "gearGained",
    "gearLost",
    "threatDefeated",
    "threatRemains",
    "scenarioProgress",
    "scenarioPressure",
    "recallTriggered",
    "modifierApplied",
    "afflictionDrawn",
    "afflictionFlipped"
  ]);
  const seen = new Set<string>();

  return deltas.filter((delta) => {
    if (delta.visibility === "hidden") return false;
    if (delta.source !== "combat" && delta.source !== "resolution-effect" && !battleTypes.has(delta.type)) return false;
    const key =
      delta.type === "threatDefeated" || delta.type === "threatRemains"
        ? `${delta.type}:${delta.targetSeatId ?? ""}`
        : `${delta.type}:${delta.source ?? ""}:${delta.targetSeatId ?? ""}:${delta.value ?? ""}:${normalizeCopy(delta.publicText)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackEffects(patch: PhonePatchPayload, deltas: ResultDelta[]): string[] {
  const structured = new Set(
    deltas.flatMap((delta) => [
      normalizeCopy(delta.publicText),
      normalizeCopy(delta.privateText ?? ""),
      normalizeCopy(delta.label)
    ])
  );
  const seen = new Set<string>();

  return (patch.activeResolution?.outcome?.effects ?? []).filter((effect) => {
    const normalized = normalizeCopy(effect);
    if (
      deltas.some((delta) => delta.type === "threatRemains") &&
      (normalized.includes("remains") || normalized.includes("unresolved"))
    ) {
      return false;
    }
    if (!normalized || structured.has(normalized) || [...structured].some((entry) => entry && (normalized.includes(entry) || entry.includes(normalized))) || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function BattleConsequences({ patch }: { patch: PhonePatchPayload }): ReactElement | null {
  const structuredDeltas = visibleBattleDeltas(patch);
  const hasTrophyDelta = structuredDeltas.some((delta) => delta.type === "trophy");
  const hasAuthoredTrophyEffect = (patch.activeResolution?.outcome?.effects ?? []).some((effect) =>
    normalizeCopy(effect).includes("trophy")
  );
  const deltas = structuredDeltas.filter(
    (delta) => delta.type !== "threatDefeated" || (!hasTrophyDelta && !hasAuthoredTrophyEffect)
  );
  const effects = fallbackEffects(patch, structuredDeltas);
  if (deltas.length === 0 && effects.length === 0) return null;

  return (
    <div className="phone-battle-shell__consequences" aria-label="Battle consequences">
      {deltas.map((delta) => {
        const presentation = formatResultDelta(delta);
        return (
          <div
            key={delta.id}
            className={`phone-battle-consequence phone-battle-consequence--${presentation.tone}`}
            data-testid={`phone-battle-consequence-${delta.type}`}
          >
            <span aria-hidden="true">{consequenceGlyphByType[delta.type]}</span>
            <div>
              <strong>{delta.type === "threatDefeated" ? "Trophy pile" : presentation.label}</strong>
              <small>{presentation.detail}</small>
            </div>
          </div>
        );
      })}
      {effects.map((effect) => (
        <div key={effect} className="phone-battle-consequence phone-battle-consequence--neutral">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>{effect}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function BattleChoiceList({ actions }: { actions: PhoneBattleChoiceAction[] }): ReactElement | null {
  if (actions.length === 0) return null;

  return (
    <section className="phone-battle-shell__choices" aria-label="Required battle choice">
      <span>Resolve before continuing</span>
      {actions.map((action) => (
        <GameButton
          key={action.key}
          type="button"
          tone="battle"
          disabled={action.disabled}
          disabledReason={action.disabled ? action.detail ?? "Unavailable" : undefined}
          onClick={action.onClick}
          sublabel={action.detail}
        >
          {action.label}
        </GameButton>
      ))}
    </section>
  );
}

function BattleContextNavigation({ onSelect }: { onSelect: (context: Exclude<BattleContext, "battle">) => void }): ReactElement {
  return (
    <nav className="phone-battle-shell__nav" aria-label="Battle navigation">
      <button type="button" onClick={() => onSelect("operative")}>Operative</button>
      <button type="button" onClick={() => onSelect("gear")}>Gear</button>
      <button type="button" onClick={() => onSelect("log")}>Battle Log</button>
    </nav>
  );
}

export function PhoneBattleView({
  patch,
  self,
  onIntent,
  choiceActions = [],
  optionalActions = []
}: PhoneBattleViewProps): ReactElement {
  const identity = getPhoneBattleIdentity(patch);
  const [context, setContext] = useState<BattleContext>("battle");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const resolution = patch.activeResolution ?? null;
  const encounter = patch.encounter;
  const pendingRoll = patch.pendingEnemyRoll;
  const battle = resolution?.battle;
  const roll = resolution?.roll;
  const outcome = resolution?.outcome;
  const assist = getBattleAssistViewModel(patch);
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const isActiveSeat = activeSeatId === self.seatId;
  const isAssignedEnemyRoller = pendingRoll?.assignedRollerSeatId === self.seatId;
  const assignedRollerName =
    patch.seats.find((seat) => seat.seatId === pendingRoll?.assignedRollerSeatId)?.displayName ??
    "another operative";
  const stat: Stat = battle?.stat ?? encounter?.stat ?? pendingRoll?.stat ?? "grit";
  const statLabel = statLabelById[stat].toUpperCase();
  const enemyName =
    battle?.enemyName ??
    resolution?.card?.title ??
    pendingRoll?.encounterTitle ??
    encounter?.enemyName ??
    encounter?.title ??
    "Unknown threat";
  const enemyId = resolution?.card?.id ?? pendingRoll?.encounterCardId ?? encounter?.id ?? "";
  const opponentTotal = roll?.target ?? battle?.difficulty ?? encounter?.difficulty ?? assist?.enemyBattleValue ?? 0;
  const operativeValue = assist?.playerBattleValue ?? self.character.stats[stat] ?? 0;
  const rollValue = roll ? roll.dice.reduce((sum, value) => sum + value, 0) : null;
  const finalTotal = roll?.finalTotal ?? null;
  const result = roll ? (roll.success ? "success" : "defeat") : null;
  const resultLabel = result === "success" ? "Success" : result === "defeat" ? "Defeat" : pendingRoll ? "Enemy roll" : resolution?.stage === "battle_setup" ? "Roll required" : "Battle";
  const stateLabel = result ? "Battle resolution" : pendingRoll ? "Battle" : resolution?.stage === "battle_setup" ? "Battle" : "Engagement";
  const tieSucceeded = Boolean(roll?.success && roll.finalTotal === roll.target);
  const detailsFormula = roll
    ? `${roll.dice.join(" + ")} ${roll.modifierTotal >= 0 ? "+" : "−"} ${Math.abs(roll.modifierTotal)} = ${roll.finalTotal}`
    : null;
  const outcomeFlavor = outcome?.text ?? null;
  const usableGearCount = assist?.usableCards.length ?? 0;

  useEffect(() => {
    setContext("battle");
    setDetailsOpen(false);
  }, [identity]);

  const primaryAction = useMemo(() => {
    if (choiceActions.length > 0) {
      return { label: "Complete choice above", disabled: true, action: null as (() => void) | null };
    }
    if (pendingRoll) {
      return isAssignedEnemyRoller
        ? {
            label: "Roll for enemy",
            disabled: false,
            action: () => onIntent({ type: "ENEMY_ROLL_REQUESTED", seatId: self.seatId })
          }
        : { label: `Waiting on ${assignedRollerName}`, disabled: true, action: null };
    }
    if (roll && resolution && ["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)) {
      return isActiveSeat
        ? {
            label: "Continue",
            disabled: false,
            action: () => onIntent({ type: "CONTINUE_RESOLUTION", seatId: self.seatId })
          }
        : { label: "Waiting for active operative", disabled: true, action: null };
    }
    if (!isActiveSeat) {
      return { label: "Waiting for active operative", disabled: true, action: null };
    }
    if (resolution?.stage === "battle_setup") {
      return {
        label: `Roll ${statLabel}`,
        disabled: false,
        action: () => onIntent({ type: "COMBAT_REQUESTED", seatId: self.seatId, stat })
      };
    }
    return {
      label: "Enter combat",
      disabled: false,
      action: () => onIntent({ type: "COMBAT_REQUESTED", seatId: self.seatId, stat })
    };
  }, [
    assignedRollerName,
    choiceActions.length,
    isActiveSeat,
    isAssignedEnemyRoller,
    onIntent,
    pendingRoll,
    resolution,
    roll,
    self.seatId,
    stat,
    statLabel
  ]);

  const combatantArena = (
    <section className="phone-battle-arena" aria-label={`${self.character.name} versus ${enemyName}`}>
      <article className="phone-battle-combatant phone-battle-combatant--operative">
        <img src={getCharacterPortraitPath(self.character.id)} alt={self.character.name} />
        <div>
          <span>Operative</span>
          <strong>{self.character.name}</strong>
          <small>{statLabel} {operativeValue}</small>
        </div>
      </article>
      <span className="phone-battle-arena__versus" aria-hidden="true">VS</span>
      <article className="phone-battle-combatant phone-battle-combatant--enemy">
        <CardArtImage
          cardType={enemyArtType(patch)}
          cardId={enemyId}
          alt={enemyName}
        />
        <div>
          <span>Threat</span>
          <strong>{enemyName}</strong>
          <small>Opponent {opponentTotal}</small>
        </div>
      </article>
    </section>
  );

  return (
    <section
      className={`phone-battle-shell phone-battle-shell--${result ?? "active"}`}
      data-testid="phone-battle-shell"
      data-battle-identity={identity ?? undefined}
    >
      <div className="phone-battle-shell__scroll" data-testid="phone-battle-scroll-region">
        {context === "battle" ? (
          <>
            <header className="phone-battle-state">
              <span>{stateLabel}</span>
              <strong>{resultLabel}</strong>
            </header>
            {combatantArena}
            <section className="phone-battle-equation" aria-label="Battle totals">
              <div>
                <span>{statLabel}</span>
                <strong>{operativeValue}</strong>
              </div>
              <div>
                <span>{rollValue === null ? "Roll" : "Roll total"}</span>
                <strong>{rollValue === null ? "—" : rollValue}</strong>
              </div>
              <div>
                <span>Modifier</span>
                <strong>{roll ? signed(roll.modifierTotal) : "—"}</strong>
              </div>
              <div>
                <span>Opponent</span>
                <strong>{opponentTotal}</strong>
              </div>
              <p data-testid="phone-battle-total-comparison">
                <span>Total</span>
                <strong>{finalTotal ?? "—"} <i>—</i> {opponentTotal}</strong>
              </p>
              {tieSucceeded ? <small>Tie succeeds against this threat.</small> : null}
            </section>
            {result ? (
              <section className={`phone-battle-outcome phone-battle-outcome--${result}`} data-testid="phone-battle-outcome">
                <span>{result === "success" ? "Threat defeated" : "Operative defeated"}</span>
                <BattleConsequences patch={patch} />
                {outcomeFlavor ? <blockquote>“{outcomeFlavor}”</blockquote> : null}
              </section>
            ) : null}
            <BattleChoiceList actions={choiceActions} />
            {optionalActions.length > 0 ? (
              <section className="phone-battle-shell__choices phone-battle-shell__choices--optional" aria-label="Battle options">
                <span>Battle option</span>
                {optionalActions.map((action) => (
                  <GameButton
                    key={action.key}
                    type="button"
                    tone="secondary"
                    disabled={action.disabled}
                    disabledReason={action.disabled ? action.detail ?? "Unavailable" : undefined}
                    onClick={action.onClick}
                    sublabel={action.detail}
                  >
                    {action.label}
                  </GameButton>
                ))}
              </section>
            ) : null}
            <button
              type="button"
              className="phone-battle-details-toggle"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? "Hide details" : "View details"}
            </button>
            {detailsOpen ? (
              <section className="phone-battle-details" aria-label="Battle details">
                <div>
                  <span>Full roll</span>
                  <strong>{detailsFormula ?? "Roll not yet made"}</strong>
                </div>
                <div>
                  <span>Modifier sources</span>
                  <strong>
                    {battle?.modifiers.length
                      ? battle.modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ")
                      : "No projected modifiers"}
                  </strong>
                </div>
                {resolution?.card?.flavor ?? encounter?.flavor ? (
                  <p>{resolution?.card?.flavor ?? encounter?.flavor}</p>
                ) : null}
                {patch.outcomeSummary?.summary ? <p>{patch.outcomeSummary.summary}</p> : null}
              </section>
            ) : null}
          </>
        ) : (
          <section className="phone-battle-context" aria-label={`${titleCase(context)} battle context`}>
            <button type="button" className="phone-battle-context__back" onClick={() => setContext("battle")}>
              Back to battle
            </button>
            {context === "operative" ? (
              <>
                <span>Operative status</span>
                <img src={getCharacterPortraitPath(self.character.id)} alt="" />
                <strong>{self.character.name}</strong>
                <p>{self.character.archetype}</p>
                <dl>
                  <div><dt>{statLabel}</dt><dd>{operativeValue}</dd></div>
                  <div><dt>Wounds</dt><dd>{self.character.wounds}</dd></div>
                  <div><dt>Salvage</dt><dd>{self.character.salvage ?? 0}</dd></div>
                  <div><dt>Scars</dt><dd>{self.character.scars.length}</dd></div>
                </dl>
              </>
            ) : context === "gear" ? (
              <>
                <span>Battle gear</span>
                {usableGearCount > 0 ? (
                  <PhoneInventoryPanel patch={patch} onIntent={onIntent} compact onlyUsable />
                ) : (
                  <p>No gear is eligible in this battle window.</p>
                )}
              </>
            ) : (
              <>
                <span>Battle log</span>
                <strong>{enemyName}</strong>
                <div className="phone-battle-details phone-battle-details--log">
                  <div><span>Stage</span><strong>{titleCase(resolution?.stage ?? "encounter")}</strong></div>
                  <div><span>Full roll</span><strong>{detailsFormula ?? "Roll not yet made"}</strong></div>
                  <div><span>Opponent</span><strong>{opponentTotal}</strong></div>
                  <div>
                    <span>Modifiers</span>
                    <strong>{battle?.modifiers.length ? battle.modifiers.map((modifier) => `${modifier.label} ${signed(modifier.value)}`).join(", ") : "None"}</strong>
                  </div>
                  {patch.outcomeSummary?.summary ? <p>{patch.outcomeSummary.summary}</p> : null}
                </div>
              </>
            )}
          </section>
        )}
      </div>
      <div className="phone-battle-shell__action" data-testid="phone-battle-action-dock">
        <GameButton
          type="button"
          tone={result === "defeat" ? "primary" : "battle"}
          disabled={primaryAction.disabled}
          disabledReason={primaryAction.disabled ? primaryAction.label : undefined}
          onClick={() => primaryAction.action?.()}
        >
          {primaryAction.label}
        </GameButton>
      </div>
      <BattleContextNavigation onSelect={setContext} />
    </section>
  );
}
