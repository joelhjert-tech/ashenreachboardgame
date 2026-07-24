import { BroadcastIcon } from "@phosphor-icons/react/dist/csr/Broadcast";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/csr/Heartbeat";
import { HexagonIcon } from "@phosphor-icons/react/dist/csr/Hexagon";
import { TreasureChestIcon } from "@phosphor-icons/react/dist/csr/TreasureChest";
import { useEffect, useState, type ReactElement } from "react";
import { getSignalTheatreAssetPaths } from "../shared/assetPaths.js";
import { OperativePortraitImage } from "../shared/OperativePortraitImage.js";
import { getSignalTheatreEnvironment } from "../tv/signalTheatreEnvironmentManifest.js";

interface SignalPhoneIdentityRailProps {
  characterId: string;
  characterName: string;
  displayName: string;
  wounds: number;
  salvage: number;
  scars: number;
  sectorId: string;
  connectionStatus: string;
  active: boolean;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SignalPhoneIdentityRail({
  characterId,
  characterName,
  displayName,
  wounds,
  salvage,
  scars,
  sectorId,
  connectionStatus,
  active
}: SignalPhoneIdentityRailProps): ReactElement {
  const environment = getSignalTheatreEnvironment(sectorId);
  const [environmentFailed, setEnvironmentFailed] = useState(false);

  useEffect(() => setEnvironmentFailed(false), [environment?.path]);

  const environmentPath = environmentFailed || !environment
    ? getSignalTheatreAssetPaths().worldStage
    : environment.path;
  const sectorName = environment?.sectorName ?? titleCase(sectorId);
  const reachLabel = environment ? `${titleCase(environment.tier)} Reach` : "Signal Theatre";
  const normalizedConnection = connectionStatus.toLowerCase();
  const connected = normalizedConnection === "open" || normalizedConnection.includes("connected");

  return (
    <header className="signal-phone-identity phone-topbar" data-testid="signal-phone-identity">
      <div className="signal-phone-identity__rail">
        <div className="signal-phone-identity__portrait">
          <OperativePortraitImage
            characterId={characterId}
            alt={`${characterName} operative portrait`}
            priority
          />
          <HexagonIcon weight="duotone" aria-hidden="true" />
        </div>

        <div className="signal-phone-identity__name">
          <span>{characterName}</span>
          <h1>{displayName}</h1>
        </div>

        <dl className="signal-phone-identity__vitals" aria-label="Character vitals">
          <div className="signal-phone-identity__vital signal-phone-identity__vital--wound">
            <dt><HeartbeatIcon weight="fill" aria-hidden="true" /> Wounds</dt>
            <dd>{wounds}</dd>
          </div>
          <div className="signal-phone-identity__vital signal-phone-identity__vital--salvage">
            <dt><TreasureChestIcon weight="duotone" aria-hidden="true" /> Salvage</dt>
            <dd>{salvage}</dd>
          </div>
        </dl>

        <div className="signal-phone-identity__state">
          <span className={connected ? "is-connected" : "is-disconnected"}>
            <BroadcastIcon weight="fill" aria-hidden="true" />
            {connected ? "Connected" : connectionStatus}
          </span>
          <strong className={active ? "is-active" : "is-waiting"}>
            {active ? "Your turn" : "Waiting"}
          </strong>
        </div>
      </div>

      <div className="signal-phone-identity__sector">
        <img
          src={environmentPath}
          width={1600}
          height={900}
          decoding="async"
          alt=""
          aria-hidden="true"
          onError={() => setEnvironmentFailed(true)}
        />
        <div>
          <span>Ashenreach · {reachLabel}</span>
          <strong>{sectorName}</strong>
        </div>
        <small>{scars} scar{scars === 1 ? "" : "s"}</small>
      </div>
    </header>
  );
}
