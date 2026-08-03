import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { TROPHY_RESERVE_CARD_ID } from "../../game/rules/trophySpend.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import {
  getSignalTheatreStatSealPath,
  getSignalTheatreTrophyUpgradePaths
} from "../shared/assetPaths.js";
import { trophyUpgradePresentationTimings } from "../shared/motionTokens.js";
import type { TrophyUpgradePresentation } from "../shared/types.js";
import "./SignalTrophyUpgrade.css";

export type SignalTrophyUpgradeStage =
  | "summon"
  | "trophy-display"
  | "trophy-burn"
  | "flip"
  | "minimize"
  | "settled";

const assets = getSignalTheatreTrophyUpgradePaths();
const seenPrefix = "ashenreach:trophy-upgrade-seen:";

function wasSeen(id: string): boolean {
  return typeof window !== "undefined"
    && window.sessionStorage.getItem(`${seenPrefix}${id}`) === "1";
}

function markSeen(id: string): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(`${seenPrefix}${id}`, "1");
  }
}

export function shouldPresentTrophyUpgrade({
  presentation,
  previousPresentationId,
  synchronized
}: {
  presentation: TrophyUpgradePresentation | null | undefined;
  previousPresentationId: string | null | undefined;
  synchronized: boolean;
}): boolean {
  return Boolean(
    synchronized
    && presentation
    && previousPresentationId !== undefined
    && previousPresentationId !== presentation.id
    && !wasSeen(presentation.id)
  );
}

export function useSignalTrophyUpgradeCeremony({
  presentation,
  previousPresentationId,
  synchronized
}: {
  presentation: TrophyUpgradePresentation | null | undefined;
  previousPresentationId: string | null | undefined;
  synchronized: boolean;
}): {
  activePresentation: TrophyUpgradePresentation | null;
  settle: () => void;
} {
  const [activePresentation, setActivePresentation] = useState<TrophyUpgradePresentation | null>(null);

  useEffect(() => {
    if (!presentation) {
      setActivePresentation(null);
      return;
    }
    if (!shouldPresentTrophyUpgrade({ presentation, previousPresentationId, synchronized })) return;
    markSeen(presentation.id);
    setActivePresentation(presentation);
  }, [presentation, previousPresentationId, synchronized]);

  const settle = useCallback(() => setActivePresentation(null), []);
  return { activePresentation, settle };
}

function stageLabel(stage: SignalTrophyUpgradeStage): string {
  if (stage === "summon") return "Advancement relay summoned";
  if (stage === "trophy-display") return "Trophy ledger verified";
  if (stage === "trophy-burn") return "Trophies committed";
  if (stage === "flip") return "Permanent rank raised";
  if (stage === "minimize") return "Advancement recorded";
  return "Advancement complete";
}

export function SignalTrophyUpgrade({
  presentation,
  forcedStage = null,
  onSettled
}: {
  presentation: TrophyUpgradePresentation;
  forcedStage?: SignalTrophyUpgradeStage | null;
  onSettled?: () => void;
}): ReactElement | null {
  const reducedMotion = !forcedStage
    && typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [stage, setStage] = useState<SignalTrophyUpgradeStage>(
    forcedStage ?? (reducedMotion ? "trophy-display" : "summon")
  );

  useEffect(() => {
    if (forcedStage) {
      setStage(forcedStage);
      return undefined;
    }

    if (reducedMotion) {
      setStage("trophy-display");
      const timer = window.setTimeout(() => {
        setStage("settled");
        onSettled?.();
      }, trophyUpgradePresentationTimings.reducedReceiptEndMs);
      return () => window.clearTimeout(timer);
    }

    setStage("summon");
    const timers = [
      window.setTimeout(() => setStage("trophy-display"), trophyUpgradePresentationTimings.summonEndMs),
      window.setTimeout(() => setStage("trophy-burn"), trophyUpgradePresentationTimings.trophyDisplayEndMs),
      window.setTimeout(() => setStage("flip"), trophyUpgradePresentationTimings.trophyBurnEndMs),
      window.setTimeout(() => setStage("minimize"), trophyUpgradePresentationTimings.flipEndMs),
      window.setTimeout(() => {
        setStage("settled");
        onSettled?.();
      }, trophyUpgradePresentationTimings.minimizeEndMs)
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [forcedStage, onSettled, presentation.id, reducedMotion]);

  if (stage === "settled") return null;

  const twoRows = presentation.spentTrophies.length > 5;
  const sealPath = getSignalTheatreStatSealPath(presentation.skill);
  const announcement = `${presentation.actorDisplayName} spent ${presentation.totalCost} Trophies to raise ${presentation.skillLabel} from ${presentation.previousValue} to ${presentation.newValue}.`;

  return (
    <section
      className={`signal-trophy-upgrade${reducedMotion ? " signal-trophy-upgrade--reduced" : ""}`}
      data-testid="signal-trophy-upgrade"
      data-stage={stage}
      data-card-layout={twoRows ? "two-rows" : "single-fan"}
      aria-label="Permanent skill upgrade"
    >
      <p className="signal-trophy-upgrade__announcement" aria-live="assertive">{announcement}</p>
      <div className="signal-trophy-upgrade__veil" aria-hidden="true" />
      <div className="signal-trophy-upgrade__signal-lines" aria-hidden="true" />

      <header className="signal-trophy-upgrade__header">
        <div>
          <span>Permanent advancement</span>
          <strong>{presentation.operativeName}</strong>
        </div>
        <h1>{stageLabel(stage)}</h1>
        <div>
          <span>Server-authored receipt</span>
          <strong>{presentation.totalCost} Trophies</strong>
        </div>
      </header>

      <div className="signal-trophy-upgrade__machine" aria-hidden="true">
        <div className="signal-trophy-upgrade__screen">
          <div className="signal-trophy-upgrade__seal-flip">
            <div className="signal-trophy-upgrade__seal-face signal-trophy-upgrade__seal-face--old">
              <img src={sealPath} width={420} height={420} alt="" />
              <strong>{presentation.previousValue}</strong>
            </div>
            <div className="signal-trophy-upgrade__seal-face signal-trophy-upgrade__seal-face--new">
              <img src={sealPath} width={420} height={420} alt="" />
              <strong>{presentation.newValue}</strong>
            </div>
          </div>
          <span>{presentation.skillLabel}</span>
        </div>
        <img className="signal-trophy-upgrade__crt" src={assets.crt} width={1672} height={941} alt="" />
      </div>

      <div
        className={`signal-trophy-upgrade__receipts${twoRows ? " signal-trophy-upgrade__receipts--two-rows" : ""}`}
        aria-hidden="true"
      >
        {presentation.spentTrophies.map((line, index) => {
          const partial = line.remainingValue > 0;
          const style = {
            "--receipt-index": index,
            "--receipt-count": presentation.spentTrophies.length,
            "--spent-ratio": `${Math.max(8, Math.round((line.spentValue / Math.max(1, line.originalValue)) * 100))}%`
          } as CSSProperties;
          return (
            <article
              className={`signal-trophy-upgrade__receipt${partial ? " is-partial" : ""}`}
              style={style}
              key={`${line.cardId}:${index}`}
            >
              <div className="signal-trophy-upgrade__receipt-art">
                {line.cardId === TROPHY_RESERVE_CARD_ID ? (
                  <img src={assets.reserveToken} width={320} height={320} alt="" />
                ) : (
                  <CardArtImage cardType="threat" cardId={line.cardId} quality="full" alt="" />
                )}
                <i />
              </div>
              <div className="signal-trophy-upgrade__receipt-copy">
                <strong>{line.name}</strong>
                <span>{partial ? `Spent ${line.spentValue} of ${line.originalValue}` : `${line.spentValue} committed`}</span>
                {partial ? <small>{line.remainingValue} remaining</small> : <small>Ledger closed</small>}
              </div>
              {partial ? <div className="signal-trophy-upgrade__remainder">{line.remainingValue} remaining</div> : null}
            </article>
          );
        })}
      </div>

      <div className="signal-trophy-upgrade__furnace" aria-hidden="true">
        <div className="signal-trophy-upgrade__embers">
          {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--ember": index } as CSSProperties} />)}
        </div>
        <img src={assets.furnace} width={1672} height={941} alt="" />
      </div>

      <footer className="signal-trophy-upgrade__result">
        <span>{presentation.actorDisplayName}</span>
        <strong>{presentation.skillLabel}</strong>
        <b>{presentation.previousValue}<i>→</i>{presentation.newValue}</b>
        <small>Permanent base skill recorded</small>
      </footer>
    </section>
  );
}
