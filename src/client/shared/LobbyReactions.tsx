import { useRef } from "react";
import { LOBBY_REACTIONS, LOBBY_REACTION_INTERVAL_MS, type LobbyReactionEvent, type LobbyReactionId } from "../../shared/lobbyReactions.js";
import "./LobbyReactions.css";

export function LobbyReactionButtons({ onReact, disabled = false }: {
  onReact?: (reaction: LobbyReactionId) => boolean;
  disabled?: boolean;
}) {
  const lastSent = useRef(0);
  return <section className="lobby-reactions" aria-label="Lobby reactions">
    <div><strong>Send some energy</strong><small>Tap an emoji · it appears on the TV</small></div>
    <div className="lobby-reactions__buttons">
      {LOBBY_REACTIONS.map((reaction) => <button key={reaction.id} type="button" aria-label={`Send ${reaction.label} reaction`}
        disabled={disabled || !onReact} onClick={() => {
          const now = Date.now();
          if (now - lastSent.current >= LOBBY_REACTION_INTERVAL_MS && onReact?.(reaction.id)) lastSent.current = now;
        }}><span aria-hidden="true">{reaction.emoji}</span></button>)}
    </div>
  </section>;
}

export function LobbyReactionBursts({ reactions = [] }: { reactions?: LobbyReactionEvent[] }) {
  return <div className="lobby-reaction-bursts" aria-hidden="true">
    {reactions.map((event) => <div className="lobby-reaction-burst" key={event.id} style={{ left: `${12 + (Number(event.id.split("-").at(-1)) * 17 || 0) % 72}%` }}>
      <span>{LOBBY_REACTIONS.find((reaction) => reaction.id === event.reaction)?.emoji}</span>
      <small>{event.displayName}</small>
    </div>)}
  </div>;
}
