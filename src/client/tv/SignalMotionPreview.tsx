import { useEffect, useRef, useState, type ReactElement } from "react";
import { SignalCardReveal, buildSignalCardRevealModel } from "./SignalCardReveal.js";
import { SignalSectorResolution } from "./SignalSectorResolution.js";
import type { SignalSectorResolutionModel } from "./signalSectorResolutionPresentation.js";

type PreviewScene = "Encounter" | "Victory" | "Defeat" | "Draw";
const scenes: PreviewScene[] = ["Encounter", "Victory", "Defeat", "Draw"];

// Local presentation samples only. This entry point never joins or changes a room.
function previewModel(scene: PreviewScene, replay: number): SignalSectorResolutionModel {
  const defeat = scene === "Defeat";
  const draw = scene === "Draw";
  return {
    id: `motion-preview:${scene}:${replay}`,
    revision: 1,
    stage: scene === "Encounter" ? "battle_ready" : "result",
    mode: "battle",
    tone: defeat ? "failure" : draw ? "draw" : "success",
    actorSeatId: "preview",
    actorDisplayName: "Nera",
    locationName: "Ashwalk Bridge",
    title: "Latchspire Raider",
    eyebrow: "Hostile contact",
    publicSummary: "A raider bars the crossing beneath a failing signal mast.",
    stat: "grit",
    statLabel: "Grit",
    operative: {
      name: "Bjornis", secondaryName: null, baseValue: 4,
      modifiers: [{ label: "Relic blade", value: 1 }],
      rawDice: defeat ? [1, 1] : draw ? [1, 2] : [3, 4],
      diceTotal: defeat ? 2 : draw ? 3 : 7,
      finalTotal: defeat ? 7 : draw ? 8 : 12
    },
    operativeImageKey: "char_bjornis",
    opposition: {
      name: "Latchspire Raider", secondaryName: null, baseValue: 3,
      modifiers: [{ label: "Sector pressure", value: 1 }],
      rawDice: [4], diceTotal: 4, finalTotal: 8
    },
    oppositionImageKey: "latchspire-raider",
    oppositionArtKind: "threat",
    oppositionFixed: false,
    outcomeLabel: defeat ? "FAILURE" : draw ? "DRAW" : "SUCCESS",
    outcomeCopy: defeat ? "The operative suffers 1 wound."
      : draw ? "Neither side prevails." : "The raider is driven from the sector.",
    publicConsequence: defeat ? "The operative suffers 1 wound." : null,
    publicReward: !defeat && !draw ? "Gain 1 trophy." : null,
    waitingCopy: null,
    restored: false,
    sequence: ["Engage", "Dice", "Calculation", "Result"],
    activeSequenceIndex: 3
  };
}

export function SignalMotionPreview(): ReactElement {
  const [scene, setScene] = useState<PreviewScene>("Encounter");
  const [replay, setReplay] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(entry.contentRect.width / 1600, entry.contentRect.height / 900));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const model = previewModel(scene, replay);
  return (
    <main style={{ position: "fixed", inset: 0, background: "#05080d" }} aria-label="Combat animation preview">
      <div ref={stageRef} style={{ position: "absolute", inset: "0 0 64px", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 1600, height: 900, left: "50%", top: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          background: 'linear-gradient(rgb(2 4 8 / .7), rgb(2 4 8 / .8)), url("/assets/riftfall/environments/signal-theatre/sectors/ashwake-crossing.png") center / cover' }}>
        {scene === "Encounter"
          ? <SignalCardReveal model={buildSignalCardRevealModel(model)} environmentPath="/assets/riftfall/environments/signal-theatre/sectors/ashwake-crossing.png" />
          : <SignalSectorResolution model={model} />}
        </div>
      </div>
      <nav aria-label="Replay animations" style={{ position: "absolute", bottom: 0, width: "100%", height: 64,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "#0b1018", borderTop: "1px solid #574936" }}>
        <span style={{ color: "#c7bba6", fontSize: 12 }}>Animation preview</span>
        {scenes.map((name) => <button key={name} type="button" aria-pressed={scene === name}
          onClick={() => { setScene(name); setReplay((value) => value + 1); }}
          style={{ padding: "8px 16px", color: scene === name ? "#fff0d0" : "#c7bba6",
            background: scene === name ? "#443522" : "#151c27", border: "1px solid #776044", borderRadius: 4 }}>
          {name}
        </button>)}
        <a href="/tv" style={{ color: "#c7bba6", fontSize: 12 }}>Back to game</a>
      </nav>
    </main>
  );
}
