import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { OutcomeSummary } from "./types.js";

interface RollOutcomePanelProps {
  summary: OutcomeSummary;
  animate?: boolean;
  title?: string;
}

const pipLayout: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

function buildAnimationFrames(die1: number, die2: number): Array<[number, number]> {
  return [
    [((die1 + 1) % 6) + 1, ((die2 + 3) % 6) + 1],
    [((die1 + 3) % 6) + 1, ((die2 + 5) % 6) + 1],
    [((die1 + 5) % 6) + 1, ((die2 + 1) % 6) + 1],
    [die2, die1],
    [die1, die2]
  ];
}

function DieFace({ value }: { value: number }): ReactElement {
  const activePips = new Set(pipLayout[value] ?? []);

  return (
    <div className="roll-die" data-face={value}>
      <div className="roll-die-grid">
        {Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            className={`roll-die-pip ${activePips.has(index) ? "roll-die-pip-active" : ""}`}
          />
        ))}
      </div>
      <span className="roll-die-value">{value}</span>
    </div>
  );
}

function DicePair({
  label,
  faces,
  animating = false
}: {
  label: string;
  faces: [number, number];
  animating?: boolean;
}): ReactElement {
  return (
    <div className="roll-side">
      <p className="roll-side-label">{label}</p>
      <div className={`roll-dice-pair ${animating ? "roll-dice-pair-animating" : ""}`}>
        <DieFace value={faces[0]} />
        <DieFace value={faces[1]} />
      </div>
    </div>
  );
}

export function RollOutcomePanel({
  summary,
  animate = false,
  title = "Roll result"
}: RollOutcomePanelProps): ReactElement | null {
  const finalDie1 = summary.die1;
  const finalDie2 = summary.die2;
  const finalEnemyDie1 = summary.enemyDie1 ?? null;
  const finalEnemyDie2 = summary.enemyDie2 ?? null;
  const success = summary.success;
  const total = summary.checkTotal;
  const difficulty = summary.difficulty;
  const statBonus = summary.statBonus;
  const enemyBonus = summary.enemyBonus ?? null;
  const enemyTotal = summary.enemyTotal ?? null;
  const isOpposed =
    finalEnemyDie1 !== null && finalEnemyDie2 !== null && enemyBonus !== null && enemyTotal !== null;
  const [displayFaces, setDisplayFaces] = useState<[number, number]>(() => [finalDie1 ?? 1, finalDie2 ?? 1]);
  const [displayEnemyFaces, setDisplayEnemyFaces] = useState<[number, number]>(() => [
    finalEnemyDie1 ?? 1,
    finalEnemyDie2 ?? 1
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationKey = `${summary.seatId}:${summary.encounterCardId ?? "none"}:${summary.die1 ?? "x"}:${summary.die2 ?? "x"}:${summary.checkTotal ?? "x"}:${summary.success ?? "x"}:${summary.enemyDie1 ?? "x"}:${summary.enemyDie2 ?? "x"}:${summary.enemyTotal ?? "x"}`;

  useEffect(() => {
    if (finalDie1 === null || finalDie2 === null || total === null || difficulty === null || statBonus === null || success === null) {
      return;
    }

    if (isOpposed && (finalEnemyDie1 === null || finalEnemyDie2 === null || enemyBonus === null || enemyTotal === null)) {
      return;
    }

    if (!animate) {
      setDisplayFaces([finalDie1, finalDie2]);
      setDisplayEnemyFaces([finalEnemyDie1 ?? 1, finalEnemyDie2 ?? 1]);
      setIsAnimating(false);
      return;
    }

    const playerFrames = buildAnimationFrames(finalDie1, finalDie2);
    const enemyFrames = buildAnimationFrames(finalEnemyDie1 ?? finalDie1, finalEnemyDie2 ?? finalDie2);
    let frameIndex = 0;
    setIsAnimating(true);
    setDisplayFaces(playerFrames[0] ?? [finalDie1, finalDie2]);
    setDisplayEnemyFaces(enemyFrames[0] ?? [finalEnemyDie1 ?? 1, finalEnemyDie2 ?? 1]);

    const intervalId = window.setInterval(() => {
      frameIndex += 1;

      if (frameIndex >= playerFrames.length) {
        window.clearInterval(intervalId);
        return;
      }

      setDisplayFaces(playerFrames[frameIndex] ?? [finalDie1, finalDie2]);
      setDisplayEnemyFaces(enemyFrames[frameIndex] ?? [finalEnemyDie1 ?? 1, finalEnemyDie2 ?? 1]);
    }, 95);

    const settleId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setDisplayFaces([finalDie1, finalDie2]);
      setDisplayEnemyFaces([finalEnemyDie1 ?? 1, finalEnemyDie2 ?? 1]);
      setIsAnimating(false);
    }, 520);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(settleId);
      setDisplayFaces([finalDie1, finalDie2]);
      setDisplayEnemyFaces([finalEnemyDie1 ?? 1, finalEnemyDie2 ?? 1]);
      setIsAnimating(false);
    };
  }, [
    animate,
    animationKey,
    difficulty,
    enemyBonus,
    enemyTotal,
    finalDie1,
    finalDie2,
    finalEnemyDie1,
    finalEnemyDie2,
    isOpposed,
    statBonus,
    success,
    total
  ]);

  const state = useMemo(() => {
    if (success === true) {
      return {
        label: isOpposed ? "Victory" : "Success",
        className: "roll-state-success"
      };
    }

    if (success === false) {
      return {
        label: isOpposed ? "Driven back" : "Setback",
        className: "roll-state-failure"
      };
    }

    return {
      label: "Awaiting roll",
      className: "roll-state-pending"
    };
  }, [isOpposed, success]);

  if (finalDie1 === null || finalDie2 === null || total === null || difficulty === null || statBonus === null || success === null) {
    return null;
  }

  return (
    <section className="panel nested-panel roll-panel" data-testid="roll-outcome-panel">
      <div className="row-between">
        <div>
          <h2>{title}</h2>
          <p>{summary.summary}</p>
        </div>
        <div className={`roll-state ${state.className}`} data-testid="roll-state">
          <span>{state.label}</span>
        </div>
      </div>
      <div className={`roll-display ${isOpposed ? "roll-display-opposed" : ""}`}>
        <DicePair label={isOpposed ? "Player" : "Roll"} faces={displayFaces} animating={isAnimating} />
        {isOpposed && <DicePair label="Enemy" faces={displayEnemyFaces} animating={isAnimating} />}
        <div className="roll-breakdown">
          <p>
            <strong>{displayFaces[0]}</strong> + <strong>{displayFaces[1]}</strong> + stat <strong>{statBonus}</strong>
          </p>
          <p>
            Total <strong data-testid="roll-total">{total}</strong>
            {isOpposed ? (
              <>
                {" "}vs enemy <strong data-testid="roll-enemy-total">{enemyTotal}</strong>
              </>
            ) : (
              <>
                {" "}vs difficulty <strong data-testid="roll-difficulty">{difficulty}</strong>
              </>
            )}
          </p>
          {isOpposed ? (
            <>
              <p>
                Enemy <strong>{displayEnemyFaces[0]}</strong> + <strong>{displayEnemyFaces[1]}</strong> + bonus{" "}
                <strong>{enemyBonus}</strong>
              </p>
              <p>
                Using <strong>{summary.checkStat ?? "n/a"}</strong> against{" "}
                <strong>{summary.encounterTitle ?? "the current encounter"}</strong>. Ties hold for the player.
              </p>
            </>
          ) : (
            <p>
              Using <strong>{summary.checkStat ?? "n/a"}</strong> against{" "}
              <strong>{summary.encounterTitle ?? "the current encounter"}</strong>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
