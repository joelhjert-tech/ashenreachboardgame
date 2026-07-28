import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getCardArtPath,
  getNemesisPortraitPath,
  getSignalTheatreCardRevealPaths
} from "../shared/assetPaths.js";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import type { SignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";
import "./SignalCardReveal.css";

export type SignalCardRevealStage = "sealed" | "eject" | "turn" | "identify" | "ready";

export interface SignalCardRevealModel {
  id: string;
  title: string;
  category: "Enemy" | "Hazard" | "Anomaly" | "Challenge";
  sourceLabel: string;
  locationName: string;
  actorDisplayName: string;
  publicSummary: string;
  stat: SignalSectorResolutionModel["stat"];
  statLabel: string;
  artPath: string | null;
  restored: boolean;
}

const revealAssets = getSignalTheatreCardRevealPaths();
const seenPrefix = "ashenreach:signal-card-reveal-seen:";

export function isSignalCardRevealStage(
  model: SignalSectorResolutionModel | null
): model is SignalSectorResolutionModel {
  return Boolean(model && (model.stage === "encounter_intro" || model.stage === "battle_ready"));
}

function categoryFor(model: SignalSectorResolutionModel): SignalCardRevealModel["category"] {
  if (model.mode === "battle") return "Enemy";
  const label = model.opposition.secondaryName?.toLowerCase() ?? "";
  if (label.includes("hazard")) return "Hazard";
  if (label.includes("anomaly")) return "Anomaly";
  return "Challenge";
}

function artPathFor(model: SignalSectorResolutionModel): string | null {
  const key = model.oppositionImageKey;
  if (!key) return null;
  if (key.startsWith("/")) return key;
  if (model.oppositionArtKind === "nemesis" || key.startsWith("nemesis_")) {
    return getNemesisPortraitPath(key);
  }
  return getCardArtPath("threat", key);
}

export function buildSignalCardRevealModel(
  model: SignalSectorResolutionModel
): SignalCardRevealModel {
  const category = categoryFor(model);
  return {
    id: model.id,
    title: model.title,
    category,
    sourceLabel: model.mode === "tile-challenge"
      ? "Recurring sector challenge"
      : model.mode === "battle"
        ? "Authoritative Threat draw"
        : "Authoritative sector test",
    locationName: model.locationName,
    actorDisplayName: model.actorDisplayName,
    publicSummary: model.publicSummary,
    stat: model.stat,
    statLabel: model.statLabel,
    artPath: artPathFor(model),
    restored: model.restored
  };
}

function wasSeen(id: string): boolean {
  return typeof window !== "undefined"
    && window.sessionStorage.getItem(`${seenPrefix}${id}`) === "1";
}

function markSeen(id: string): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(`${seenPrefix}${id}`, "1");
  }
}

export function SignalCardReveal({
  model,
  forcedStage = null
}: {
  model: SignalCardRevealModel;
  forcedStage?: SignalCardRevealStage | null;
}): ReactElement {
  const restoreImmediately = model.restored || wasSeen(model.id);
  const [stage, setStage] = useState<SignalCardRevealStage>(
    forcedStage ?? (restoreImmediately ? "ready" : "sealed")
  );

  useEffect(() => {
    if (forcedStage) {
      setStage(forcedStage);
      return undefined;
    }
    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (model.restored || wasSeen(model.id) || reducedMotion) {
      markSeen(model.id);
      setStage("ready");
      return undefined;
    }

    setStage("sealed");
    const timers = [
      window.setTimeout(() => setStage("eject"), 280),
      window.setTimeout(() => setStage("turn"), 1320),
      window.setTimeout(() => setStage("identify"), 2420),
      window.setTimeout(() => {
        markSeen(model.id);
        setStage("ready");
      }, 3260)
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [forcedStage, model.id, model.restored]);

  const actionVerb = model.category === "Enemy" ? "roll" : "test";
  const themeStyle = getChallengeThemeStyle(model.stat) as CSSProperties;

  return (
    <section
      className="signal-card-reveal"
      data-testid="signal-card-reveal"
      data-stage={stage}
      data-card-category={model.category.toLowerCase()}
      style={themeStyle}
      aria-labelledby="signal-card-reveal-title"
    >
      <img
        className="signal-card-reveal__chamber"
        src={revealAssets.chamber}
        width={1600}
        height={900}
        alt=""
        decoding="async"
        aria-hidden="true"
      />
      <div className="signal-card-reveal__shade" aria-hidden="true" />
      <div className="signal-card-reveal__scan" aria-hidden="true" />

      <header className="signal-card-reveal__header">
        <div>
          <span>Current sector</span>
          <strong>{model.locationName}</strong>
        </div>
        <div className="signal-card-reveal__heading">
          <span>Authoritative encounter</span>
          <h1>The deck answers</h1>
        </div>
        <div className="signal-card-reveal__queue">
          <span>Arrival queue</span>
          <strong>Card revealed</strong>
        </div>
      </header>

      <div className="signal-card-reveal__theatre">
        <aside className="signal-card-reveal__classification signal-card-reveal__classification--left">
          <span>Drawn from</span>
          <strong>{model.sourceLabel}</strong>
          <small>Server-confirmed</small>
        </aside>

        <div className="signal-card-reveal__aperture" aria-hidden="true">
          <i /><i /><i />
        </div>

        <article className="signal-card-reveal__card" aria-label={`Revealed ${model.category}: ${model.title}`}>
          <div className="signal-card-reveal__carrier">
            <div className="signal-card-reveal__card-inner">
              <div className="signal-card-reveal__face signal-card-reveal__face--back">
                <img src={revealAssets.cardBack} width={720} height={1080} alt="" aria-hidden="true" />
                <div className="signal-card-reveal__back-signal" aria-hidden="true" />
              </div>
              <div className="signal-card-reveal__face signal-card-reveal__face--front">
                <ArtworkFrame
                  src={model.artPath}
                  alt={`${model.title} artwork`}
                  fit="contain"
                  aspectRatio="card"
                  fallback={model.category === "Enemy" ? "enemy" : "card"}
                  priority
                />
                <div className="signal-card-reveal__front-vignette" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="signal-card-reveal__card-shadow" aria-hidden="true" />
        </article>

        <aside className="signal-card-reveal__classification signal-card-reveal__classification--right">
          <span>Card type</span>
          <strong>{model.category}</strong>
          <small>Resolve once before continuing</small>
        </aside>

        <div className="signal-card-reveal__identity">
          <span>{model.category} · {model.statLabel}</span>
          <h2 id="signal-card-reveal-title">{model.title}</h2>
          <p>{model.publicSummary}</p>
        </div>
      </div>

      <footer className="signal-card-reveal__command">
        <div className="signal-card-reveal__stat-seal" aria-hidden="true">
          <i />
          <span>{model.statLabel}</span>
        </div>
        <div className="signal-card-reveal__command-copy">
          <span>What happens now</span>
          <strong>{model.actorDisplayName} must {actionVerb} {model.statLabel}</strong>
          <small>The authoritative result and consequences appear only after the roll.</small>
        </div>
        <div className="signal-card-reveal__phone">
          <span>Private control</span>
          <strong>{actionVerb === "roll" ? "Roll" : "Test"} on player phone</strong>
        </div>
      </footer>
    </section>
  );
}
