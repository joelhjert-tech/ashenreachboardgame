import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { cardRevealPresentationTimings as timings } from "../shared/motionTokens.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  getCardArtPath,
  getNemesisPortraitPath,
  getSignalTheatreCardRevealPaths
} from "../shared/assetPaths.js";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import type { CardRevealPresentation } from "../shared/types.js";
import type { SignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";
import "./SignalCardReveal.css";

export type SignalCardRevealStage = "sealed" | "eject" | "turn" | "identify" | "ready";

export interface SignalCardRevealModel {
  id: string;
  title: string;
  category: "Enemy" | "Hazard" | "Anomaly" | "Challenge" | "Artifact" | "Escalation" | "Equipment" | "Follower";
  revealKind: "draw" | "reward";
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
    revealKind: "draw",
    sourceLabel: model.mode === "tile-challenge"
      ? "Recurring sector challenge"
      : model.mode === "battle"
        ? "Threat deck"
        : "Sector challenge",
    locationName: model.locationName,
    actorDisplayName: model.actorDisplayName,
    publicSummary: model.publicSummary,
    stat: model.stat,
    statLabel: model.statLabel,
    artPath: artPathFor(model),
    restored: model.restored
  };
}

export function buildSignalPublicCardRevealModel(
  reveal: CardRevealPresentation,
  locationName: string,
  restored = false
): SignalCardRevealModel {
  const category = `${reveal.category[0]!.toUpperCase()}${reveal.category.slice(1)}` as SignalCardRevealModel["category"];
  return {
    id: reveal.id,
    title: reveal.title,
    category,
    revealKind: reveal.kind,
    sourceLabel: reveal.sourceLabel,
    locationName,
    actorDisplayName: reveal.actorDisplayName,
    publicSummary: reveal.summary,
    stat: "signal",
    statLabel: reveal.kind === "reward" ? "Acquired" : "Revealed",
    artPath: reveal.artType && reveal.artCardId ? getCardArtPath(reveal.artType, reveal.artCardId) : null,
    restored
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

interface SignalCardRevealProps {
  model: SignalCardRevealModel;
  environmentPath?: string | null;
  forcedStage?: SignalCardRevealStage | null;
  onReady?: () => void;
}

export function SignalCardReveal(props: SignalCardRevealProps): ReactElement {
  return <SignalCardRevealSequence key={props.model.id} {...props} />;
}

function SignalCardRevealSequence({
  model,
  environmentPath,
  forcedStage = null,
  onReady
}: SignalCardRevealProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const [previouslySeen] = useState(() => wasSeen(model.id));
  const restoreImmediately = model.restored || previouslySeen || reducedMotion;
  const onReadyRef = useRef(onReady);
  const notified = useRef(false);
  onReadyRef.current = onReady;
  const [stage, setStage] = useState<SignalCardRevealStage>(
    forcedStage ?? (restoreImmediately ? "ready" : "sealed")
  );

  useEffect(() => {
    if (forcedStage) {
      setStage(forcedStage);
      return undefined;
    }
    const complete = () => {
      markSeen(model.id);
      if (!notified.current) {
        notified.current = true;
        onReadyRef.current?.();
      }
    };
    if (restoreImmediately) {
      setStage("ready");
      complete();
      return undefined;
    }

    setStage("sealed");
    const timers = [
      window.setTimeout(() => setStage("eject"), timings.ejectMs),
      window.setTimeout(() => setStage("turn"), timings.turnMs),
      window.setTimeout(() => setStage("identify"), timings.identifyMs),
      window.setTimeout(() => setStage("ready"), timings.readyMs),
      window.setTimeout(complete, timings.completeMs)
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [forcedStage, model.id, restoreImmediately]);

  const actionVerb = model.category === "Enemy" ? "roll" : "test";
  const isReward = model.revealKind === "reward";
  const themeStyle = getChallengeThemeStyle(model.stat) as CSSProperties;

  return (
    <section
      className="signal-card-reveal"
      data-testid="signal-card-reveal"
      data-stage={stage}
      data-motion={restoreImmediately ? "settled" : "live"}
      data-card-category={model.category.toLowerCase()}
      data-environment={environmentPath ? "sector" : "chamber"}
      style={themeStyle}
      aria-labelledby="signal-card-reveal-title"
    >
      {environmentPath ? <img className="signal-card-reveal__environment" src={environmentPath} alt="" aria-hidden="true" /> : null}
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
      <div className="signal-card-reveal__light" aria-hidden="true" />
      <div className="signal-card-reveal__scan" aria-hidden="true" />

      <header className="signal-card-reveal__header">
        <div>
          <span>Current sector</span>
          <strong>{model.locationName}</strong>
        </div>
        <div className="signal-card-reveal__heading">
          <span>{isReward ? "Acquisition" : "Incoming encounter"}</span>
          <h1>{isReward ? "Reward secured" : "The deck answers"}</h1>
        </div>
        <div className="signal-card-reveal__queue">
          <span>{isReward ? "Inventory relay" : "Arrival queue"}</span>
          <strong>{isReward ? "Reward revealed" : "Card revealed"}</strong>
        </div>
      </header>

      <div className="signal-card-reveal__theatre">
        <aside className="signal-card-reveal__classification signal-card-reveal__classification--left">
          <span>{isReward ? "Awarded by" : "Drawn from"}</span>
          <strong>{model.sourceLabel}</strong>
          <small>{isReward ? "Spoils of the Reach" : "The Reach reveals its hand"}</small>
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
                {!restoreImmediately && (stage === "identify" || stage === "ready") ? (
                  <div className="signal-card-reveal__atmosphere" aria-hidden="true">
                    <i className="signal-card-reveal__haze" />
                    <i className="signal-card-reveal__embers" />
                    <i className="signal-card-reveal__aura" />
                  </div>
                ) : null}
                <div className="signal-card-reveal__front-vignette" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="signal-card-reveal__card-shadow" aria-hidden="true" />
        </article>

        <aside className="signal-card-reveal__classification signal-card-reveal__classification--right">
          <span>Card type</span>
          <strong>{model.category}</strong>
          <small>{isReward ? "Added to your inventory" : "Resolve before continuing"}</small>
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
          <strong>{isReward ? `${model.actorDisplayName} receives ${model.title}` : `${model.actorDisplayName} must ${actionVerb} ${model.statLabel}`}</strong>
          <small>{isReward ? "The card is now available in the operative inventory." : "Make your move. The dice decide what follows."}</small>
        </div>
        <div className="signal-card-reveal__phone">
          <span>{isReward ? "Owner inventory" : "Private control"}</span>
          <strong>{isReward ? "Review on player phone" : `${actionVerb === "roll" ? "Roll" : "Test"} on player phone`}</strong>
        </div>
      </footer>
    </section>
  );
}
