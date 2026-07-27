import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";
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
import { useFocusOnRevision } from "../shared/useFocusOnRevision.js";
import { usePhysicalVisualViewport } from "../shared/usePhysicalVisualViewport.js";
import { MobileDebugDrawer } from "./MobileDebugDrawer.js";
import { PortraitControllerView } from "./PortraitControllerView.js";
import { useActiveRoomBackGuard } from "./useActiveRoomBackGuard.js";
import { getSubmittedDisplayNameError, MAX_PLAYER_DISPLAY_NAME_LENGTH } from "../../game/rules/playerIdentity.js";
import { PhoneCartographyPrototypeFixture } from "./PhoneCartographyPrototypeFixture.js";
import {
  SIGNAL_PIECES,
  getSignalPieceAssetPath,
  getSignalPieceIdForSeat,
  type SignalPieceId
} from "../../shared/signalPieceCatalog.js";

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
type SetupSelectionStep = "piece" | "operative";
type HostSetupStep = "mode" | "scenario";

function matchesCharacterFilter(character: CharacterCatalogEntry, filter: CharacterSelectionFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "recommended") {
    return Boolean(character.presentation?.recommendedForFirstGame || character.presentation?.complexity === "beginner");
  }

  return Boolean(character.qaOnly || character.presentation?.complexity === "advanced" || character.presentation?.complexity === "expert");
}

function getFirstAvailableSignalPiece(taken: ReadonlySet<SignalPieceId>): SignalPieceId {
  return SIGNAL_PIECES.find((piece) => !taken.has(piece.id))?.id ?? SIGNAL_PIECES[0]!.id;
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
  const [selectedSetupMode, setSelectedSetupMode] = useState<"single-player" | "co-op" | "rivalry" | "nemesis" | null>(null);
  const [hostSetupStep, setHostSetupStep] = useState<HostSetupStep>("mode");
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [characterFilter, setCharacterFilter] = useState<CharacterSelectionFilter>("all");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [formState, setFormState] = useState(() => ({
    roomCode: readInitialRoomCode(),
    displayName: "",
    characterId: ""
  }));
  const [configuredPlayerCount, setConfiguredPlayerCount] = useState(6);
  const [pendingCharacterId, setPendingCharacterId] = useState<string | null>(null);
  const [awaitingCharacterResynchronization, setAwaitingCharacterResynchronization] = useState(false);
  const [characterDisconnectObserved, setCharacterDisconnectObserved] = useState(false);
  const [selectedSignalPieceId, setSelectedSignalPieceId] = useState<SignalPieceId>("beacon");
  const [setupSelectionStep, setSetupSelectionStep] = useState<SetupSelectionStep>("piece");
  const [signalPieceAnnouncement, setSignalPieceAnnouncement] = useState("");
  const [characterSelectionRetryRequired, setCharacterSelectionRetryRequired] = useState(false);
  const [auth, setAuth] = useState<PhoneSessionAuth | null>(() => readStoredAuth());
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinFormRef = useRef<HTMLFormElement | null>(null);
  const joinActionsRef = useRef<HTMLDivElement | null>(null);
  const joinSubmittingRef = useRef(false);
  const hostScenarioPickerRef = useRef<HTMLElement | null>(null);
  const operativeSelectionRef = useRef<HTMLElement | null>(null);
  const characterSelectionScrollRef = useRef<HTMLElement | null>(null);
  const signalPiecePickerRef = useRef<HTMLDivElement | null>(null);
  const initializedSignalPieceSeatRef = useRef<string | null>(null);
  const previousCharacterSelectedRef = useRef<boolean | null>(null);
  const joinUnavailable = joinError === "No open seats remain";
  const isLandscape = useLandscapeMode();
  const { patch, error, sendIntent, resynchronize, status, synchronized, debugEvents, clearDebugEvents } = useRoomSubscription({
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
  const visualViewport = usePhysicalVisualViewport();
  const leaveCurrentRoom = useCallback(async () => {
    if (!auth) return;
    await leaveSession(auth);
    setAuth(null);
    writeStoredAuth(null);
  }, [auth]);
  const roomBackGuard = useActiveRoomBackGuard({
    active: Boolean(auth && phonePatch?.payload.status !== "ended"),
    roomKey: auth ? `${auth.roomCode}:${auth.seatId}` : null,
    onLeave: leaveCurrentRoom
  });

  useEffect(() => {
    if (auth || !visualViewport.keyboardConstrained) return;
    const activeElement = document.activeElement;
    if (!activeElement || !joinFormRef.current?.contains(activeElement)) return;
    joinActionsRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [auth, visualViewport.keyboardConstrained, visualViewport.revision]);
  const isScenarioSelectable = (scenario: ScenarioCatalogEntry): boolean => {
    if (!selectedSetupMode || !scenario.supportedModes || !scenario.supportedPlayerCounts) return true;
    const playerCount = selectedSetupMode === "single-player" ? 1 : configuredPlayerCount;
    if (playerCount < scenario.supportedPlayerCounts.min || playerCount > scenario.supportedPlayerCounts.max) return false;
    if (selectedSetupMode === "single-player") return scenario.supportedModes.includes("solo");
    if (selectedSetupMode === "co-op") return scenario.supportedModes.includes("co-op");
    if (selectedSetupMode === "rivalry") return scenario.supportedModes.includes("rivalry") || scenario.supportedModes.includes("competitive");
    return false;
  };
  const selectedScenarioIsValid = scenarios.some((scenario) => scenario.id === selectedScenarioId && isScenarioSelectable(scenario));
  const takenSignalPieceIds = useMemo(() => new Set(
    phonePatch?.payload.seats
      .filter((seat) =>
        seat.seatId !== auth?.seatId
        && Boolean(seat.displayName)
        && !seat.kicked
        && seat.characterSelected !== false
        && Boolean(seat.signalPieceId)
      )
      .map((seat) => seat.signalPieceId!)
    ?? []
  ), [auth?.seatId, phonePatch?.payload.seats]);

  useEffect(() => {
    if (!auth || !phonePatch) {
      return;
    }

    writeStoredAuth(auth);
  }, [auth, phonePatch?.sequence]);

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (joinSubmittingRef.current) return;
    setJoinError(null);
    const displayNameError = getSubmittedDisplayNameError(formState.displayName);
    if (displayNameError) {
      setJoinError(displayNameError);
      return;
    }
    joinSubmittingRef.current = true;
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
      joinSubmittingRef.current = false;
      setJoiningRoom(false);
    }
  };

  const handleCharacterSelected = (characterId: string) => {
    if (pendingCharacterId) {
      return;
    }
    if (takenSignalPieceIds.has(selectedSignalPieceId)) {
      const replacement = getFirstAvailableSignalPiece(takenSignalPieceIds);
      setSelectedSignalPieceId(replacement);
      setSetupSelectionStep("piece");
      setSignalPieceAnnouncement(`${selectedSignalPieceId} became occupied. ${replacement} is now selected.`);
      setJoinError("That Signal piece was just claimed. Review the replacement before continuing.");
      return;
    }
    setJoinError(null);
    setPendingCharacterId(characterId);
    setAwaitingCharacterResynchronization(false);
    setCharacterDisconnectObserved(false);
    setFormState((current) => ({ ...current, characterId }));
    const sent = sendIntent({
      type: "SELECT_CHARACTER",
      seatId: auth?.seatId ?? "",
      characterId,
      signalPieceId: selectedSignalPieceId
    });
    if (sent === false) {
      setPendingCharacterId(null);
      setAwaitingCharacterResynchronization(false);
      setJoinError("Restoring the latest room state. Review your selection before trying again.");
      resynchronize?.();
    }
  };

  const handleConfigureLobby = async () => {
    if (!auth || !selectedSetupMode) {
      return;
    }
    if (takenSignalPieceIds.has(selectedSignalPieceId)) {
      const replacement = getFirstAvailableSignalPiece(takenSignalPieceIds);
      setSelectedSignalPieceId(replacement);
      setSignalPieceAnnouncement(`${selectedSignalPieceId} became occupied. ${replacement} is now selected.`);
      setJoinError("That Signal piece was just claimed. Review the replacement and choose your operative again.");
      return;
    }

    setJoinError(null);

    try {
      await configureSessionFromPhone(auth, {
        mode: selectedSetupMode,
        playerCount: selectedSetupMode === "single-player" ? 1 : selectedSetupMode === "nemesis" ? Math.min(configuredPlayerCount, 4) : configuredPlayerCount,
        ...(selectedScenarioId ? { scenarioId: selectedScenarioId } : {})
      });
    } catch (configureFailure) {
      setJoinError(configureFailure instanceof Error ? configureFailure.message : "Could not configure lobby");
    }
  };

  const handleStartFromPhone = async () => {
    if (!auth || startingGame) {
      return;
    }

    setJoinError(null);
    setStartingGame(true);

    try {
      await startSession(auth.roomCode, auth.seatToken);
    } catch (startFailure) {
      setJoinError(startFailure instanceof Error ? startFailure.message : "Could not start game");
    } finally {
      setStartingGame(false);
    }
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

  const projectedCharacterOptions = phonePatch?.payload.characterOptions;
  const characterOptionById = useMemo(
    () => new Map((projectedCharacterOptions ?? []).map((option) => [option.character.id, option])),
    [projectedCharacterOptions]
  );
  const availableCharacterCatalog = projectedCharacterOptions?.map((option) => option.character) ?? characters;
  const sortedCharacters = useMemo(
    () =>
      [...availableCharacterCatalog].sort((left, right) => {
        const rankDelta = getCharacterSelectionRank(left) - getCharacterSelectionRank(right);

        if (rankDelta !== 0) {
          return rankDelta;
        }

        return left.name.localeCompare(right.name);
      }),
    [availableCharacterCatalog]
  );
  const displayCharacters = useMemo(
    () => sortedCharacters.filter((character) => matchesCharacterFilter(character, characterFilter) || characterOptionById.get(character.id)?.developerQa),
    [characterFilter, characterOptionById, sortedCharacters]
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
    if (
      !auth ||
      !isSetupHost ||
      phonePatch?.payload.status !== "lobby" ||
      phonePatch.payload.lobbyConfigured !== false ||
      !selectedSetupMode ||
      !selectedScenarioId ||
      !selectedScenarioIsValid
    ) {
      return;
    }
    sendIntent({
      type: "HOST_SETUP_PREVIEW_REQUESTED",
      seatId: auth.seatId,
      scenarioId: selectedScenarioId,
      mode: selectedSetupMode,
      playerCount: selectedSetupMode === "single-player"
        ? 1
        : selectedSetupMode === "nemesis"
          ? Math.min(configuredPlayerCount, 4)
          : configuredPlayerCount
    });
  }, [
    auth,
    configuredPlayerCount,
    isSetupHost,
    phonePatch?.payload.lobbyConfigured,
    phonePatch?.payload.status,
    selectedScenarioId,
    selectedScenarioIsValid,
    selectedSetupMode,
    sendIntent
  ]);

  const leaveConfirmationDialog = roomBackGuard.confirmationOpen ? (
    <section className="phone-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="phone-leave-dialog-title">
      <div>
        <span>Room safety</span>
        <h2 id="phone-leave-dialog-title">Leave the game?</h2>
        <p>Your operative will remain in the current room until the server processes your exit.</p>
        {roomBackGuard.leaveError ? <p className="error" role="alert">{roomBackGuard.leaveError}</p> : null}
        <div className="phone-leave-dialog__actions">
          <button type="button" className="phone-button phone-button-primary" autoFocus onClick={roomBackGuard.stayInGame}>Stay in Game</button>
          <button type="button" className="phone-button phone-button-danger" disabled={roomBackGuard.leaveSubmitting} onClick={() => void roomBackGuard.confirmLeave()}>
            {roomBackGuard.leaveSubmitting ? "Leaving…" : "Leave Room"}
          </button>
        </div>
      </div>
    </section>
  ) : null;

  useFocusOnRevision(
    hostScenarioPickerRef,
    selectedSetupMode && hostSetupStep === "scenario" && phonePatch?.payload.setup?.stage === "mode-selection"
      ? `${phonePatch.payload.setup.id}:${selectedSetupMode}:scenario`
      : null,
    Boolean(isSetupHost && selectedSetupMode && hostSetupStep === "scenario" && phonePatch?.payload.setup?.stage === "mode-selection"),
    'button[role="radio"][aria-checked="true"]:not([disabled]), button[role="radio"]:not([disabled])'
  );
  useFocusOnRevision(
    operativeSelectionRef,
    phonePatch?.payload.setup?.id ? `${phonePatch.payload.setup.id}:${setupSelectionStep}` : null,
    Boolean(
      auth
      && setupSelectionStep === "operative"
      && phonePatch?.payload.setup?.stage === "operative-selection"
      && phonePatch.payload.setup.actorSeatId === auth.seatId
    ),
    ".phone-character-option:not([disabled])"
  );
  useFocusOnRevision(
    operativeSelectionRef,
    phonePatch?.payload.setup?.id ? `${phonePatch.payload.setup.id}:${setupSelectionStep}` : null,
    Boolean(
      auth
      && setupSelectionStep === "piece"
      && phonePatch?.payload.setup?.stage === "operative-selection"
      && phonePatch.payload.setup.actorSeatId === auth.seatId
    ),
    '[role="radio"][aria-checked="true"]:not([disabled])'
  );

  useLayoutEffect(() => {
    const scrollRoot = characterSelectionScrollRef.current;
    if (!scrollRoot) return;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    scrollRoot.scrollTop = 0;
    scrollRoot.scrollLeft = 0;
  }, [ownSeat?.seatId, phonePatch?.payload.setup?.id, setupSelectionStep]);

  useEffect(() => {
    if (!ownSeat) return;

    const previousCharacterSelected = previousCharacterSelectedRef.current;
    previousCharacterSelectedRef.current = ownSeat.characterSelected !== false;

    if (initializedSignalPieceSeatRef.current !== ownSeat.seatId) {
      initializedSignalPieceSeatRef.current = ownSeat.seatId;
      setSetupSelectionStep(ownSeat.characterSelected === false ? "piece" : "operative");
      const seatIndex = phonePatch?.payload.seats.findIndex((seat) => seat.seatId === ownSeat.seatId) ?? 0;
      const projectedDefault = ownSeat.signalPieceId ?? getSignalPieceIdForSeat(seatIndex);
      const initialPiece = projectedDefault && !takenSignalPieceIds.has(projectedDefault)
        ? projectedDefault
        : getFirstAvailableSignalPiece(takenSignalPieceIds);
      setSelectedSignalPieceId(initialPiece);
      if (projectedDefault && projectedDefault !== initialPiece) {
        setSignalPieceAnnouncement(`${projectedDefault} is occupied. ${initialPiece} is now selected.`);
      }
      return;
    }

    if (previousCharacterSelected === true && ownSeat.characterSelected === false) {
      setSetupSelectionStep("piece");
      setPendingCharacterId(null);
      setSignalPieceAnnouncement("");
      setJoinError(null);
      return;
    }

    if (ownSeat.characterSelected !== false && ownSeat.signalPieceId) {
      setSelectedSignalPieceId(ownSeat.signalPieceId);
      return;
    }

    if (takenSignalPieceIds.has(selectedSignalPieceId)) {
      const replacement = getFirstAvailableSignalPiece(takenSignalPieceIds);
      setSelectedSignalPieceId(replacement);
      setSetupSelectionStep("piece");
      setSignalPieceAnnouncement(`${selectedSignalPieceId} became occupied. ${replacement} is now selected.`);
      setJoinError("That Signal piece was just claimed. Review the replacement before continuing.");
    }
  }, [ownSeat, phonePatch?.payload.seats, selectedSignalPieceId, takenSignalPieceIds]);

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

    if (
      typeof navigator.vibrate === "function" &&
      document.visibilityState !== "hidden" &&
      (navigator.userActivation?.hasBeenActive ?? true)
    ) {
      navigator.vibrate([160, 70, 160]);
    }
  }, [activeSeatId, auth, phonePatch?.payload.status]);

  useEffect(() => {
    if (!pendingCharacterId || awaitingCharacterResynchronization) return;
    const timeout = window.setTimeout(() => {
      setJoinError("Restoring the latest room state. Your operative selection will not be sent again automatically.");
      setAwaitingCharacterResynchronization(true);
      if (!synchronized) setCharacterDisconnectObserved(true);
      resynchronize?.();
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [awaitingCharacterResynchronization, pendingCharacterId, resynchronize, synchronized]);

  useEffect(() => {
    if (!awaitingCharacterResynchronization) return;
    if (!synchronized) {
      setCharacterDisconnectObserved(true);
      return;
    }
    if (!characterDisconnectObserved) return;
    setPendingCharacterId(null);
    setAwaitingCharacterResynchronization(false);
    setCharacterDisconnectObserved(false);
    setCharacterSelectionRetryRequired(true);
    setFormState((current) => ({ ...current, characterId: "" }));
    setJoinError("Latest authoritative setup state restored. Review your operative before selecting again.");
  }, [awaitingCharacterResynchronization, characterDisconnectObserved, synchronized]);

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
      setAwaitingCharacterResynchronization(false);
      setCharacterDisconnectObserved(false);
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
    if (ownSeat.signalPieceId) {
      setSelectedSignalPieceId(ownSeat.signalPieceId);
    }
    setPendingCharacterId(null);
    setAwaitingCharacterResynchronization(false);
    setCharacterDisconnectObserved(false);
    setCharacterSelectionRetryRequired(false);
  }, [
    characterSelectionRetryRequired,
    formState.characterId,
    ownSeat?.characterId,
    ownSeat?.characterSelected,
    ownSeat?.signalPieceId,
    pendingCharacterId,
    phonePatch?.payload.status
  ]);

  useEffect(() => {
    if (!pendingCharacterId || !error) {
      return;
    }

    setPendingCharacterId(null);
    setAwaitingCharacterResynchronization(false);
    setCharacterDisconnectObserved(false);
    setFormState((current) => ({ ...current, characterId: "" }));
    setJoinError(error);
  }, [error, pendingCharacterId]);

  const cartographyFixture =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("phoneFixture") === "cartography";

  if (cartographyFixture) {
    return <PhoneCartographyPrototypeFixture />;
  }

  if (!auth) {
    return (
      <main className="phone-page phone-page-join" data-keyboard-constrained={visualViewport.keyboardConstrained ? "true" : "false"}>
        {isLandscape ? (
          <section className="phone-rotate-warning" aria-live="polite">
            <div>
              <span>Portrait required</span>
              <h1>Rotate your phone to portrait mode.</h1>
            </div>
          </section>
        ) : (
            <div className="phone-join-layout phone-join-layout-nameEntry">
            <section className="phone-panel phone-join-panel">
                <div className="phone-panel-header">
                  <div>
                    <p className="phone-panel-kicker">Ashen Reach Controller</p>
                    <h1>Join Room</h1>
                    <p className="phone-muted-copy">Enter the room code and your player name to join the table.</p>
                  </div>
                </div>
                <form ref={joinFormRef} className="phone-join-form" onSubmit={handleNameSubmit}>
                  <section className="phone-join-step" aria-label="Step 1 enter room code and name">
                    <span className="phone-join-step-kicker">Step 1</span>
                    <label className="field">
                      <span>Room code</span>
                      <input
                        name="roomCode"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        inputMode="text"
                        enterKeyHint="next"
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
                        enterKeyHint="go"
                        value={formState.displayName}
                        maxLength={MAX_PLAYER_DISPLAY_NAME_LENGTH}
                        onChange={(event) => {
                          setJoinError(null);
                          setFormState((current) => ({ ...current, displayName: event.target.value }));
                        }}
                        placeholder="Seat name"
                        required
                      />
                    </label>
                  </section>
                  {(joinError || error) && <p className="error" role="alert">{joinError ?? error}</p>}
                  <div ref={joinActionsRef} className="phone-join-actions">
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
        {roomBackGuard.confirmationOpen ? (
          <section className="phone-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="phone-leave-dialog-title">
            <div>
              <span>Room safety</span>
              <h2 id="phone-leave-dialog-title">Leave the game?</h2>
              <p>Your operative will remain in the current room until the server processes your exit.</p>
              {roomBackGuard.leaveError ? <p className="error" role="alert">{roomBackGuard.leaveError}</p> : null}
              <div className="phone-leave-dialog__actions">
                <button type="button" className="phone-button phone-button-primary" autoFocus onClick={roomBackGuard.stayInGame}>Stay in Game</button>
                <button type="button" className="phone-button phone-button-danger" disabled={roomBackGuard.leaveSubmitting} onClick={() => void roomBackGuard.confirmLeave()}>
                  {roomBackGuard.leaveSubmitting ? "Leaving…" : "Leave Room"}
                </button>
              </div>
            </div>
          </section>
        ) : null}
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
                <p className="phone-panel-kicker">{hostSetupStep === "mode" ? "Step 1 of 2" : "Step 2 of 2"} · Configure Expedition</p>
                <h1>{hostSetupStep === "mode" ? "Choose Mode" : "Choose Scenario"}</h1>
                {hostSetupStep === "mode" ? (
                  <>
                    <p className="phone-muted-copy">Choose how this expedition will be played.</p>
                    <section className="phone-host-mode-section" aria-labelledby="phone-setup-mode-title">
                  <div className="phone-host-scenario-heading">
                    <span id="phone-setup-mode-title">Mode</span>
                    <small>Only the Host Phone can change this.</small>
                  </div>
                  <div className="phone-host-mode-grid">
                    <button type="button" aria-label="Single Player" aria-pressed={selectedSetupMode === "single-player"} className={`phone-setup-mode-card ${selectedSetupMode === "single-player" ? "is-selected" : ""}`} onClick={() => setSelectedSetupMode("single-player")}>
                      <strong>Solo Run</strong><span>One operative. Shared scenario, no private agenda.</span>
                    </button>
                    <button type="button" aria-label="Multiplayer Co-op" aria-pressed={selectedSetupMode === "co-op"} className={`phone-setup-mode-card ${selectedSetupMode === "co-op" ? "is-selected" : ""}`} onClick={() => setSelectedSetupMode("co-op")}>
                      <strong>Co-op</strong><span>Operatives share the public victory condition.</span>
                    </button>
                    <button type="button" aria-pressed={selectedSetupMode === "rivalry"} className={`phone-setup-mode-card ${selectedSetupMode === "rivalry" ? "is-selected" : ""}`} onClick={() => setSelectedSetupMode("rivalry")}>
                      <strong>Rivalry</strong><span>Private agendas stay on their owners' phones.</span>
                    </button>
                    <button type="button" aria-pressed={selectedSetupMode === "nemesis"} className={`phone-setup-mode-card ${selectedSetupMode === "nemesis" ? "is-selected" : ""}`} onClick={() => setSelectedSetupMode("nemesis")}>
                      <strong>Nemesis Relay</strong><span>Limited competitive pursuit for up to four players.</span>
                    </button>
                  </div>
                    </section>
                    {selectedSetupMode && selectedSetupMode !== "single-player" ? (
                      <label className="field phone-host-player-count-picker">
                        <span>Players</span>
                        <select
                          aria-label="Players"
                          value={selectedSetupMode === "nemesis" ? Math.min(configuredPlayerCount, 4) : configuredPlayerCount}
                          onChange={(event) => setConfiguredPlayerCount(Number(event.target.value))}
                        >
                          {Array.from({ length: selectedSetupMode === "nemesis" ? 3 : 5 }, (_, index) => index + 2).map((count) => (
                            <option key={count} value={count}>{count} players</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="phone-button phone-button-primary phone-host-setup-confirm"
                      disabled={!selectedSetupMode}
                      onClick={() => setHostSetupStep("scenario")}
                    >
                      Continue to Scenario
                    </button>
                  </>
                ) : (
                  <>
                    <p className="phone-muted-copy">
                      Choose one compatible expedition for {selectedSetupMode === "single-player" ? "Solo Run" : selectedSetupMode === "co-op" ? "Co-op" : selectedSetupMode === "rivalry" ? "Rivalry" : "Nemesis Relay"}.
                    </p>
                    <section ref={hostScenarioPickerRef} className="phone-host-scenario-picker" aria-label="Choose scenario">
                  <div className="phone-host-scenario-heading">
                      <span>Scenario</span>
                      <small>Swipe to compare compatible expeditions.</small>
                  </div>
                  <div className="phone-host-scenario-carousel" role="radiogroup" aria-label="Scenario options">
                    {scenarios.map((scenario) => {
                      const selected = scenario.id === selectedScenarioId;
                      const available = isScenarioSelectable(scenario);
                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-disabled={!available}
                          disabled={!available}
                          className={`phone-host-scenario-card${selected ? " is-selected" : ""}`}
                          onClick={() => setSelectedScenarioId(scenario.id)}
                        >
                          <span
                            className={`phone-host-scenario-card-art${scenario.sheetArtPath ? "" : " phone-host-scenario-card-fallback"}`}
                            style={scenario.sheetArtPath ? { backgroundImage: `url(${scenario.sheetArtPath})` } : undefined}
                            aria-hidden="true"
                          >
                            {scenario.sheetArtPath ? null : "AR"}
                          </span>
                          <span className="phone-host-scenario-card-copy">
                            <small>{scenario.difficulty} · {scenario.expectedDuration}</small>
                            <strong>{scenario.name}</strong>
                            <span>{scenario.theme}</span>
                            <em>{scenario.publicDisplay?.objective ?? scenario.victoryText}</em>
                            <details><summary>How it changes play</summary><span>{scenario.pressureRule}</span></details>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                    </section>
                    <div className="phone-host-setup-actions">
                      <button type="button" className="phone-button" onClick={() => setHostSetupStep("mode")}>Back</button>
                      <button
                        type="button"
                        aria-label="Confirm Setup"
                        className="phone-button phone-button-primary phone-host-setup-confirm"
                        disabled={!selectedScenarioId || !selectedSetupMode || !selectedScenarioIsValid}
                        onClick={() => void handleConfigureLobby()}
                      >
                        Confirm Scenario
                      </button>
                    </div>
                  </>
                )}
                {(joinError || error) && <p className="error">{joinError ?? error}</p>}
              </section>
            </main>
          </div>
        </section>
        {leaveConfirmationDialog}
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
        {leaveConfirmationDialog}
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
            <main
              ref={characterSelectionScrollRef}
              className="phone-portrait-scroll phone-lobby-waiting-scroll phone-character-select-scroll"
              aria-label={setupSelectionStep === "piece" ? "Choose piece" : "Choose operative"}
            >
              <section
                ref={operativeSelectionRef}
                className={`phone-lobby-ready-panel phone-character-waiting-panel phone-character-select-surface phone-setup-step phone-setup-step--${setupSelectionStep}`}
              >
                <header className="phone-setup-step__header">
                  <div>
                    <span>{auth.displayName}</span>
                    <h1>{setupSelectionStep === "piece" ? "Choose Piece" : "Choose Operative"}</h1>
                  </div>
                  <div className="phone-setup-step__header-actions">
                    <small>{setupSelectionStep === "piece" ? "Step 1 of 3" : "Step 2 of 3"}</small>
                    {setupSelectionStep === "operative" ? (
                      <button
                        type="button"
                        className="phone-setup-step__back"
                        disabled={pendingCharacterId !== null}
                        onClick={() => setSetupSelectionStep("piece")}
                      >
                        Back to Pieces
                      </button>
                    ) : null}
                  </div>
                </header>
                {phonePatch.payload.lateJoinPending ? <p className="phone-panel-kicker">Join Game In Progress</p> : null}
                {setupSelectionStep === "piece" ? (
                  <>
                    <p className="phone-muted-copy">Choose the silhouette, symbol, and colour that identify you on the TV.</p>
                    <section className="phone-signal-piece-picker" aria-labelledby="phone-signal-piece-title">
                      <div className="phone-signal-piece-picker__heading">
                        <span id="phone-signal-piece-title">Your Signal piece</span>
                        <small>Player identity remains stable through movement, handoff, and reconnect.</small>
                      </div>
                      <div ref={signalPiecePickerRef} className="phone-signal-piece-picker__grid" role="radiogroup" aria-label="Signal piece">
                        {SIGNAL_PIECES.map((piece) => {
                          const selected = selectedSignalPieceId === piece.id;
                          const unavailable = takenSignalPieceIds.has(piece.id);
                          return (
                            <button
                              key={piece.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={unavailable}
                              tabIndex={selected && !unavailable ? 0 : -1}
                              data-signal-piece-id={piece.id}
                              className={`phone-signal-piece-option${selected ? " is-selected" : ""}`}
                              onClick={() => {
                                setSelectedSignalPieceId(piece.id);
                                setSignalPieceAnnouncement(`${piece.name} selected.`);
                                setJoinError(null);
                              }}
                              onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
                                const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
                                const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
                                if (!forward && !backward && event.key !== "Home" && event.key !== "End") return;
                                event.preventDefault();
                                const available = SIGNAL_PIECES.filter((candidate) => !takenSignalPieceIds.has(candidate.id));
                                const currentAvailableIndex = available.findIndex((candidate) => candidate.id === piece.id);
                                const target = event.key === "Home"
                                  ? available[0]
                                  : event.key === "End"
                                    ? available.at(-1)
                                    : available[
                                      (currentAvailableIndex + (forward ? 1 : -1) + available.length) % available.length
                                    ];
                                if (!target) return;
                                setSelectedSignalPieceId(target.id);
                                setSignalPieceAnnouncement(`${target.name} selected.`);
                                setJoinError(null);
                                signalPiecePickerRef.current
                                  ?.querySelector<HTMLButtonElement>(`[data-signal-piece-id="${target.id}"]`)
                                  ?.focus();
                              }}
                            >
                              <img src={getSignalPieceAssetPath(piece.id)} width={768} height={768} alt="" aria-hidden="true" />
                              <span>
                                <strong>{piece.name}</strong>
                                <small>{unavailable ? "In use at this table" : piece.shortDescription}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="phone-signal-piece-picker__status" role="status" aria-live="polite">{signalPieceAnnouncement}</p>
                    </section>
                    {(joinError || error) && <p className="error" role="alert">{joinError ?? error}</p>}
                    <div className="phone-setup-step__actions">
                      <button
                        type="button"
                        className="phone-button phone-button-primary"
                        onClick={() => {
                          if (takenSignalPieceIds.has(selectedSignalPieceId)) {
                            const replacement = getFirstAvailableSignalPiece(takenSignalPieceIds);
                            setSelectedSignalPieceId(replacement);
                            setSignalPieceAnnouncement(`${selectedSignalPieceId} became occupied. ${replacement} is now selected.`);
                            setJoinError("That Signal piece was just claimed. Review the replacement before continuing.");
                            return;
                          }
                          setJoinError(null);
                          setSetupSelectionStep("operative");
                        }}
                      >
                        Continue to Operative
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {phonePatch.payload.lateJoinPending ? (
                      <p className="phone-muted-copy">Choose an available operative, then select a starting mission before joining the turn order.</p>
                    ) : (
                      <p className="phone-muted-copy">Choose the operative you will control.</p>
                    )}
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
                      {displayCharacters.map((character) => {
                        const projectedOption = characterOptionById.get(character.id);
                        const unavailableReason = projectedOption?.eligible === false ? projectedOption.disabledReason : null;
                        return (
                        <button
                          key={character.id}
                          type="button"
                          className={`phone-character-option${pendingCharacterId === character.id ? " phone-character-option-selected" : ""}`}
                          disabled={pendingCharacterId !== null || Boolean(unavailableReason)}
                          title={unavailableReason ?? undefined}
                          aria-busy={pendingCharacterId === character.id ? "true" : undefined}
                          onClick={() => handleCharacterSelected(character.id)}
                        >
                          <img src={getCharacterPortraitPath(character.id)} alt="" />
                          <span>
                            <strong>{character.name}</strong>
                            {projectedOption?.developerQa ? <em>Developer QA operative</em> : null}
                            <small>{character.archetype}</small>
                            {character.presentation && (
                              <span className="phone-character-presentation" data-testid="phone-character-presentation">
                                <span className="phone-character-role-row">
                                  <small>{character.presentation.role}</small>
                                  <small>{formatComplexity(character.presentation.complexity)}</small>
                                  {character.presentation.recommendedForFirstGame ? <em>First-game pick</em> : null}
                                </span>
                                <small>{character.presentation.playstyleSummary}</small>
                                {character.lore ? <small className="phone-muted-copy">{character.lore}</small> : null}
                              </span>
                            )}
                            <small className="phone-character-select-label">
                              {pendingCharacterId === character.id ? "Selecting…" : unavailableReason ?? "Select operative"}
                            </small>
                          </span>
                        </button>
                        );
                      })}
                    </div>
                    {(joinError || error) && <p className="error" role="alert">{joinError ?? error}</p>}
                  </>
                )}
              </section>
            </main>
          </div>
        </section>
        {leaveConfirmationDialog}
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
            patchSequence={phonePatch?.sequence}
            serverError={error}
            connectionSynchronized={synchronized}
            characters={projectedCharacterOptions
              ? projectedCharacterOptions.filter((option) => option.eligible).map((option) => option.character)
              : characters}
            onIntent={canSendLobbyIntent ? sendIntent : null}
            onRequestResynchronize={resynchronize}
            onLeave={roomBackGuard.requestLeave}
            onLobbyBack={() => void backToCharacterSelect()}
            onStartSession={isSetupHost ? handleStartFromPhone : undefined}
            startSubmitting={startingGame}
          />
        )}

        {roomBackGuard.confirmationOpen ? (
          <section className="phone-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="phone-leave-dialog-title">
            <div>
              <span>Room safety</span>
              <h2 id="phone-leave-dialog-title">Leave the game?</h2>
              <p>Your operative will remain in the current room until the server processes your exit.</p>
              {roomBackGuard.leaveError ? <p className="error" role="alert">{roomBackGuard.leaveError}</p> : null}
              <div className="phone-leave-dialog__actions">
                <button type="button" className="phone-button phone-button-primary" autoFocus onClick={roomBackGuard.stayInGame}>Stay in Game</button>
                <button type="button" className="phone-button phone-button-danger" disabled={roomBackGuard.leaveSubmitting} onClick={() => void roomBackGuard.confirmLeave()}>
                  {roomBackGuard.leaveSubmitting ? "Leaving…" : "Leave Room"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {debugOpen && (
          <div className="phone-debug-anchor">
            <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} defaultOpen={debugOpen} />
          </div>
        )}
      </div>
    </main>
  );
}
