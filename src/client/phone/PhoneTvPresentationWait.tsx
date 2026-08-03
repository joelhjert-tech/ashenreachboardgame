import type { ReactElement } from "react";
import type { PhonePatchPayload } from "../shared/types.js";

interface PhoneTvPresentationWaitProps {
  gate: NonNullable<PhonePatchPayload["tvPresentationGate"]>;
  seatId: string;
}

interface PhoneMovementPresentationWaitProps {
  gate: NonNullable<PhonePatchPayload["movementPresentationGate"]>;
  seatId: string;
}

export function PhoneTvPresentationWait({ gate, seatId }: PhoneTvPresentationWaitProps): ReactElement {
  const isOwner = gate.ownerSeatId === seatId;

  return (
    <section
      className="phone-movement-tv-wait phone-tv-presentation-wait"
      role="status"
      aria-live="polite"
      data-testid="tv-presentation-gate"
    >
      <span>Signal Theatre</span>
      <h2>{isOwner ? "Your moment is playing on TV" : "TV ceremony in progress"}</h2>
      <p>
        {isOwner
          ? `${gate.label} is finishing on the shared display. Your actions unlock when the animation settles.`
          : `${gate.ownerDisplayName ?? "The active operative"}: ${gate.label}. Table actions resume when the animation settles.`}
      </p>
      <div className="phone-movement-tv-wait__pulse" aria-hidden="true"><i /><i /><i /></div>
    </section>
  );
}

export function PhoneMovementPresentationWait({ gate, seatId }: PhoneMovementPresentationWaitProps): ReactElement {
  const isMovingPlayer = gate.ownerSeatId === seatId;

  return (
    <section
      className="phone-movement-tv-wait"
      role="status"
      aria-live="polite"
      data-testid="movement-tv-presentation-gate"
    >
      <span>Host movement</span>
      <h2>{isMovingPlayer ? "Movement playing on TV" : `${gate.ownerDisplayName} is moving`}</h2>
      <p>
        {isMovingPlayer
          ? `Your operative is travelling to ${gate.destinationSectorName}. Arrival actions unlock after the piece lands.`
          : `The host display is following the route to ${gate.destinationSectorName}.`}
      </p>
      <div className="phone-movement-tv-wait__pulse" aria-hidden="true"><i /><i /><i /></div>
    </section>
  );
}
