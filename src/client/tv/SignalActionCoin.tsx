import type { CSSProperties, ReactElement } from "react";
import { getSignalTheatreStatSealPath } from "../shared/assetPaths.js";
import type { Stat } from "../shared/types.js";
import type { HostMotionCueKind } from "./HostMotionCue.js";
import "./SignalActionCoin.css";

export type SignalActionCoinKind = HostMotionCueKind | "challenge" | "ended";

interface SignalActionCoinProps {
  kind: SignalActionCoinKind;
  label: string;
  detail: string;
  stat?: Stat | null;
}

const accentByKind: Record<SignalActionCoinKind, string> = {
  turn: "#d6c08f",
  movement: "#75d9c0",
  arrival: "#8de2c8",
  encounter: "#6ebbe8",
  battle: "#df624d",
  challenge: "#6ebbe8",
  reward: "#d8bd68",
  penalty: "#e05a45",
  waiting: "#aaa69d",
  shop: "#d09655",
  final: "#d7c3f1",
  ended: "#d8bd68"
};

const accentByStat: Record<Stat, string> = {
  command: "#9b6cff",
  grit: "#d84a32",
  signal: "#39a9ff",
  guile: "#4fbf78",
  forge: "#d8792a"
};

function StatEngraving({ stat }: { stat: Stat }): ReactElement {
  if (stat === "command") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="M35 72V41l15-13 15 13v31" />
        <path d="M35 45h30M42 72V49M58 72V49M30 74h40" />
        <path d="m38 31 5-9 7 7 7-7 5 9" />
      </g>
    );
  }

  if (stat === "grit") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m31 29 10 6 27 35-7 5-27-35zM69 29l-10 6-27 35 7 5 27-35z" />
        <path d="M25 27l11 3-7 8zM75 27l-11 3 7 8zM30 70l10 8M70 70l-10 8" />
      </g>
    );
  }

  if (stat === "signal") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="M24 51c8-14 17-20 26-20s18 6 26 20c-8 13-17 19-26 19S32 64 24 51Z" />
        <circle cx="50" cy="51" r="9" />
        <path d="M50 17v8M50 77v8M18 51h8M74 51h8M27 28l6 6M67 68l6 6M73 28l-6 6M33 68l-6 6" />
      </g>
    );
  }

  if (stat === "guile") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m50 20 25 16-8 31-17 14-17-14-8-31z" />
        <path d="M50 20v61M25 36l25 16 25-16M34 45l8 4-7 7M66 45l-8 4 7 7M42 68h16" />
      </g>
    );
  }

  return (
    <g className="signal-action-coin__engraving">
      <circle cx="50" cy="50" r="20" />
      <circle cx="50" cy="50" r="8" />
      <path d="M50 18v12M50 70v12M18 50h12M70 50h12M27 27l9 9M64 64l9 9M73 27l-9 9M36 64l-9 9" />
      <path d="M43 14h14l3 8H40zM43 86h14l3-8H40zM14 43v14l8 3V40zM86 43v14l-8 3V40z" />
    </g>
  );
}

function ActionEngraving({ kind }: { kind: SignalActionCoinKind }): ReactElement {
  if (kind === "movement") {
    return (
      <g className="signal-action-coin__engraving">
        <circle cx="29" cy="70" r="6" />
        <circle cx="71" cy="30" r="6" />
        <path d="M34 66c12-2 7-16 18-19 8-3 13 2 15-10M58 27l13 3-4 13" />
        <path d="M24 80h18M58 20h18" />
      </g>
    );
  }

  if (kind === "arrival") {
    return (
      <g className="signal-action-coin__engraving">
        <circle cx="50" cy="52" r="9" />
        <circle cx="50" cy="52" r="21" />
        <path d="M50 18v15M50 71v14M17 52h14M69 52h14M42 20l8-8 8 8" />
      </g>
    );
  }

  if (kind === "battle") {
    return <StatEngraving stat="grit" />;
  }

  if (kind === "encounter" || kind === "challenge") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m50 18 27 32-27 32-27-32zM50 31l15 19-15 19-15-19z" />
        <path d="M50 38v18M50 63v2M17 29l8 8M83 29l-8 8M17 71l8-8M83 71l-8-8" />
      </g>
    );
  }

  if (kind === "reward") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m50 19 18 18-18 18-18-18zM27 68h46M34 77h32" />
        <path d="M50 55v20M42 66l8 9 8-9" />
      </g>
    );
  }

  if (kind === "penalty") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m50 18-8 22 11 7-8 16 8 19M24 29l18 11M53 47l23-13M45 63l-21 8M53 82l23-12" />
        <path d="M29 19h42M29 81h42" />
      </g>
    );
  }

  if (kind === "waiting") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="M31 22h38M31 78h38M36 25c0 14 14 15 14 25S36 61 36 75M64 25c0 14-14 15-14 25s14 11 14 25" />
        <path d="M41 34h18M41 66l9-8 9 8" />
      </g>
    );
  }

  if (kind === "shop") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="M50 19v62M28 32h44M33 32l-12 24h24zM67 32 55 56h24zM35 72h30M41 80h18" />
      </g>
    );
  }

  if (kind === "final" || kind === "ended") {
    return (
      <g className="signal-action-coin__engraving">
        <path d="m28 69 5-35 17 15 17-15 5 35zM28 69h44M35 79h30" />
        <path d="M33 34l-7-10M67 34l7-10M50 49V18" />
      </g>
    );
  }

  return (
    <g className="signal-action-coin__engraving">
      <path d="M50 18 69 31v38L50 82 31 69V31zM50 30v40M37 39l13-9 13 9M37 61l13 9 13-9" />
      <circle cx="50" cy="50" r="7" />
    </g>
  );
}

export function SignalActionCoin({
  kind,
  label,
  detail,
  stat = null
}: SignalActionCoinProps): ReactElement {
  const accent = stat ? accentByStat[stat] : accentByKind[kind];
  const engravingLabel = stat ? `${stat} challenge` : `${kind} action`;
  const style = { "--signal-coin-accent": accent } as CSSProperties;

  return (
    <figure
      className={`signal-action-coin signal-action-coin--${stat ?? kind}${stat ? " signal-action-coin--stat" : ""}`}
      data-signal-action-coin={stat ?? kind}
      aria-label={`${label}. ${detail}. ${engravingLabel} seal.`}
      style={style}
    >
      <div className="signal-action-coin__disc" aria-hidden="true">
        {stat ? (
          <img src={getSignalTheatreStatSealPath(stat)} alt="" />
        ) : (
          <svg viewBox="0 0 100 100" focusable="false">
            <path className="signal-action-coin__rim" d="m50 3 11 5 12-1 7 10 11 5 1 12 6 10-5 11 1 12-10 7-5 11-12 1-10 7-11-5-12 1-7-10-11-5-1-12-6-10 5-11-1-12 10-7 5-11 12-1z" />
            <circle className="signal-action-coin__well" cx="50" cy="50" r="39" />
            <circle className="signal-action-coin__ring" cx="50" cy="50" r="33" />
            <path className="signal-action-coin__ticks" d="M50 10v6M50 84v6M10 50h6M84 50h6M22 22l5 5M73 73l5 5M78 22l-5 5M27 73l-5 5" />
            <ActionEngraving kind={kind} />
          </svg>
        )}
        <i className="signal-action-coin__scan" />
      </div>
      <figcaption>
        <span>{label}</span>
        <strong>{detail}</strong>
      </figcaption>
    </figure>
  );
}
