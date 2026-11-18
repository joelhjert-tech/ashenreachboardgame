import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { sectorResolutionPresentationTimings } from "../shared/motionTokens.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getCardArtPath,
  getCharacterPortraitPathOrNull,
  getNemesisPortraitPath,
  getSignalTheatreDieFacePath,
  getSignalTheatreResultCrestPath,
  getSignalTheatreStatSealPath
} from "../shared/assetPaths.js";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import type { SignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";
import "./SignalSectorResolution.css";

function wasResolutionSeen(id: string): boolean {
  return typeof window !== "undefined"
    && window.sessionStorage.getItem(`ashenreach:signal-resolution-seen:${id}`) === "1";
}

function oppositionArtPath(model: SignalSectorResolutionModel): string | null {
  const imageKey = model.oppositionImageKey;
  if (!imageKey) return null;
  if (imageKey.startsWith("/")) return imageKey;
  if (model.oppositionArtKind === "nemesis" || imageKey.startsWith("nemesis_")) {
    return getNemesisPortraitPath(imageKey);
  }
  return getCardArtPath("threat", imageKey);
}

function totalText(total: number | null): string {
  return total === null ? "—" : String(total);
}

type DieFaceName = "front" | "back" | "right" | "left" | "top" | "bottom";

const DIE_FACE_VALUES: Readonly<Record<number, Readonly<Record<DieFaceName, number>>>> = {
  1: { front: 1, back: 6, right: 3, left: 4, top: 2, bottom: 5 },
  2: { front: 2, back: 5, right: 3, left: 4, top: 1, bottom: 6 },
  3: { front: 3, back: 4, right: 2, left: 5, top: 1, bottom: 6 },
  4: { front: 4, back: 3, right: 5, left: 2, top: 1, bottom: 6 },
  5: { front: 5, back: 2, right: 4, left: 3, top: 1, bottom: 6 },
  6: { front: 6, back: 1, right: 4, left: 3, top: 2, bottom: 5 }
};

const DIE_FACE_NAMES = Object.freeze([
  "front",
  "back",
  "right",
  "left",
  "top",
  "bottom"
] as const);

type SignalDieStyle = CSSProperties & {
  "--signal-die-delay": string;
  "--signal-die-flight-x": string;
  "--signal-die-settle-x": string;
  "--signal-die-texture": string;
};

function dieFaceValues(value: number): Readonly<Record<DieFaceName, number>> {
  return DIE_FACE_VALUES[value] ?? {
    front: value,
    back: value,
    right: value,
    left: value,
    top: value,
    bottom: value
  };
}

function SignalDieCube({
  value,
  index,
  count
}: {
  value: number;
  index: number;
  count: number;
}): ReactElement {
  const faces = dieFaceValues(value);
  const centeredIndex = index - ((count - 1) / 2);
  const style: SignalDieStyle = {
    "--signal-die-delay": `${index * 110}ms`,
    "--signal-die-flight-x": `${centeredIndex * 34}vw`,
    "--signal-die-settle-x": `${centeredIndex * -2.72}vw`,
    "--signal-die-texture": `url("${getSignalTheatreDieFacePath()}")`
  };

  return (
    <div
      className="signal-sector-resolution__die-flight"
      data-die-value={value}
      style={style}
      aria-hidden="true"
    >
      <div className="signal-sector-resolution__die-cube">
        {DIE_FACE_NAMES.map((faceName) => (
          <span
            className={`signal-sector-resolution__die-face signal-sector-resolution__die-face--${faceName}`}
            key={faceName}
          >
            <b>{faces[faceName]}</b>
          </span>
        ))}
      </div>
      <i className="signal-sector-resolution__die-shadow" />
    </div>
  );
}

function diceEquation(
  rawDice: readonly number[],
  diceTotal: number | null,
  finalTotal: number | null,
  statLabel: string
): string {
  const diceCopy = rawDice.join(" + ");
  if (diceTotal === null || finalTotal === null) return diceCopy;
  const nonDiceTotal = finalTotal - diceTotal;
  if (nonDiceTotal === 0) return diceCopy;
  const operator = nonDiceTotal > 0 ? "+" : "−";
  return `${diceCopy} ${operator} ${statLabel} ${Math.abs(nonDiceTotal)}`;
}

function AuthoritativeDiceCinema({
  model
}: {
  model: SignalSectorResolutionModel;
}): ReactElement {
  const rawDice = model.operative.rawDice;
  const finalTotal = model.operative.finalTotal;
  const totalDelay = 1_880 + Math.max(0, rawDice.length - 1) * 110;
  const style = {
    "--signal-dice-total-delay": `${totalDelay}ms`
  } as CSSProperties;

  return (
    <div
      className="signal-sector-resolution__dice-cinema"
      key={`${model.id}:${rawDice.join("-")}`}
      role="img"
      aria-label={`Authoritative roll ${rawDice.join(" and ")}. ${model.statLabel} total ${totalText(finalTotal)}.`}
      style={style}
    >
      <span className="signal-sector-resolution__dice-kicker">Authoritative roll</span>
      <div
        className="signal-sector-resolution__dice-rig"
        data-dice-count={rawDice.length}
        aria-hidden="true"
      >
        {rawDice.map((value, index) => (
          <SignalDieCube
            key={`${index}:${value}`}
            value={value}
            index={index}
            count={rawDice.length}
          />
        ))}
      </div>
      <div className="signal-sector-resolution__dice-equation">
        <span>{diceEquation(rawDice, model.operative.diceTotal, finalTotal, model.statLabel)}</span>
        <strong>{totalText(finalTotal)}</strong>
        <small>Final operative total</small>
      </div>
    </div>
  );
}

interface SignalSectorResolutionProps {
  model: SignalSectorResolutionModel;
  onSettled?: () => void;
}

export function SignalSectorResolution(props: SignalSectorResolutionProps): ReactElement {
  return <SignalSectorResolutionSequence key={props.model.id} {...props} />;
}

function SignalSectorResolutionSequence({
  model,
  onSettled
}: SignalSectorResolutionProps): ReactElement {
  const [previouslySeen] = useState(() => wasResolutionSeen(model.id));
  const restored = model.restored || previouslySeen;
  const reducedMotion = useReducedMotion();
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const operativeArt = model.operativeImageKey
    ? getCharacterPortraitPathOrNull(model.operativeImageKey)
    : null;
  const oppositionArt = oppositionArtPath(model);
  const resultVisible = model.outcomeLabel !== "RESOLVING";
  const hasDiceResult = model.operative.rawDice.length > 0
    && model.operative.finalTotal !== null;
  const showDiceCinema = !restored && !reducedMotion && hasDiceResult;
  const rollSignature = model.operative.rawDice.join(",");
  const impactClock = useRef<{ roll: string; startedAt: number; elapsedAtResult: number | null } | null>(null);
  if (!showDiceCinema) impactClock.current = null;
  else if (impactClock.current?.roll !== rollSignature) {
    impactClock.current = { roll: rollSignature, startedAt: Date.now(), elapsedAtResult: null };
  }
  if (showDiceCinema && resultVisible && impactClock.current?.elapsedAtResult === null) {
    impactClock.current.elapsedAtResult = Date.now() - impactClock.current.startedAt;
  }
  const impactElapsed = impactClock.current?.elapsedAtResult ?? 0;
  const showImpact = model.mode === "battle" && resultVisible && showDiceCinema
    && impactElapsed < sectorResolutionPresentationTimings.completeMs;
  const resolutionRole = model.mode === "battle"
    ? "Battle"
    : model.mode === "tile-challenge"
      ? "Tile challenge"
      : "Sector challenge";
  const oppositionRole = model.mode === "battle"
    ? "Opposition"
    : model.opposition.secondaryName ?? "Challenge";
  const resultCrest = model.outcomeLabel === "SUCCESS"
    ? getSignalTheatreResultCrestPath("success")
    : model.outcomeLabel === "FAILURE"
      ? getSignalTheatreResultCrestPath("defeat")
      : null;

  useEffect(() => {
    if (!hasDiceResult) return undefined;
    const handle = window.setTimeout(() => {
      window.sessionStorage.setItem(`ashenreach:signal-resolution-seen:${model.id}`, "1");
      onSettledRef.current?.();
    }, restored || reducedMotion ? 0 : sectorResolutionPresentationTimings.completeMs);
    return () => window.clearTimeout(handle);
  }, [hasDiceResult, model.id, reducedMotion, restored, rollSignature]);

  return (
    <section
      className={`signal-sector-resolution signal-sector-resolution--${model.mode} signal-sector-resolution--${model.tone}${showDiceCinema ? " has-dice-cinema" : ""}${restored ? " is-restored" : ""}`}
      aria-label={`${resolutionRole}: ${model.title}`}
      data-testid="signal-sector-resolution"
      data-resolution-mode={model.mode}
      data-resolution-stage={model.stage}
      data-resolution-restored={restored ? "true" : "false"}
      data-dice-cinema={showDiceCinema ? "playing" : "settled"}
      data-combat-impact={showImpact ? model.outcomeLabel.toLowerCase() : "none"}
      style={{ ...getChallengeThemeStyle(model.stat),
        "--combat-impact-delay": `${Math.max(0, 2820 - impactElapsed)}ms`,
        "--combat-advance-delay": `${Math.max(0, 2480 - impactElapsed)}ms` } as CSSProperties}
    >
      <div className="signal-sector-resolution__cinema-veil" aria-hidden="true" />

      <header className="signal-sector-resolution__heading">
        <span>{model.eyebrow}</span>
        <h2>{model.title}</h2>
        <p>{model.publicSummary}</p>
        <small>{model.locationName} · {model.actorDisplayName}</small>
      </header>

      <section className="signal-sector-resolution__duel" aria-label="Authoritative total comparison">
        {showImpact ? (
          <div className="signal-sector-resolution__impact" aria-hidden="true">
            <i className="signal-sector-resolution__impact-ring" />
            <i className="signal-sector-resolution__impact-sparks" />
          </div>
        ) : null}
        <article className="signal-sector-resolution__portrait signal-sector-resolution__portrait--operative">
          <ArtworkFrame
            src={operativeArt}
            alt={`${model.operative.name} portrait`}
            fit="contain"
            aspectRatio="portrait"
            focalPoint="center top"
            fallback="operative"
            priority
            className="signal-sector-resolution__portrait-frame"
          />
          <div className="signal-sector-resolution__portrait-shade" aria-hidden="true" />
          <div className="signal-sector-resolution__identity">
            <span>Operative</span>
            <strong>{model.operative.name}</strong>
            <small>{model.actorDisplayName}</small>
          </div>
          <div
            className="signal-sector-resolution__total"
            aria-label={`${model.operative.name} authoritative total ${totalText(model.operative.finalTotal)}`}
          >
            <span>Total</span>
            <strong>{totalText(model.operative.finalTotal)}</strong>
          </div>
        </article>

        <div className="signal-sector-resolution__fracture" aria-hidden="true">
          <div className="signal-sector-resolution__trial-seal">
            <img src={getSignalTheatreStatSealPath(model.stat)} width={512} height={512} alt="" />
            <span>{model.statLabel}</span>
          </div>
          <strong>{model.mode === "battle" ? "VS" : "AGAINST"}</strong>
          <i />
        </div>

        <article className="signal-sector-resolution__portrait signal-sector-resolution__portrait--opposition">
          <ArtworkFrame
            src={oppositionArt}
            alt={`${model.opposition.name} ${model.mode === "battle" ? "portrait" : "challenge artwork"}`}
            fit="contain"
            aspectRatio="portrait"
            focalPoint="center top"
            fallback={model.mode === "battle" ? "enemy" : "encounter"}
            priority
            className="signal-sector-resolution__portrait-frame"
          />
          <div className="signal-sector-resolution__portrait-shade" aria-hidden="true" />
          <div className="signal-sector-resolution__identity">
            <span>{oppositionRole}</span>
            <strong>{model.opposition.name}</strong>
            <small>{model.mode === "battle" ? "Hostile contact" : "The sector answers"}</small>
          </div>
          <div
            className="signal-sector-resolution__total"
            aria-label={`${model.opposition.name} authoritative total ${totalText(model.opposition.finalTotal)}`}
          >
            <span>Total</span>
            <strong>{totalText(model.opposition.finalTotal)}</strong>
          </div>
        </article>
      </section>

      {showDiceCinema ? <AuthoritativeDiceCinema model={model} /> : null}

      <footer
        className={`signal-sector-resolution__outcome signal-sector-resolution__outcome--crest${resultVisible ? " is-visible" : ""}${resultCrest ? " has-result-crest" : ""}`}
        role="status"
        aria-live="polite"
        data-result-visual="crest"
      >
        {resultCrest ? <img className={`signal-sector-resolution__result-crest signal-sector-resolution__result-crest--${model.outcomeLabel.toLowerCase()}`} src={resultCrest} width={640} height={640} alt="" aria-hidden="true" /> : null}
        <div className="signal-sector-resolution__outcome-copy">
          <span>{resultVisible ? "Authoritative result" : "Resolution in progress"}</span>
        <strong>{model.outcomeLabel}</strong>
        <p>{model.outcomeCopy}</p>
        {model.publicReward && model.publicReward !== model.outcomeCopy
          ? <small>Reward · {model.publicReward}</small>
          : null}
        {!model.publicReward && model.publicConsequence && model.publicConsequence !== model.outcomeCopy
          ? <small>Consequence · {model.publicConsequence}</small>
          : null}
          {!resultVisible && model.waitingCopy ? <small>{model.waitingCopy}</small> : null}
        </div>
      </footer>
    </section>
  );
}
