import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactElement } from "react";
import { getChallengeThemeStyle } from "../../game/ui/challengeTheme.js";
import { fetchCharacters, fetchSessionSummary, getConnectionDiagnostics, joinSession, leaveSession } from "../shared/network.js";
import type { CharacterCatalogEntry, PhonePatchPayload, PhoneSelfState, PhoneSessionAuth, StatePatch } from "../shared/types.js";
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
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [joinStep, setJoinStep] = useState<"nameEntry" | "characterSelect">("nameEntry");
  const [characterFilter, setCharacterFilter] = useState<CharacterSelectionFilter>("all");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [formState, setFormState] = useState(() => ({
    roomCode: readInitialRoomCode(),
    displayName: "",
    characterId: "void-marshal",
    requestedSeatId: readRequestedSeatId()
  }));
  const [auth, setAuth] = useState<PhoneSessionAuth | null>(() => readStoredAuth());
  const [joinError, setJoinError] = useState<string | null>(null);
  const isLandscape = useLandscapeMode();
  const { patch, error, sendIntent, status, debugEvents, clearDebugEvents } = useRoomSubscription({
    view: "phone",
    auth
  });

  useEffect(() => {
    fetchCharacters().then((loadedCharacters) => {
      setCharacters(loadedCharacters);

      if (loadedCharacters[0] && !formState.characterId) {
        setFormState((current) => ({
          ...current,
          characterId: loadedCharacters[0]?.id ?? current.characterId
        }));
      }
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
      setJoinStep("characterSelect");
    } catch (joinFailure) {
      setJoinError(formatJoinFailure(joinFailure));
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleCharacterSelected = async (characterId: string) => {
    setJoinError(null);

    try {
      const nextAuth = await joinSession({
        roomCode: formState.roomCode.trim().toUpperCase(),
        displayName: formState.displayName.trim(),
        characterId,
        ...(formState.requestedSeatId ? { seatId: formState.requestedSeatId } : {})
      });

      setFormState((current) => ({
        ...current,
        characterId,
        roomCode: nextAuth.roomCode
      }));
      setAuth(nextAuth);
      writeStoredAuth(nextAuth);
    } catch (joinFailure) {
      setJoinError(formatJoinFailure(joinFailure));
    }
  };

  const clearSession = () => {
    setAuth(null);
    writeStoredAuth(null);
  };

  const backToCharacterSelect = async () => {
    if (!auth) {
      setJoinStep("characterSelect");
      return;
    }

    setJoinError(null);

    try {
      await leaveSession(auth);
      setAuth(null);
      writeStoredAuth(null);
      setJoinStep("characterSelect");
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
  const selectedCharacter = characters.find((character) => character.id === formState.characterId);
  const portraitPlayerName = auth?.displayName || selectedCharacter?.name || "Ashen Reach Controller";
  const portraitRoomCode = auth?.roomCode || formState.roomCode || "Awaiting room";
  const portraitPhaseStatus = phonePatch
    ? `${toTitleCase(phonePatch.phase)} - ${toTitleCase(phonePatch.payload.status)}`
    : auth
      ? "Rejoining session"
      : "Join screen";

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
          <div className={`phone-join-layout phone-join-layout-${joinStep}`}>
            <section className="phone-join-hero phone-panel">
              <p className="phone-panel-kicker">Ashen Reach Controller</p>
              <h1>{joinStep === "nameEntry" ? "Join room" : "Select Character"}</h1>
              <p className="phone-muted-copy">
                {joinStep === "nameEntry"
                  ? "Enter the room code from the TV and the name you want at the table."
                  : "Choose your operative."}
              </p>
              {joinStep === "characterSelect" ? (
                <div className="phone-join-summary" aria-label="Joined room summary">
                  <span>Room {formState.roomCode}</span>
                  <span>{formState.displayName}</span>
                </div>
              ) : null}
            </section>

            <section className={`phone-panel phone-join-panel${joinStep === "characterSelect" ? " phone-character-select-surface" : ""}`}>
              {joinStep === "nameEntry" ? (
                <div className="phone-panel-header">
                  <div>
                    <h2>Join Room</h2>
                    <p className="phone-muted-copy">Step 1: enter room code and player name.</p>
                  </div>
                </div>
              ) : null}
              {joinStep === "nameEntry" ? (
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
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))
                        }
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
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, displayName: event.target.value }))
                        }
                        placeholder="Seat name"
                        required
                      />
                    </label>
                  </section>
                  {(joinError || error) && <p className="error">{joinError ?? error}</p>}
                  <div className="phone-join-actions">
                    <button className="phone-button phone-button-primary" type="submit" disabled={joiningRoom}>
                      {joiningRoom ? "Joining..." : "Join / Continue"}
                    </button>
                    {debugOpen && <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} />}
                  </div>
                </form>
              ) : (
                <div className="phone-join-form phone-character-select-form">
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
                  <div className="phone-character-grid" role="list" aria-label="Character">
                      {displayCharacters.map((character) => (
                        <button
                          key={character.id}
                          type="button"
                          className={`phone-character-option${formState.characterId === character.id ? " phone-character-option-selected" : ""}`}
                          onClick={() => void handleCharacterSelected(character.id)}
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
                                <span className="phone-character-summary-grid">
                                  <small>
                                    <strong>Gear</strong>
                                    {character.presentation.signatureItemSummary}
                                  </small>
                                  <small>
                                    <strong>Contract</strong>
                                    {character.presentation.startingContractSummary}
                                  </small>
                                </span>
                                <span className="phone-character-strength-grid">
                                  <small>
                                    <strong>Good at</strong>
                                    {character.presentation.strengths.slice(0, 2).join(", ")}
                                  </small>
                                  <small>
                                    <strong>Watch out</strong>
                                    {character.presentation.weaknesses.slice(0, 2).join(", ")}
                                  </small>
                                </span>
                              </span>
                            )}
                            {character.qaOnly && <em className="phone-character-qa-badge">QA ONLY</em>}
                            <span className="phone-character-stat-row" aria-label={`${character.name} stats`}>
                              {statOrder.map((stat) => (
                                <small key={stat} style={getChallengeThemeStyle(stat) as CSSProperties}>
                                  {statLabelById[stat]} <strong>{character.stats[stat]}</strong>
                                </small>
                              ))}
                            </span>
                            <small className="phone-character-select-label">Select character</small>
                          </span>
                        </button>
                      ))}
                  </div>
                  {(joinError || error) && <p className="error">{joinError ?? error}</p>}
                  <div className="phone-join-actions">
                    <button className="phone-button phone-button-secondary" type="button" onClick={() => setJoinStep("nameEntry")}>
                      Back
                    </button>
                    {debugOpen && <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} />}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    );
  }

  const fallbackLobbySelf: PhoneSelfState | null =
    selectedCharacter && (!phonePatch || phonePatch.payload.status === "lobby")
      ? {
          seatId: auth.seatId,
          sectorId: selectedCharacter.currentSpaceId,
          hand: [],
          notes: [],
          character: selectedCharacter
        }
      : null;
  const self = phonePatch?.payload.self ?? fallbackLobbySelf;
  const activeSeatId = phonePatch?.payload.turnOrder[phonePatch.payload.activeSeatIndex] ?? null;
  const canSendLobbyIntent = Boolean(phonePatch) || (Boolean(auth) && status === "open");
  const activeContractCard =
    self?.character.activeContract &&
    phonePatch?.payload.availableContracts.find((contract) => contract.id === self.character.activeContract?.contractId);

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
