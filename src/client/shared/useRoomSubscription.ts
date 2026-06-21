import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getWebSocketOrigin } from "./network.js";
import type {
  ClientIntent,
  DebugEvent,
  HostCommand,
  PhonePatchPayload,
  PhoneSessionAuth,
  PublicPatchPayload,
  ServerEnvelope,
  StatePatch
} from "./types.js";

type ConnectionStatus = "idle" | "connecting" | "open" | "closed";

interface TvConnectionConfig {
  view: "tv";
  enabled: boolean;
  hostToken?: string | null;
}

interface PhoneConnectionConfig {
  view: "phone";
  auth: PhoneSessionAuth | null;
}

type RoomConnectionConfig = TvConnectionConfig | PhoneConnectionConfig;
const maxDebugEvents = 40;

function appendDebugEvent(
  setEvents: Dispatch<SetStateAction<DebugEvent[]>>,
  entry: Omit<DebugEvent, "id" | "timestamp">
): void {
  setEvents((current) =>
    [
      {
        ...entry,
        id: `${Date.now()}-${current.length}`,
        timestamp: new Date().toISOString()
      },
      ...current
    ].slice(0, maxDebugEvents)
  );
}

export function useRoomSubscription(
  config: RoomConnectionConfig
): {
  patch: StatePatch<PublicPatchPayload | PhonePatchPayload> | null;
  error: string | null;
  sendIntent: (intent: ClientIntent | HostCommand) => void;
  status: ConnectionStatus;
  debugEvents: DebugEvent[];
  clearDebugEvents: () => void;
} {
  const [patch, setPatch] = useState<StatePatch<PublicPatchPayload | PhonePatchPayload> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);
  const connectionGenerationRef = useRef(0);

  useEffect(() => {
    if ((config.view === "tv" && !config.enabled) || (config.view === "phone" && !config.auth)) {
      setStatus("idle");
      setError(null);
      setPatch(null);
      return;
    }

    const generation = connectionGenerationRef.current + 1;
    connectionGenerationRef.current = generation;
    manualCloseRef.current = false;

    const connect = () => {
      if (connectionGenerationRef.current !== generation || manualCloseRef.current) {
        return;
      }

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      setStatus("connecting");
      setError(null);
      appendDebugEvent(setDebugEvents, {
        label: "Socket connecting",
        detail: config.view === "tv" ? "Opening TV subscription" : "Opening phone subscription",
        payload: {
          view: config.view,
          roomCode: config.view === "phone" ? config.auth?.roomCode ?? null : null
        }
      });
      const wsUrl =
        config.view === "tv"
          ? `${getWebSocketOrigin()}/?view=tv${config.hostToken ? `&hostToken=${encodeURIComponent(config.hostToken)}` : ""}`
          : `${getWebSocketOrigin()}/?view=phone&joinMode=rejoin`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      const isCurrentSocket = () =>
        connectionGenerationRef.current === generation && socketRef.current === socket;

      socket.addEventListener("open", () => {
        if (!isCurrentSocket()) {
          return;
        }

        setStatus("open");
        setError(null);
        appendDebugEvent(setDebugEvents, {
          label: "Socket open",
          payload: {
            view: config.view,
            wsUrl
          }
        });

        if (config.view === "phone" && config.auth) {
          const rejoinMessage = {
            type: "REJOIN",
            sessionId: config.auth.roomCode,
            seatToken: config.auth.seatToken
          };

          socket.send(JSON.stringify(rejoinMessage));
          appendDebugEvent(setDebugEvents, {
            label: "Sent rejoin",
            payload: rejoinMessage
          });
        }
      });

      socket.addEventListener("message", (event) => {
        if (!isCurrentSocket()) {
          return;
        }

        const message = JSON.parse(event.data as string) as ServerEnvelope;
        appendDebugEvent(setDebugEvents, {
          label: `Received ${message.type}`,
          detail:
            message.type === "STATE_PATCH"
              ? `phase ${message.phase} sequence ${message.sequence}`
              : "reason" in message
                ? message.reason
                : undefined,
          payload: message
        });

        if (message.type === "STATE_PATCH") {
          setPatch(message);
          return;
        }

        if (message.type === "INTENT_REJECTED" || message.type === "REJOIN_REJECTED") {
          setError(message.reason);
        }
      });

      socket.addEventListener("close", (event) => {
        if (!isCurrentSocket()) {
          return;
        }

        socketRef.current = null;
        setStatus("closed");
        appendDebugEvent(setDebugEvents, {
          label: "Socket closed",
          detail: event.reason || (manualCloseRef.current ? "Closed by client" : "Closed by server"),
          payload: {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          }
        });

        if (!manualCloseRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;

            if (connectionGenerationRef.current !== generation || manualCloseRef.current || socketRef.current !== null) {
              return;
            }

            connect();
          }, 1000);
        }
      });
    };

    connect();

    return () => {
      manualCloseRef.current = true;
      connectionGenerationRef.current += 1;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket) {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.addEventListener(
            "open",
            () => {
              try {
                socket.close();
              } catch {
                // Ignore cleanup races on sockets that finish opening after the effect has already been replaced.
              }
            },
            { once: true }
          );
          return;
        }

        try {
          socket.close();
        } catch {
          // The browser path is tolerant here; this keeps tests using the Node ws client aligned.
        }
      }
    };
  }, [
    config.view,
    config.view === "tv" ? config.enabled : config.auth?.roomCode,
    config.view === "tv" ? config.hostToken ?? "tv" : config.auth?.seatToken
  ]);

  return {
    patch,
    error,
    status,
    debugEvents,
    clearDebugEvents() {
      setDebugEvents([]);
    },
    sendIntent(intent) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(intent));
        appendDebugEvent(setDebugEvents, {
          label: `Sent ${intent.type}`,
          payload: intent
        });
        return;
      }

      appendDebugEvent(setDebugEvents, {
        label: `Dropped ${intent.type}`,
        detail: "Socket was not open when the client tried to send this intent.",
        payload: {
          intent,
          readyState: socketRef.current?.readyState ?? null
        }
      });
    }
  };
}
