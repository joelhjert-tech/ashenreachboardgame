import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import {
  configureSessionFromPhone,
  fetchCharacters,
  fetchScenarios,
  fetchSessionSummary,
  getConnectionDiagnostics,
  joinSession,
  leaveSession,
  startSession
} from "../shared/network.js";
import type { CharacterCatalogEntry, PhonePatchPayload, PhoneSessionAuth, ScenarioCatalogEntry, StatePatch } from "../shared/types.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import { getCharacterPortraitPath } from "../shared/assetPaths.js";
import { statLabelById, statOrder } from "../shared/statLabels.js";
import { MobileDebugDrawer } from "./MobileDebugDrawer.js";
import { PortraitControllerView } from "./PortraitControllerView.js";

const storageKey = "ashenreach.controllerSession";
const legacyStorageKey = "ashen-reach-phone-auth";

function readInitialRoomCode(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return (params.get("room") ?? params.get("roomCode") ?? "").toUpperCase();
}

function readRequestedSeatId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const value = new URLSearchParams(window.location.search).get("seat") ?? new URLSearchParams(window.location.search).get("seatId") ?? "";
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("seat-") ? normalized : `seat-${normalized}`;
}

function readStoredAuth(): PhoneSessionAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get("resetAuth") === "1") {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(legacyStorageKey);
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(legacyStorageKey);
    return null;
  }

  const roomCode = readInitialRoomCode();
  const requestedSeatId = readRequestedSeatId();
  const candidates = [
    window.sessionStorage.getItem(storageKey),
    window.sessionStorage.getItem(legacyStorageKey),
    window.localStorage.getItem(storageKey),
    window.localStorage.getItem(legacyStorageKey)
  ];

  for (const raw of candidates) {
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as PhoneSessionAuth;

      if (!parsed.roomCode || !parsed.seatId || !parsed.seatToken || !parsed.displayName) {
        continue;
      }

      const normalized = {
        ...parsed,
        roomCode: parsed.roomCode.toUpperCase()
      };

      if (roomCode && normalized.roomCode !== roomCode) {
        continue;
      }

      if (requestedSeatId && normalized.seatId !== requestedSeatId) {
        continue;
      }

      return normalized;
    } catch {
      continue;
    }
  }

  return null;
}

function writeStoredAuth(auth: PhoneSessionAuth | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(legacyStorageKey);
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(legacyStorageKey);
    return;
  }

  const storedAuth: PhoneSessionAuth = {
    ...auth,
    roomCode: auth.roomCode.toUpperCase(),
    lastConnectedAt: new Date().toISOString()
  };

  window.sessionStorage.setItem(storageKey, JSON.stringify(storedAuth));
  window.localStorage.setItem(storageKey, JSON.stringify(storedAuth));
  window.sessionStorage.removeItem(legacyStorageKey);
  window.localStorage.removeItem(legacyStorageKey);
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatComplexity(value: string | undefined): string {
  return value ? toTitleCase(value) : "Standard";
}

function getCharacterSelectionRank(character: CharacterCatalogEntry): number {
  if (character.qaOnly) {
    return 40;
  }

  if (character.presentation?.recommendedForFirstGame) {
    return 0;
  }

  switch (character.presentation?.complexity) {
    case "beginner":
      return 1;
    case "standard":
    case undefined:
      return 10;
    case "advanced":
      return 20;
    case "expert":
      return 30;
    default:
      return 10;
  }
}

type CharacterSelectionFilter = "recommended" | "all" | "advanced";

function matchesCharacterFilter(character: CharacterCatalogEntry, filter: CharacterSelectionFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "recommended") {
    return Boolean(character.presentation?.recommendedForFirstGame || character.presentation?.complexity === "beginner");
  }

  return Boolean(character.qaOnly || character.presentation?.complexity === "advanced" || character.presentation?.complexity === "expert");
}

function formatJoinFailure(joinFailure: unknown): string {
  const message = joinFailure instanceof Error ? joinFailure.message : "Join failed";

  if (!/failed to fetch|networkerror|load failed|cannot reach|fetch/i.test(message)) {
    return message;
  }

  const diagnostics = getConnectionDiagnostics();

  if (diagnostics.isLocalhostPage) {
    return "Cannot reach host server. This phone is using a localhost URL; open the LAN URL or scan the TV QR from a LAN-hosted TV page.";
  }

  return "Cannot reach host server. Check that the phone and host are on the same Wi-Fi, then confirm Windows firewall allows the Ashen Reach ports.";
}

function useLandscapeMode(): boolean {
  const getIsLandscape = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const orientationMatch =
      typeof window.matchMedia === "function" ? window.matchMedia("(orientation: landscape)").matches : false;
    const phoneSizedViewport = Math.min(window.innerWidth, window.innerHeight) < 700 && Math.max(window.innerWidth, window.innerHeight) < 1000;

    return phoneSizedViewport && (orientationMatch || window.innerWidth > window.innerHeight);
  };

  const [isLandscape, setIsLandscape] = useState(getIsLandscape);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(orientation: landscape)") : null;
    const update = () => setIsLandscape(getIsLandscape());

    update();
    mediaQuery?.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    window.screen.orientation?.addEventListener?.("change", update);

    return () => {
      mediaQuery?.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
      window.screen.orientation?.removeEventListener?.("change", update);
    };
  }, []);

  return isLandscape;
}

export function PhoneApp(): ReactElement {
  const [characters, setCharacters] = useState<CharacterCatalogEntry[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioCatalogEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [characterFilter, setCharacterFilter] = useState<CharacterSelectionFilter>("all");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [formState, setFormState] = useState(() => ({
    roomCode: readInitialRoomCode(),
    displayName: "",
    characterId: ""
  }));
  const [pendingCharacterId, setPendingCharacterId] = useState<string | null>(null);
  const [characterSelectionRetryRequired, setCharacterSelectionRetryRequired] = useState(false);
  const [auth, setAuth] = useState<PhoneSessionAuth | null>(() => readStoredAuth());
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinUnavailable = joinError === "No open seats remain";
  const isLandscape = useLandscapeMode();
  const { patch, error, sendIntent, status, debugEvents, clearDebugEvents } = useRoomSubscription({
    view: "phone",
    auth
  });

  useEffect(() => {
    fetchCharacters().then((loadedCharacters) => {
      setCharacters(loadedCharacters);
    });
    fetchScenarios()
      .then((loadedScenarios) => {
        setScenarios(loadedScenarios);
        setSelectedScenarioId((current) => current || loadedScenarios[0]?.id || "");
      })
      .catch(() => {
        setScenarios([]);
      });
  }, []);

  useEffect(() => {
    if (!auth || !error) {
      return;
    }

    if (!/mismatch|rejoin|invalid seat token|invalid rejoin token|session mismatch/i.test(error)) {
      return;
    }

    setFormState((current) => ({
      ...current,
      roomCode: auth.roomCode,
      displayName: auth.displayName
    }));
    setJoinError("Could not reclaim your seat. Join again or ask host to free the seat.");
    setAuth(null);
    writeStoredAuth(null);
  }, [auth, error]);

  const phonePatch =
    patch && "self" in patch.payload ? (patch as StatePatch<PhonePatchPayload>) : null;

  useEffect(() => {
    if (!auth || !phonePatch) {
      return;
    }

    writeStoredAuth(auth);
  }, [auth, phonePatch?.sequence]);

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinError(null);
    setJoiningRoom(true);

    try {
      const requestedRoomCode = formState.roomCode.trim().toUpperCase();
      const session = await fetchSessionSummary();

      if (session.roomCode !== requestedRoomCode) {
        throw new Error("Unknown room code");
      }

      setFormState((current) => ({
        ...current,
        roomCode: requestedRoomCode
      }));
      const nextAuth = await joinSession({
        roomCode: requestedRoomCode,
        displayName: formState.displayName.trim()
      });

      setAuth(nextAuth);
      writeStoredAuth(nextAuth);
    } catch (joinFailure) {
      setJoinError(formatJoinFailure(joinFailure));
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleCharacterSelected = (characterId: string) => {
    if (pendingCharacterId) {
      return;
    }
    setJoinError(null);
    setPendingCharacterId(characterId);
    setFormState((current) => ({ ...current, characterId }));
    sendIntent({ type: "SELECT_CHARACTER", seatId: auth?.seatId ?? "", characterId });
  };

  const handleConfigureLobby = async (mode: "single-player" | "co-op" | "rivalry" | "nemesis") => {
    if (!auth) {
      return;
    }

    setJoinError(null);

    try {
      await configureSessionFromPhone(auth, {
        mode,
        playerCount: mode === "single-player" ? 1 : 4,
        ...(selectedScenarioId ? { scenarioId: selectedScenarioId } : {})
      });
    } catch (configureFailure) {
      setJoinError(configureFailure instanceof Error ? configureFailure.message : "Could not configure lobby");
    }
  };

  const handleStartFromPhone = async () => {
    if (!auth) {
      return;
    }

    setJoinError(null);

    try {
      await startSession(auth.roomCode, auth.seatToken);
    } catch (startFailure) {
      setJoinError(startFailure instanceof Error ? startFailure.message : "Could not start game");
    }
  };

  const clearSession = () => {
    setAuth(null);
    writeStoredAuth(null);
  };

  const backToCharacterSelect = async () => {
    if (!auth) {
      return;
    }

    setJoinError(null);

    try {
      await leaveSession(auth);
      setAuth(null);
      writeStoredAuth(null);
    } catch (leaveFailure) {
      setJoinError(leaveFailure instanceof Error ? leaveFailure.message : "Could not release character");
    }
  };

  const sortedCharacters = useMemo(
    () =>
      [...characters].sort((left, right) => {
        const rankDelta = getCharacterSelectionRank(left) - getCharacterSelectionRank(right);

        if (rankDelta !== 0) {
          return rankDelta;
        }

        return left.name.localeCompare(right.name);
      }),
    [characters]
  );
  const displayCharacters = useMemo(
    () => sortedCharacters.filter((character) => matchesCharacterFilter(character, characterFilter)),
    [characterFilter, sortedCharacters]
  );
  const portraitPlayerName = auth?.displayName || "Ashen Reach Controller";
  const portraitRoomCode = auth?.roomCode || formState.roomCode || "Awaiting room";
  const portraitPhaseStatus = phonePatch
    ? `${toTitleCase(phonePatch.phase)} - ${toTitleCase(phonePatch.payload.status)}`
    : auth
      ? "Rejoining session"
      : "Join screen";
  const self = phonePatch?.payload.self ?? null;
  const activeSeatId = phonePatch?.payload.turnOrder[phonePatch.payload.activeSeatIndex] ?? null;
  const canSendLobbyIntent = Boolean(phonePatch) || (Boolean(auth) && status === "open");
  const activeContractCard = phonePatch?.payload.activeContractCard ?? null;
  const ownSeat = phonePatch?.payload.seats.find((seat) => seat.seatId === auth?.seatId) ?? null;
  const isSetupHost = Boolean(phonePatch?.payload.selfIsSetupHost);
  const previousTurnRef = useRef<{ activeSeatId: string | null; status: PhonePatchPayload["status"] } | null>(null);

  useEffect(() => {
    const current = { activeSeatId, status: phonePatch?.payload.status ?? "lobby" as const };
    const previous = previousTurnRef.current;
    previousTurnRef.current = current;

    if (
      !auth ||
      !phonePatch ||
      current.status !== "active" ||
      current.activeSeatId !== auth.seatId ||
      !previous ||
      (previous.activeSeatId === current.activeSeatId && previous.status === current.status)
    ) {
      return;
    }

    if (typeof navigator.vibrate === "function" && document.visibilityState !== "hidden") {
      navigator.vibrate([160, 70, 160]);
    }
  }, [activeSeatId, auth, phonePatch?.payload.status]);

  useEffect(() => {
    if (!ownSeat) {
      return;
    }

    if (ownSeat.characterSelected === false) {
      setCharacterSelectionRetryRequired(false);
      if (!pendingCharacterId && formState.characterId) {
        setFormState((current) => ({ ...current, characterId: "" }));
      }
      return;
    }

    if (pendingCharacterId && ownSeat.characterId !== pendingCharacterId) {
      setPendingCharacterId(null);
      setCharacterSelectionRetryRequired(true);
      setFormState((current) => ({ ...current, characterId: "" }));
      setJoinError("The room confirmed a different operative. Choose again.");
      return;
    }

    if (characterSelectionRetryRequired && !pendingCharacterId) {
      return;
    }

    if (ownSeat.characterId) {
      setFormState((current) =>
        current.characterId === ownSeat.characterId
          ? current
          : { ...current, characterId: ownSeat.characterId }
      );
    }
    setPendingCharacterId(null);
    setCharacterSelectionRetryRequired(false);
  }, [
    characterSelectionRetryRequired,
    formState.characterId,
    ownSeat?.characterId,
    ownSeat?.characterSelected,
    pendingCharacterId,
    phonePatch?.payload.status
  ]);

  useEffect(() => {
    if (!pendingCharacterId || !error) {
      return;
    }

    setPendingCharacterId(null);
    setFormState((current) => ({ ...current, characterId: "" }));
    setJoinError(error);
  }, [error, pendingCharacterId]);

  if (!auth) {
    return (
      <main className="phone-page">
        {isLandscape ? (
          <section className="phone-rotate-warning" aria-live="polite">
            <div>
              <span>Portrait required</span>
              <h1>Rotate your phone to portrait mode.</h1>
            </div>
          </section>
        ) : (
            <div className="phone-join-layout phone-join-layout-nameEntry">
              <section className="phone-join-hero phone-panel">
                <p className="phone-panel-kicker">Ashen Reach Controller</p>
              <h1>Join room</h1>
              <p className="phone-muted-copy">
                Enter the room code from the TV and the name you want at the table.
              </p>
            </section>

            <section className="phone-panel phone-join-panel">
                <div className="phone-panel-header">
                  <div>
                    <h2>Join Room</h2>
                    <p className="phone-muted-copy">Enter room code and player name. The server assigns Host Phone control to the first connected player.</p>
                  </div>
                </div>
                <form className="phone-join-form" onSubmit={handleNameSubmit}>
                  <section className="phone-join-step" aria-label="Step 1 enter room code and name">
                    <span className="phone-join-step-kicker">Step 1</span>
                    <label className="field">
                      <span>Room code</span>
                      <input
                        name="roomCode"
                        autoComplete="off"
                        autoCapitalize="characters"
                        inputMode="text"
                        spellCheck={false}
                        value={formState.roomCode}
                        onChange={(event) => {
                          setJoinError(null);
                          setFormState((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }));
                        }}
                        placeholder="ABCDE"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Player name</span>
                      <input
                        name="playerName"
                        autoComplete="nickname"
                        spellCheck={false}
                        value={formState.displayName}
                        onChange={(event) => {
                          setJoinError(null);
                          setFormState((current) => ({ ...current, displayName: event.target.value }));
                        }}
                        placeholder="Seat name"
                        required
                      />
                    </label>
                  </section>
                  {(joinError || error) && <p className="error">{joinError ?? error}</p>}
                  <div className="phone-join-actions">
                    <button
                      className="phone-button phone-button-primary"
                      type="submit"
                      disabled={joiningRoom || joinUnavailable}
                    >
                      {joiningRoom ? "Joining..." : joinUnavailable ? "Room Full" : "Join Game"}
                    </button>
                    {debugOpen && <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} />}
                  </div>
                </form>
            </section>
          </div>
        )}
      </main>
    );
  }

  if (auth && !phonePatch) {
    return (
      <main className="phone-page phone-page-controller">
        <section className="phone-portrait-controller phone-portrait-controller-empty">
          <div className="phone-portrait-panel phone-portrait-lobby-panel">
            <main className="phone-portrait-scroll phone-lobby-waiting-scroll" aria-label="Rejoining room">
              <section className="phone-lobby-ready-panel phone-character-waiting-panel">
                <div className="phone-character-waiting-topline">
                  <span>{auth.roomCode}</span>
                  <span>{auth.displayName}</span>
                  <span>{status}</span>
                </div>
                <p className="phone-panel-kicker">Rejoining</p>
                <h1>Restoring your seat.</h1>
                <p className="phone-muted-copy">Waiting for the authoritative room state.</p>
                {(joinError || error) && <p className="error">{joinError ?? error}</p>}
              </section>
            </main>
          </div>
        </section>
      </main>
    );
  }

  if (auth && phonePatch?.payload.status === "lobby" && isSetupHost && phonePatch.payload.lobbyConfigured === false) {
    return (
      <main className="phone-page phone-page-controller">
        <section className="phone-portrait-controller phone-portrait-controller-empty">
          <div className="phone-portrait-panel phone-portrait-lobby-panel">
            <main className="phone-portrait-scroll phone-lobby-waiting-scroll" aria-label="Host Phone game type">
              <section className="phone-lobby-ready-panel phone-character-waiting-panel">
                <div className="phone-character-waiting-topline">
                  <span>{auth.roomCode}</span>
                  <span>Host Phone</span>
                  <span>{status}</span>
                </div>
                <p className="phone-panel-kicker">Choose Game Type</p>
                <h1>Host Phone</h1>
                <p className="phone-muted-copy">The TV is waiting. Choose the scenario and game shape, then continue setup here.</p>
                <label className="field phone-host-scenario-picker">
                  <span>Scenario</span>
                  <select
                    aria-label="Scenario"
                    value={selectedScenarioId}
                    disabled={scenarios.length === 0}
                    onChange={(event) => setSelectedScenarioId(event.target.value)}
                  >
                    {scenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name} | {scenario.difficulty}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="phone-host-mode-grid">
                  <button type="button" className="phone-button phone-button-primary" onClick={() => void handleConfigureLobby("single-player")}>
                    Single Player
                  </button>
                  <button type="button" className="phone-button phone-button-secondary" onClick={() => void handleConfigureLobby("co-op")}>
                    Multiplayer Co-op
                  </button>
                  <button type="button" className="phone-button phone-button-secondary" disabled>
                    Normal Coming Later
                  </button>
                  <button type="button" className="phone-button phone-button-secondary" onClick={() => void handleConfigureLobby("rivalry")}>
                    Rivalry
                  </button>
                  <button type="button" className="phone-button phone-button-secondary" onClick={() => void handleConfigureLobby("nemesis")}>
                    Nemesis
                  </button>
                </div>
                {(joinError || error) && <p className="error">{joinError ?? error}</p>}
              </section>
            </main>
          </div>
        </section>
      </main>
    );
  }

  if (auth && phonePatch?.payload.status === "lobby" && phonePatch.payload.lobbyConfigured === false && !isSetupHost) {
    return (
      <main className="phone-page phone-page-controller">
        <section className="phone-portrait-controller phone-portrait-controller-empty">
          <div className="phone-portrait-panel phone-portrait-lobby-panel">
            <main className="phone-portrait-scroll phone-lobby-waiting-scroll" aria-label="Waiting for Host Phone">
              <section className="phone-lobby-ready-panel phone-character-waiting-panel">
                <div className="phone-character-waiting-topline">
                  <span>{auth.roomCode}</span>
                  <span>{auth.displayName}</span>
                  <span>{status}</span>
                </div>
                <p className="phone-panel-kicker">Waiting</p>
                <h1>Host Phone is choosing game type.</h1>
                <p className="phone-muted-copy">Keep this controller open. Character selection unlocks after the Host Phone chooses Single Player or Multiplayer.</p>
              </section>
            </main>
          </div>
        </section>
      </main>
    );
  }

  if (
    auth &&
    (phonePatch?.payload.status === "lobby" || phonePatch?.payload.lateJoinPending === true) &&
    ownSeat &&
    (ownSeat.characterSelected === false || characterSelectionRetryRequired)
  ) {
    return (
      <main className="phone-page phone-page-controller">
        <section className="phone-portrait-controller phone-portrait-controller-empty">
          <div className="phone-portrait-panel phone-portrait-lobby-panel">
            <main className="phone-portrait-scroll phone-lobby-waiting-scroll phone-character-select-scroll" aria-label="Choose character">
              <section className="phone-lobby-ready-panel phone-character-waiting-panel phone-character-select-surface">
                <div className="phone-character-waiting-topline">
                  <span>{auth.roomCode}</span>
                  <span>{auth.displayName}</span>
                  <span>{isSetupHost ? "Host Phone" : "Player"}</span>
                </div>
                <p className="phone-panel-kicker">{phonePatch.payload.lateJoinPending ? "Join Game In Progress" : "Choose Character"}</p>
                <h1>Select operative</h1>
                {phonePatch.payload.lateJoinPending ? (
                  <p className="phone-muted-copy">Choose an available operative, select a starting mission, then join the end of the current turn order.</p>
                ) : null}
                <div className="phone-character-filter-row" role="tablist" aria-label="Character filters">
                  {[
                    ["recommended", "Recommended"],
                    ["all", "All Operatives"],
                    ["advanced", "Advanced"]
                  ].map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      role="tab"
                      aria-selected={characterFilter === filter}
                      className={`phone-character-filter${characterFilter === filter ? " phone-character-filter-active" : ""}`}
                      onClick={() => setCharacterFilter(filter as CharacterSelectionFilter)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="phone-character-grid phone-character-snap-list" role="list" aria-label="Character">
                  {displayCharacters.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      className={`phone-character-option${pendingCharacterId === character.id ? " phone-character-option-selected" : ""}`}
                      disabled={pendingCharacterId !== null}
                      aria-busy={pendingCharacterId === character.id ? "true" : undefined}
                      onClick={() => handleCharacterSelected(character.id)}
                    >
                      <img src={getCharacterPortraitPath(character.id)} alt="" />
                      <span>
                        <strong>{character.name}</strong>
                        <small>{character.archetype}</small>
                        {character.presentation && (
                          <span className="phone-character-presentation" data-testid="phone-character-presentation">
                            <span className="phone-character-role-row">
                              <small>{character.presentation.role}</small>
                              <small>{formatComplexity(character.presentation.complexity)}</small>
                              {character.presentation.recommendedForFirstGame ? <em>First-game pick</em> : null}
                            </span>
                            <small>{character.presentation.playstyleSummary}</small>
                          </span>
                        )}
                        <span className="phone-character-stat-row" aria-label={`${character.name} stats`}>
                          {statOrder.map((stat) => (
                            <small key={stat} style={getChallengeThemeStyle(stat) as CSSProperties}>
                              {statLabelById[stat]} <strong>{character.stats[stat]}</strong>
                            </small>
                          ))}
                        </span>
                        <small className="phone-character-select-label">
                          {pendingCharacterId === character.id ? "Selecting..." : "Select character"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                {(joinError || error) && <p className="error">{joinError ?? error}</p>}
              </section>
            </main>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="phone-page phone-page-controller">
      <div className={`phone-controller-layout${isLandscape ? " phone-controller-layout-landscape" : ""}`}>
        {isLandscape ? (
          <section className="phone-rotate-warning" aria-live="polite">
            <div>
              <span>Portrait required</span>
              <h1>Rotate your phone to portrait mode.</h1>
            </div>
          </section>
        ) : (
          <PortraitControllerView
            self={self}
            roomCode={auth.roomCode}
            displayName={auth.displayName}
            connectionStatus={status}
            activeSeatId={activeSeatId}
            activeContractCard={activeContractCard ?? null}
            patch={phonePatch?.payload ?? null}
            characters={characters}
            onIntent={canSendLobbyIntent ? sendIntent : null}
            onLeave={clearSession}
            onLobbyBack={() => void backToCharacterSelect()}
            onStartSession={isSetupHost ? handleStartFromPhone : undefined}
          />
        )}

        {debugOpen && (
          <div className="phone-debug-anchor">
            <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} defaultOpen={debugOpen} />
          </div>
        )}
      </div>
    </main>
  );
}
