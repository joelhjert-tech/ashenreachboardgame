import type { CSSProperties, ReactElement } from "react";
import { ArtworkFrame } from "../shared/ArtworkFrame.js";
import { getCharacterPortraitPathOrNull } from "../shared/assetPaths.js";
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

function Topper({ kind }: { kind: OperativePieceIdentity["topper"] }): ReactElement {
  if (kind === "crown") return <path d="M31 31 38 10l12 13 12-13 7 21-19 8z" />;
  if (kind === "horn") return <path d="M50 34C29 30 27 15 28 8c5 9 12 12 22 12 10 0 17-3 22-12 1 7-1 22-22 26z" />;
  if (kind === "beacon") return <path d="M43 34 48 8h4l5 26-7 8zm-9-16h8v5h-8zm24 0h8v5h-8z" />;
  if (kind === "halo") return <><ellipse cx="50" cy="19" rx="19" ry="9" /><path d="M47 27h6v13h-6z" /></>;
  if (kind === "spire") return <path d="m50 5 11 30-11 9-11-9z" />;
  if (kind === "gear") return <path d="m50 7 6 7 9-1 2 9 8 5-5 8 2 9-9 2-5 8-8-5-8 5-5-8-9-2 2-9-5-8 8-5 2-9 9 1z" />;
  if (kind === "claw") return <path d="M36 37 27 12l17 14L50 7l6 19 17-14-9 25-14 8z" />;
  if (kind === "rune") return <path d="m50 6 16 15-10 8 8 12-14 7-14-7 8-12-10-8z" />;
  if (kind === "antenna") return <><path d="M47 37h6V15h-6z" /><circle cx="50" cy="10" r="5" /><path d="M36 17h8v4h-8zm20 0h8v4h-8z" /></>;
  return <path d="m50 5 10 24-7 16h-6l-7-16z" />;
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
      data-operative-piece={variant}
    >
      <span className="operative-piece__shadow" aria-hidden="true" />
      <svg className="operative-piece__body" viewBox="0 0 100 150" aria-hidden="true">
        <g className="operative-piece__topper"><Topper kind={identity.topper} /></g>
        <path className="operative-piece__iron" d="M34 44h32l9 20-8 48H33l-8-48z" />
        <path className="operative-piece__ceramic" d="m42 49 8-7 8 7 6 54H36z" />
        <path className="operative-piece__edge" d="M29 65h42M35 108h30" />
        <ellipse className="operative-piece__base-rim" cx="50" cy="124" rx="39" ry="15" />
        <path className="operative-piece__base" d="M13 124v10c0 8 17 14 37 14s37-6 37-14v-10c-7 8-20 12-37 12s-30-4-37-12z" />
        <g className="operative-piece__heraldry"><Heraldry kind={identity.heraldry} /></g>
      </svg>
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
      <span className="operative-piece__initials" aria-hidden="true">{identity.initials}</span>
      <span className="operative-piece__active-ring" aria-hidden="true" />
      <span className="operative-piece__nameplate">
        <b>{identity.playerName}</b>
        <small>{identity.operativeName}</small>
      </span>
    </article>
  );
}
