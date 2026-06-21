import type { ReactElement } from "react";

interface HostPlayerCardAttributes {
  cmd: number | null;
  grit: number | null;
  signal: number | null;
  guile: number | null;
  forge: number | null;
}

export interface HostPlayerCardProps {
  seatId: string;
  isOpen: boolean;
  isConnected: boolean;
  characterName: string | null;
  characterTitle: string | null;
  portraitUrl: string | null;
  locationName: string;
  fieldStatus: string;
  heat: number | null;
  wounds: number | null;
  scars: number | null;
  attributes: HostPlayerCardAttributes;
  gearSummary: string;
  contractSummary: string;
  specialAbilitySummary: string;
  isActiveTurn: boolean;
  isReady: boolean;
  className?: string;
}

const attributeOrder: Array<{ key: keyof HostPlayerCardAttributes; label: string }> = [
  { key: "cmd", label: "CMD" },
  { key: "grit", label: "GRIT" },
  { key: "signal", label: "SIGNAL" },
  { key: "guile", label: "GUILE" },
  { key: "forge", label: "FORGE" }
];

function renderValue(value: number | null): string {
  return value === null ? "-" : String(value);
}

export function HostPlayerCard({
  seatId,
  isOpen,
  isConnected,
  characterName,
  characterTitle,
  portraitUrl,
  locationName,
  fieldStatus,
  heat,
  wounds,
  scars,
  attributes,
  gearSummary,
  contractSummary,
  specialAbilitySummary,
  isActiveTurn,
  isReady,
  className
}: HostPlayerCardProps): ReactElement {
  const seatLabel = `Seat ${seatId}`;

  return (
    <article
      className={`host-player-card${isOpen ? " host-player-card-open" : ""}${isActiveTurn ? " host-player-card-active" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label={`${seatLabel} ${characterName ?? "open seat"}`}
    >
      <div className="host-player-card-corner host-player-card-corner-nw" aria-hidden="true" />
      <div className="host-player-card-corner host-player-card-corner-ne" aria-hidden="true" />
      <div className="host-player-card-corner host-player-card-corner-sw" aria-hidden="true" />
      <div className="host-player-card-corner host-player-card-corner-se" aria-hidden="true" />

      <div className="host-player-card-portrait-column">
        <div className="host-player-card-portrait-frame">
          {portraitUrl && !isOpen ? (
            <img className="host-player-card-portrait" src={portraitUrl} alt={characterName ?? seatLabel} />
          ) : (
            <div className="host-player-card-portrait-empty">
              <span>Open Seat</span>
              <strong>Awaiting operative</strong>
            </div>
          )}
          <div className="host-player-card-emblem" aria-hidden="true">
            ARC
          </div>
        </div>
      </div>

      <div className="host-player-card-main">
        <div className="host-player-card-identity">
          <div className="host-player-card-nameblock">
            <p className="host-player-card-seat">{seatLabel}</p>
            <h3>{characterName ?? "Open Seat"}</h3>
            <p className="host-player-card-title">{characterTitle ?? "Unclaimed operative frame"}</p>
          </div>

          <div className="host-player-card-status-row">
            <span className={`host-player-card-chip ${isConnected ? "host-player-card-chip-online" : "host-player-card-chip-offline"}`}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="host-player-card-chip">{locationName}</span>
            <span className="host-player-card-chip">{isOpen ? "Field status idle" : fieldStatus}</span>
          </div>
        </div>

        <div className="host-player-card-midline">
          <div className="host-player-card-vitals">
            <span className="host-player-card-chip host-player-card-chip-vital">Heat {renderValue(heat)}</span>
            <span className="host-player-card-chip host-player-card-chip-vital">Wounds {renderValue(wounds)}</span>
            <span className="host-player-card-chip host-player-card-chip-vital">Scars {renderValue(scars)}</span>
          </div>

          <div className="host-player-card-attributes">
            {attributeOrder.map((attribute) => (
              <div key={attribute.key} className="host-player-card-attribute">
                <span>{attribute.label}</span>
                <strong>{renderValue(attributes[attribute.key])}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="host-player-card-bottom">
          <p>
            <strong>Gear</strong>
            <span>{gearSummary}</span>
          </p>
          <p>
            <strong>Contract</strong>
            <span>{contractSummary}</span>
          </p>
          <p>
            <strong>Special</strong>
            <span>{specialAbilitySummary}</span>
          </p>
        </div>
      </div>

      <div className="host-player-card-sidepanel">
        {isOpen ? (
          <div className="host-player-card-open-panel">
            <span>Open Seat</span>
            <strong>Ready for a player to join</strong>
          </div>
        ) : (
          <div className="host-player-card-control-panel">
            {isActiveTurn && <span className="host-player-card-badge">Active Player</span>}
            <span className="host-player-card-sidechip">{isReady ? "Ready" : "Standby"}</span>
            <span className="host-player-card-sidechip">{isConnected ? "Link stable" : "Link lost"}</span>
            <span className="host-player-card-sidechip">{isActiveTurn ? "Turn live" : "Turn waiting"}</span>
          </div>
        )}
      </div>
    </article>
  );
}
