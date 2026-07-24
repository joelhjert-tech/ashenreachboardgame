import type { CSSProperties, ReactElement } from "react";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import { getCharacterPortraitPathOrNull } from "../shared/assetPaths.js";
import { getSignalPieceAssetPath } from "../../shared/signalPieceCatalog.js";
import type {
  OperativePieceIdentity,
  OperativePieceVariant
} from "./operativePiecePresentation.js";
import "./OperativeChessPiece.css";

interface OperativeChessPieceProps {
  identity: OperativePieceIdentity;
  variant: OperativePieceVariant;
  active: boolean;
  moving: boolean;
  arrived: boolean;
  focused: boolean;
  style: CSSProperties;
}

function Heraldry({ kind }: { kind: OperativePieceIdentity["heraldry"] }): ReactElement {
  if (kind === "diamond") return <path d="m50 66 9 9-9 9-9-9z" />;
  if (kind === "triangle") return <path d="m50 66 10 18H40z" />;
  if (kind === "cross") return <path d="M46 66h8v6h6v8h-6v6h-8v-6h-6v-8h6z" />;
  if (kind === "hexagon") return <path d="m42 68 8-4 8 4 3 8-3 8-8 4-8-4-3-8z" />;
  if (kind === "split-shield") return <path d="M39 67h22v10c0 7-5 11-11 14-6-3-11-7-11-14zm11 0v21" />;
  return <circle cx="50" cy="76" r="10" />;
}

export function OperativeChessPiece({
  identity,
  variant,
  active,
  moving,
  arrived,
  focused,
  style
}: OperativeChessPieceProps): ReactElement {
  const accessibleName = `${identity.playerName}, ${identity.operativeName}, ${active ? "active operative" : "operative"}`;
  return (
    <article
      className={[
        "operative-piece",
        `operative-piece--${variant}`,
        active ? "is-active" : "",
        moving ? "is-moving" : "",
        arrived ? "is-arrived" : "",
        focused ? "is-focused" : ""
      ].filter(Boolean).join(" ")}
      style={style}
      aria-label={accessibleName}
      data-seat-index={identity.seatIndex}
      data-player-symbol={identity.heraldry}
      data-operative-piece={identity.signalPieceId}
    >
      <span className="operative-piece__shadow" aria-hidden="true" />
      <ArtworkFrame
        src={getCharacterPortraitPathOrNull(identity.characterId)}
        alt={`${identity.operativeName} portrait`}
        fit="cover"
        aspectRatio="portrait"
        focalPoint="center top"
        fallback="operative"
        priority={active}
        className="operative-piece__portrait"
        imageClassName="operative-piece__portrait-image"
      />
      <img
        className="operative-piece__body"
        src={getSignalPieceAssetPath(identity.signalPieceId)}
        width={768}
        height={768}
        alt=""
        aria-hidden="true"
      />
      <svg className="operative-piece__heraldry-badge" viewBox="35 62 30 30" aria-hidden="true">
        <g><Heraldry kind={identity.heraldry} /></g>
      </svg>
      <span className="operative-piece__initials" aria-hidden="true">{identity.initials}</span>
      <span className="operative-piece__active-ring" aria-hidden="true" />
      <span className="operative-piece__nameplate">
        <b>{identity.playerName}</b>
        <small>{identity.operativeName}</small>
      </span>
    </article>
  );
}
