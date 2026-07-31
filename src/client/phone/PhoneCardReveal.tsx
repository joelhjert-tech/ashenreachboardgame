import { useEffect, useState, type ReactElement } from "react";
import { CardArtImage } from "../shared/CardArtImage.js";
import type { CardRevealPresentation } from "../shared/types.js";
import "./PhoneCardReveal.css";

type RevealStage = "sealed" | "turning" | "ready";

const seenPrefix = "ashenreach:phone-card-reveal-seen:";

function wasSeen(id: string): boolean {
  return typeof window !== "undefined" && window.sessionStorage.getItem(`${seenPrefix}${id}`) === "1";
}

function markSeen(id: string): void {
  if (typeof window !== "undefined") window.sessionStorage.setItem(`${seenPrefix}${id}`, "1");
}

export function PhoneCardReveal({ reveal }: { reveal: CardRevealPresentation | null | undefined }): ReactElement | null {
  const [dismissed, setDismissed] = useState(() => !reveal || wasSeen(reveal.id));
  const [stage, setStage] = useState<RevealStage>(() => reveal && !wasSeen(reveal.id) ? "sealed" : "ready");

  useEffect(() => {
    if (!reveal || wasSeen(reveal.id)) {
      setDismissed(true);
      setStage("ready");
      return undefined;
    }
    setDismissed(false);
    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      markSeen(reveal.id);
      setStage("ready");
      return undefined;
    }
    setStage("sealed");
    const turn = window.setTimeout(() => setStage("turning"), 260);
    const ready = window.setTimeout(() => {
      markSeen(reveal.id);
      setStage("ready");
    }, 980);
    return () => {
      window.clearTimeout(turn);
      window.clearTimeout(ready);
    };
  }, [reveal?.id]);

  if (!reveal || dismissed || reveal.visibility !== "owner") return null;
  const categoryLabel = reveal.category === "equipment" ? "Equipment" : `${reveal.category[0]!.toUpperCase()}${reveal.category.slice(1)}`;

  return (
    <section
      className={`phone-card-reveal phone-card-reveal--${reveal.category}`}
      data-testid="phone-private-card-reveal"
      data-reveal-category={reveal.category}
      data-reveal-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-card-reveal-title"
    >
      <div className="phone-card-reveal__scrim" aria-hidden="true" />
      <div className="phone-card-reveal__panel">
        <header>
          <span>{reveal.kind === "reward" ? "Reward acquired" : "Private reveal"}</span>
          <strong>{reveal.sourceLabel}</strong>
        </header>

        <div className="phone-card-reveal__stage">
          <div className="phone-card-reveal__card">
            <div className="phone-card-reveal__card-inner">
              <div className="phone-card-reveal__face phone-card-reveal__face--back" aria-hidden="true">
                <i /><b>AR</b><i />
              </div>
              <div className="phone-card-reveal__face phone-card-reveal__face--front">
                {reveal.artType ? (
                  <CardArtImage cardType={reveal.artType} cardId={reveal.artCardId} quality="full" alt="" />
                ) : (
                  <div className="phone-card-reveal__affliction-art" aria-hidden="true">
                    <i /><i /><i />
                    <strong>{reveal.die ?? "!"}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
          {typeof reveal.die === "number" ? (
            <div className="phone-card-reveal__die" data-die-value={reveal.die} aria-label={`Authoritative die ${reveal.die}`}>
              {reveal.die}
            </div>
          ) : null}
        </div>

        <div className="phone-card-reveal__copy">
          <span>{categoryLabel}</span>
          <h2 id="phone-card-reveal-title">{reveal.title}</h2>
          <p>{reveal.summary}</p>
          {reveal.detail ? <small>{reveal.detail}</small> : null}
        </div>

        <button
          type="button"
          disabled={stage !== "ready"}
          onClick={() => {
            markSeen(reveal.id);
            setDismissed(true);
          }}
        >
          {stage === "ready" ? "Continue" : "Revealing…"}
        </button>
      </div>
    </section>
  );
}
