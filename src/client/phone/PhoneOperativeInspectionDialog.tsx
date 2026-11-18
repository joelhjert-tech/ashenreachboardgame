import { useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";
import type { CharacterCatalogEntry } from "../shared/types.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { PhoneOptimizedImage } from "../shared/PhoneOptimizedImage.js";
import { statLabelById, statOrder } from "../shared/statLabels.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";

function formatComplexity(value: string | undefined): string {
  return value
    ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "Standard";
}

export function PhoneOperativeInspectionDialog({
  character,
  unavailableReason,
  selecting,
  actionLabel,
  readOnly = false,
  onClose,
  onSelect
}: {
  character: CharacterCatalogEntry;
  unavailableReason: string | null;
  selecting: boolean;
  actionLabel?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSelect: () => void;
}): ReactElement {
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = `phone-operative-inspection-title-${character.id}`;
  const presentation = character.presentation;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="phone-operative-inspection" data-testid="phone-operative-inspection">
      <section
        ref={dialogRef}
        className="phone-operative-inspection__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <header className="phone-operative-inspection__header">
          <div>
            <span>Operative dossier</span>
            <strong>{readOnly ? "Your operative" : "Inspect before selection"}</strong>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label={`Close ${character.name} inspection`}>Close</button>
        </header>

        <div className="phone-operative-inspection__scroll">
          <section className="phone-operative-inspection__hero">
            <PhoneOptimizedImage src={getCharacterPortraitPath(character.id)} alt="" aria-hidden="true" />
            <div>
              <span>{character.archetype}</span>
              <h2 id={titleId}>{character.name}</h2>
              {presentation ? <p>{presentation.role} · {formatComplexity(presentation.complexity)}</p> : null}
              {presentation?.recommendedForFirstGame ? <em>First-game pick</em> : null}
            </div>
          </section>

          {unavailableReason ? <p className="phone-operative-inspection__unavailable" role="status">{unavailableReason}</p> : null}

          <section className="phone-operative-inspection__section" aria-labelledby={`${titleId}-stats`}>
            <div className="phone-operative-inspection__section-heading">
              <span>Base profile</span>
              <h3 id={`${titleId}-stats`}>Starting stats</h3>
            </div>
            <div className="phone-operative-inspection__stats" aria-label={`${character.name} stats`}>
              {statOrder.map((stat) => (
                <div key={stat} style={getChallengeThemeStyle(stat)}>
                  <span>{statLabelById[stat]}</span>
                  <strong>{character.stats[stat]}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="phone-operative-inspection__section" aria-labelledby={`${titleId}-abilities`}>
            <div className="phone-operative-inspection__section-heading">
              <span>Special rules</span>
              <h3 id={`${titleId}-abilities`}>Abilities</h3>
            </div>
            <div className="phone-operative-inspection__abilities">
              {character.abilities.length > 0 ? character.abilities.map((ability) => (
                <article key={ability.id}>
                  <strong>{ability.name}</strong>
                  <p>{ability.text}</p>
                </article>
              )) : <p>No special ability is listed for this operative.</p>}
            </div>
          </section>

          {presentation ? (
            <>
              <section className="phone-operative-inspection__section phone-operative-inspection__fit" aria-label="Operative strengths and weaknesses">
                <div>
                  <span>Strengths</span>
                  <ul>{presentation.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
                </div>
                <div>
                  <span>Watch for</span>
                  <ul>{presentation.weaknesses.map((weakness) => <li key={weakness}>{weakness}</li>)}</ul>
                </div>
              </section>
              <section className="phone-operative-inspection__section" aria-labelledby={`${titleId}-starting`}>
                <div className="phone-operative-inspection__section-heading">
                  <span>Setup reminder</span>
                  <h3 id={`${titleId}-starting`}>Provision choices</h3>
                </div>
                <p>This operative brings no automatic Equipment or Followers. After choosing a Contract, choose one provision from each of two randomized pairs. Only those two choices enter your starting inventory.</p>
              </section>
              <section className="phone-operative-inspection__section">
                <div className="phone-operative-inspection__section-heading"><span>Playstyle</span><h3>How this operative plays</h3></div>
                <p>{presentation.playstyleSummary}</p>
              </section>
            </>
          ) : null}

          {character.lore ? (
            <section className="phone-operative-inspection__section">
              <div className="phone-operative-inspection__section-heading"><span>Record</span><h3>Background</h3></div>
              <p>{character.lore}</p>
            </section>
          ) : null}
        </div>

        <footer className="phone-operative-inspection__actions">
          <button type="button" className="phone-button" onClick={onClose}>{readOnly ? "Back to my operative" : "Keep browsing"}</button>
          {!readOnly ? <button
            type="button"
            className="phone-button phone-button-primary"
            disabled={selecting || Boolean(unavailableReason)}
            onClick={onSelect}
          >
            {selecting ? "Selecting…" : unavailableReason ?? actionLabel ?? `Select ${character.name}`}
          </button> : null}
        </footer>
      </section>
    </div>
  );
}
