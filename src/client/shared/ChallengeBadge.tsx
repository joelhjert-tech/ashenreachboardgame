import type { CSSProperties, ReactElement } from "react";
import {
  CHALLENGE_THEME,
  THREAT_ICON_CHALLENGE_STAT,
  getChallengeTheme,
  getChallengeThemeStyle
} from "../../game/ui/challengeTheme.js";
import type { PublicMovementThreatIcon, Stat } from "./types.js";

type ChallengeBadgeSize = "compact" | "normal" | "large";

interface ChallengeBadgeProps {
  stat: Stat;
  value?: number | string | null;
  label?: string;
  className?: string;
  active?: boolean;
  size?: ChallengeBadgeSize;
}

export function isStat(value: string | null | undefined): value is Stat {
  return Boolean(value && value in CHALLENGE_THEME);
}

export function getThreatIconStat(icon: PublicMovementThreatIcon): Stat {
  return THREAT_ICON_CHALLENGE_STAT[icon] ?? "command";
}

export function ChallengeBadge({
  stat,
  value = null,
  label,
  className = "",
  active = false,
  size = "normal"
}: ChallengeBadgeProps): ReactElement {
  const theme = getChallengeTheme(stat);
  const displayLabel = label ?? theme.label;

  return (
    <span
      className={[
        "challenge-badge",
        `challenge-badge-${stat}`,
        `challenge-badge-${size}`,
        active ? "challenge-badge-active" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      style={getChallengeThemeStyle(stat) as CSSProperties}
      title={`${theme.label}: ${theme.treatment}`}
    >
      <span className="challenge-badge-icon" aria-hidden="true">
        {theme.icon}
      </span>
      <span className="challenge-badge-label">{displayLabel}</span>
      {value !== null && value !== undefined && (
        <>
          {" "}
          <strong className="challenge-badge-value">{value}</strong>
        </>
      )}
    </span>
  );
}

export function ThreatIconBadge({
  icon,
  value = null,
  className = ""
}: {
  icon: PublicMovementThreatIcon;
  value?: number | string | null;
  className?: string;
}): ReactElement {
  const stat = getThreatIconStat(icon);
  const colorLabel = `${icon.charAt(0).toUpperCase()}${icon.slice(1)}`;
  const iconLabel = `${colorLabel} ${getChallengeTheme(stat).label}`;

  return (
    <ChallengeBadge
      stat={stat}
      value={value}
      label={iconLabel}
      className={`challenge-threat-icon challenge-threat-icon-${icon} ${className}`.trim()}
      size="compact"
    />
  );
}
