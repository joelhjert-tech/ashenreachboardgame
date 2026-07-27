import { useEffect, useState, type ReactElement } from "react";
import {
  getCardArtPath,
  getCharacterPortraitPath,
  getEncounterBattleCardBackPath,
  getOperativeBattleCardBackPath,
  getSignalTheatreStatSealPath
} from "../shared/assetPaths.js";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import "./TvBattleRevealPrototype.css";

export type TvBattleRevealStage = "card" | "identity" | "ready";

export function TvBattleRevealPrototype({
  forcedStage = null
}: {
  forcedStage?: TvBattleRevealStage | null;
}): ReactElement {
  const [stage, setStage] = useState<TvBattleRevealStage>(forcedStage ?? "card");

  useEffect(() => {
    if (forcedStage) {
      setStage(forcedStage);
      return undefined;
    }
    const identityTimer = window.setTimeout(() => setStage("identity"), 1100);
    const readyTimer = window.setTimeout(() => setStage("ready"), 2300);
    return () => {
      window.clearTimeout(identityTimer);
      window.clearTimeout(readyTimer);
    };
  }, [forcedStage]);

  return (
    <main
      className={`tv-battle-reveal-prototype is-${stage}`}
      data-testid="tv-battle-reveal-prototype"
      data-stage={stage}
      aria-label="Enemy battle reveal prototype"
    >
      <div className="tv-battle-reveal-prototype__veil" aria-hidden="true" />
      <header>
        <span>Hostile contact</span>
        <h1>The sector answers</h1>
        <small>Server-confirmed enemy reveal</small>
      </header>

      <section className="tv-battle-reveal-prototype__stage">
        <article className="tv-battle-reveal-prototype__card tv-battle-reveal-prototype__card--operative">
          <div className="tv-battle-reveal-prototype__card-inner">
            <ArtworkFrame
              src={getOperativeBattleCardBackPath()}
              alt=""
              fit="contain"
              aspectRatio="card"
              fallback="card"
              className="tv-battle-reveal-prototype__card-back"
              aria-hidden="true"
            />
            <ArtworkFrame
              src={getCharacterPortraitPath("char_veyra_sable")}
              alt="Sable Vey operative portrait"
              fit="contain"
              aspectRatio="card"
              fallback="operative"
              priority
              className="tv-battle-reveal-prototype__card-front"
            />
          </div>
          <div className="tv-battle-reveal-prototype__identity">
            <span>Operative</span>
            <strong>Sable Vey</strong>
            <small>Joel</small>
          </div>
        </article>

        <div className="tv-battle-reveal-prototype__seal" aria-label="Grit battle">
          <img src={getSignalTheatreStatSealPath("grit")} alt="" width={512} height={512} />
          <span>Battle uses</span>
          <strong>GRIT</strong>
          <small>Roll on player phone</small>
        </div>

        <article className="tv-battle-reveal-prototype__card tv-battle-reveal-prototype__card--enemy">
          <div className="tv-battle-reveal-prototype__card-inner">
            <ArtworkFrame
              src={getEncounterBattleCardBackPath("threat", "latchspire-raider")}
              alt=""
              fit="contain"
              aspectRatio="card"
              fallback="card"
              className="tv-battle-reveal-prototype__card-back"
              aria-hidden="true"
            />
            <ArtworkFrame
              src={getCardArtPath("threat", "latchspire-raider")}
              alt="Latchspire Raider enemy artwork"
              fit="contain"
              aspectRatio="card"
              fallback="enemy"
              priority
              className="tv-battle-reveal-prototype__card-front"
            />
          </div>
          <div className="tv-battle-reveal-prototype__identity">
            <span>Enemy · Yellow Threat</span>
            <strong>Latchspire Raider</strong>
            <small>Hostile contact</small>
          </div>
        </article>
      </section>

      <footer>
        <span>Reveal</span>
        <i aria-hidden="true" />
        <span>Identify enemy</span>
        <i aria-hidden="true" />
        <strong>Roll Grit</strong>
      </footer>
    </main>
  );
}
