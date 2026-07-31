import { useEffect, useState, type ReactElement } from "react";
import { getSignalTheatreEdgeCardPaths } from "../shared/assetPaths.js";
import type { PublicEdgeCardPlay } from "../shared/types.js";
import "./SignalEdgeCardBurst.css";

export type SignalEdgeCardBurstStage =
  | "sealed"
  | "charge"
  | "detonate"
  | "result"
  | "done";

const assets = getSignalTheatreEdgeCardPaths();
const seenPrefix = "ashenreach:edge-card-play-seen:";

function wasSeen(id: string): boolean {
  return typeof window !== "undefined" &&
    window.sessionStorage.getItem(`${seenPrefix}${id}`) === "1";
}

function markSeen(id: string): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(`${seenPrefix}${id}`, "1");
  }
}

export function SignalEdgeCardBurst({
  play,
  forcedStage = null
}: {
  play: PublicEdgeCardPlay | null;
  forcedStage?: SignalEdgeCardBurstStage | null;
}): ReactElement | null {
  const [activePlay, setActivePlay] = useState<PublicEdgeCardPlay | null>(
    play && (!wasSeen(play.id) || forcedStage) ? play : null
  );
  const [stage, setStage] = useState<SignalEdgeCardBurstStage>(forcedStage ?? "sealed");

  useEffect(() => {
    if (!play || wasSeen(play.id)) return;
    setActivePlay(play);
    setStage(forcedStage ?? "sealed");
  }, [forcedStage, play]);

  useEffect(() => {
    if (!activePlay) return undefined;
    if (forcedStage) {
      setStage(forcedStage);
      return undefined;
    }

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setStage("result");
      const timer = window.setTimeout(() => {
        markSeen(activePlay.id);
        setStage("done");
        setActivePlay(null);
      }, 1800);
      return () => window.clearTimeout(timer);
    }

    setStage("sealed");
    const timers = [
      window.setTimeout(() => setStage("charge"), 260),
      window.setTimeout(() => setStage("detonate"), 1120),
      window.setTimeout(() => setStage("result"), 1980),
      window.setTimeout(() => {
        markSeen(activePlay.id);
        setStage("done");
        setActivePlay(null);
      }, 3900)
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activePlay, forcedStage]);

  if (!activePlay || stage === "done") return null;

  return (
    <section
      className="signal-edge-burst"
      data-testid="signal-edge-card-burst"
      data-stage={stage}
      aria-live="assertive"
      aria-labelledby="signal-edge-burst-title"
    >
      <img
        className="signal-edge-burst__charge-art"
        src={assets.charge}
        width={1672}
        height={941}
        decoding="async"
        alt=""
        aria-hidden="true"
      />
      <img
        className="signal-edge-burst__detonation-art"
        src={assets.detonation}
        width={1672}
        height={941}
        decoding="async"
        alt=""
        aria-hidden="true"
      />
      <div className="signal-edge-burst__shade" aria-hidden="true" />
      <div className="signal-edge-burst__shockwave" aria-hidden="true"><i /><i /><i /></div>

      <header className="signal-edge-burst__header">
        <span>Private reserve committed</span>
        <strong>{activePlay.actorDisplayName}</strong>
      </header>

      <article className="signal-edge-burst__card">
        <div className="signal-edge-burst__card-inner">
          <div className="signal-edge-burst__card-back">
            <img src={assets.cardBack} width={720} height={1080} alt="" aria-hidden="true" />
          </div>
          <div className="signal-edge-burst__card-face">
            <span>Edge Card</span>
            <strong>{activePlay.edgeValue}</strong>
            <h1 id="signal-edge-burst-title">{activePlay.cardName}</h1>
            <p>One die locked</p>
          </div>
        </div>
      </article>

      <footer className="signal-edge-burst__result">
        <span>Signal burned</span>
        <strong>{activePlay.edgeValue}</strong>
        <div>
          <h2>{activePlay.cardName}</h2>
          <p>{activePlay.publicSummary}</p>
        </div>
      </footer>
    </section>
  );
}
