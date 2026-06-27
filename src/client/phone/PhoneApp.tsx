import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { fetchCharacters, joinSession, leaveSession } from "../shared/network.js";
import type { CharacterCatalogEntry, PhonePatchPayload, PhoneSessionAuth, StatePatch } from "../shared/types.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import {
  getCharacterPortraitPath,
  getPhoneBackgroundPath
} from "../shared/assetPaths.js";
import { MobileDebugDrawer } from "./MobileDebugDrawer.js";
import { PortraitControllerView } from "./PortraitControllerView.js";

const storageKey = "ashen-reach-phone-auth";

function readInitialRoomCode(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("roomCode")?.toUpperCase() ?? "";
}

function readStoredAuth(): PhoneSessionAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get("resetAuth") === "1") {
    window.localStorage.removeItem(storageKey);
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PhoneSessionAuth;
  } catch {
    return null;
  }
}

function writeStoredAuth(auth: PhoneSessionAuth | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(auth));
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function useLandscapeMode(): boolean {
  const getIsLandscape = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const orientationMatch =
      typeof window.matchMedia === "function" ? window.matchMedia("(orientation: landscape)").matches : false;

    return orientationMatch || window.innerWidth > window.innerHeight;
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
  const [formState, setFormState] = useState(() => ({
    roomCode: readInitialRoomCode(),
    displayName: "",
    characterId: "void-marshal"
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

    if (!/mismatch|rejoin/i.test(error)) {
      return;
    }

    setFormState((current) => ({
      ...current,
      roomCode: auth.roomCode
    }));
    setJoinError("Saved seat expired. Enter a room code to join again.");
    setAuth(null);
    writeStoredAuth(null);
  }, [auth, error]);

  const phonePatch =
    patch && "self" in patch.payload ? (patch as StatePatch<PhonePatchPayload>) : null;

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinError(null);
    setJoinStep("characterSelect");
  };

  const handleCharacterSelected = async (characterId: string) => {
    setJoinError(null);

    try {
      const nextAuth = await joinSession({
        roomCode: formState.roomCode.trim().toUpperCase(),
        displayName: formState.displayName.trim(),
        characterId
      });

      setFormState((current) => ({
        ...current,
        characterId,
        roomCode: nextAuth.roomCode
      }));
      setAuth(nextAuth);
      writeStoredAuth(nextAuth);
    } catch (joinFailure) {
      setJoinError(joinFailure instanceof Error ? joinFailure.message : "Join failed");
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
      <main className="phone-page" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
        <div className="phone-landscape-ui phone-join-layout">
          <section className="phone-join-hero phone-panel">
            <p className="phone-panel-kicker">Ashen Reach Controller</p>
            <h1>{joinStep === "nameEntry" ? "Join room" : "Select character"}</h1>
            <p className="phone-muted-copy">
              {joinStep === "nameEntry"
                ? "Enter the room code and your player name before choosing a character."
                : "Pick one operative. After selection, the character is locked until you press Back."}
            </p>
            {selectedCharacter && (
              <div className="phone-character-preview">
                <img src={getCharacterPortraitPath(selectedCharacter.id)} alt="" />
                <div>
                  <h2>{selectedCharacter.name}</h2>
                  <p>{selectedCharacter.archetype}</p>
                  <div className="phone-character-stat-row" aria-label="Selected character stats">
                    <span>Command {selectedCharacter.stats.command}</span>
                    <span>Grit {selectedCharacter.stats.grit}</span>
                    <span>Signal {selectedCharacter.stats.signal}</span>
                    <span>Guile {selectedCharacter.stats.guile}</span>
                    <span>Forge {selectedCharacter.stats.forge}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="phone-panel phone-join-panel">
            <div className="phone-panel-header">
              <div>
                <h2>{joinStep === "nameEntry" ? "Join Room" : "Choose Character"}</h2>
                <p className="phone-muted-copy">
                  {joinStep === "nameEntry"
                    ? "Step 1: enter room code and player name."
                    : "Step 2: select an available character to reserve it."}
                </p>
              </div>
            </div>
            {joinStep === "nameEntry" ? (
              <form className="phone-join-form" onSubmit={handleNameSubmit}>
                <section className="phone-join-step" aria-label="Step 1 enter room code and name">
                  <span className="phone-join-step-kicker">Step 1</span>
                  <label className="field">
                    <span>Room code</span>
                    <input
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
                  <button className="phone-button phone-button-primary" type="submit">
                    Continue
                  </button>
                  {debugOpen && <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} />}
                </div>
              </form>
            ) : (
              <div className="phone-join-form">
                <div className="phone-join-step" aria-label="Step 2 select character">
                  <span className="phone-join-step-kicker">Step 2</span>
                  <div className="phone-character-grid" role="list" aria-label="Character">
                    {characters.map((character) => (
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
                        </span>
                      </button>
                    ))}
                  </div>
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
      </main>
    );
  }

  const self = phonePatch?.payload.self ?? null;
  const activeSeatId = phonePatch?.payload.turnOrder[phonePatch.payload.activeSeatIndex] ?? null;
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
            onIntent={phonePatch ? sendIntent : null}
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
