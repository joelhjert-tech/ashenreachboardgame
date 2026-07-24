import { HeartbeatIcon } from "@phosphor-icons/react/dist/csr/Heartbeat";
import { HexagonIcon } from "@phosphor-icons/react/dist/csr/Hexagon";
import { TreasureChestIcon } from "@phosphor-icons/react/dist/csr/TreasureChest";
import type { ReactElement } from "react";
import { OperativePortraitImage } from "../shared/OperativePortraitImage.js";
import { getSignalTheatreEnvironment } from "../tv/signalTheatreEnvironmentManifest.js";

interface SignalPhoneIdentityRailProps {
  characterId: string;
  characterName: string;
  displayName: string;
  wounds: number;
  salvage: number;
  sectorId: string;
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
  sectorId
}: SignalPhoneIdentityRailProps): ReactElement {
  const environment = getSignalTheatreEnvironment(sectorId);
  const sectorName = environment?.sectorName ?? titleCase(sectorId);

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
          <h1>{displayName}</h1>
          <span>{characterName} · {sectorName}</span>
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
      </div>
    </header>
  );
}
