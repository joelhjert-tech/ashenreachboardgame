export const LOBBY_REACTIONS = [
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "skull", emoji: "💀", label: "Skull" },
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "party", emoji: "🎉", label: "Party" }
] as const;

export type LobbyReactionId = typeof LOBBY_REACTIONS[number]["id"];
export interface LobbyReactionEvent {
  type: "LOBBY_REACTION";
  id: string;
  sessionId: string;
  reaction: LobbyReactionId;
  displayName: string;
}
export const LOBBY_REACTION_LIFETIME_MS = 4000;
export const LOBBY_REACTION_INTERVAL_MS = 200;
