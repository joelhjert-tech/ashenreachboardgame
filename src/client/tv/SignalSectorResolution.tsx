import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getCardArtPath,
  getCharacterPortraitPathOrNull,
  getNemesisPortraitPath,
  getSignalTheatreResultCrestPath
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

export function SignalSectorResolution({
  model
}: {
  model: SignalSectorResolutionModel;
}): ReactElement {
  const [restored, setRestored] = useState(() => model.restored || wasResolutionSeen(model.id));
  const operativeArt = model.operativeImageKey
    ? getCharacterPortraitPathOrNull(model.operativeImageKey)
    : null;
  const oppositionArt = oppositionArtPath(model);
  const resultVisible = model.outcomeLabel !== "RESOLVING";
  const oppositionRole = model.mode === "battle" ? "Opposition" : "Challenge";
  const resultCrest = model.outcomeLabel === "SUCCESS"
    ? getSignalTheatreResultCrestPath("success")
    : model.outcomeLabel === "FAILURE"
      ? getSignalTheatreResultCrestPath("defeat")
      : null;

  useEffect(() => {
    const alreadySeen = model.restored || wasResolutionSeen(model.id);
    setRestored(alreadySeen);
    if (typeof window === "undefined") return undefined;
    if (model.restored) {
      window.sessionStorage.setItem(`ashenreach:signal-resolution-seen:${model.id}`, "1");
      return undefined;
    }
    const seenHandle = window.setTimeout(() => {
      window.sessionStorage.setItem(`ashenreach:signal-resolution-seen:${model.id}`, "1");
    }, 900);
    return () => window.clearTimeout(seenHandle);
  }, [model.id, model.restored]);

  return (
    <section
      className={`signal-sector-resolution signal-sector-resolution--${model.mode} signal-sector-resolution--${model.tone}${restored ? " is-restored" : ""}`}
      aria-label={`${model.mode === "battle" ? "Battle" : "Tile challenge"}: ${model.title}`}
      data-testid="signal-sector-resolution"
      data-resolution-mode={model.mode}
      data-resolution-stage={model.stage}
      data-resolution-restored={restored ? "true" : "false"}
      style={getChallengeThemeStyle(model.stat) as CSSProperties}
    >
      <div className="signal-sector-resolution__cinema-veil" aria-hidden="true" />

      <header className="signal-sector-resolution__heading">
        <span>{model.eyebrow}</span>
        <h2>{model.title}</h2>
        <p>{model.publicSummary}</p>
      </header>

      <section className="signal-sector-resolution__duel" aria-label="Authoritative total comparison">
        <article className="signal-sector-resolution__portrait signal-sector-resolution__portrait--operative">
          <ArtworkFrame
            src={operativeArt}
            alt={`${model.operative.name} portrait`}
            fit="cover"
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
          <span>{model.statLabel}</span>
          <strong>{model.mode === "battle" ? "VS" : "AGAINST"}</strong>
          <i />
        </div>

        <article className="signal-sector-resolution__portrait signal-sector-resolution__portrait--opposition">
          <ArtworkFrame
            src={oppositionArt}
            alt={`${model.opposition.name} ${model.mode === "battle" ? "portrait" : "challenge artwork"}`}
            fit="cover"
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
