import type { ButtonHTMLAttributes, ReactNode } from "react";

export type GameButtonTone = "neutral" | "primary" | "secondary" | "move" | "battle" | "shop" | "action" | "success" | "danger";
export type GameButtonSize = "compact" | "normal" | "large";
export type GameButtonStatus = "default" | "loading" | "success" | "error";

export interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: GameButtonTone;
  size?: GameButtonSize;
  status?: GameButtonStatus;
  selected?: boolean;
  icon?: ReactNode;
  sublabel?: ReactNode;
  disabledReason?: string;
  contentMode?: "standard" | "custom";
}

export function GameButton({
  tone = "neutral",
  size = "normal",
  status = "default",
  selected = false,
  icon,
  sublabel,
  disabledReason,
  contentMode = "standard",
  className = "",
  children,
  disabled,
  type = "button",
  role,
  title,
  ...props
}: GameButtonProps): ReactNode {
  const loading = status === "loading";
  const isDisabled = Boolean(disabled || loading);
  const visibleSublabel = isDisabled && disabledReason ? disabledReason : sublabel;
  const classes = [
    "game-button",
    `game-button-${tone}`,
    `game-button-${size}`,
    selected ? "game-button-selected" : "",
    loading ? "game-button-loading" : "",
    status === "success" ? "game-button-success" : "",
    status === "error" ? "game-button-error" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      role={role}
      className={classes}
      disabled={isDisabled}
      title={title ?? (isDisabled ? disabledReason : undefined)}
      aria-busy={loading || undefined}
      aria-pressed={role === "tab" ? undefined : selected || undefined}
      data-status={status}
      data-selected={selected ? "true" : undefined}
      data-content-mode={contentMode}
      data-disabled-reason={isDisabled && disabledReason ? disabledReason : undefined}
    >
      {contentMode === "custom" ? (
        children
      ) : (
        <>
          {loading && <span className="game-button-spinner" aria-hidden="true" />}
          {icon && (
            <span className="game-button-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="game-button-copy">
            <span className="game-button-label">{children}</span>
            {visibleSublabel && <span className="game-button-sublabel">{visibleSublabel}</span>}
          </span>
        </>
      )}
    </button>
  );
}
