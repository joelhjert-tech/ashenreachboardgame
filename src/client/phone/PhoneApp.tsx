import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { fetchCharacters, joinSession } from "../shared/network.js";
import { getPhoneAbilityTelemetry } from "../shared/abilityTelemetry.js";
import type { CharacterCatalogEntry, PhonePatchPayload, PhoneSessionAuth, StatePatch } from "../shared/types.js";
import { useRoomSubscription } from "../shared/useRoomSubscription.js";
import {
  getCharacterPortraitPath,
  getPhoneBackgroundPath
} from "../shared/assetPaths.js";
import { MobileDebugDrawer } from "./MobileDebugDrawer.js";
import { LandscapeCharacterCardView } from "./LandscapeCharacterCardView.js";
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
  const previousPhonePatchRef = useRef<PhonePatchPayload | null>(null);

  useEffect(() => {
    if (phonePatch?.payload) {
      previousPhonePatchRef.current = phonePatch.payload;
    }
  }, [phonePatch]);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinError(null);

    try {
      const nextAuth = await joinSession({
        roomCode: formState.roomCode.trim().toUpperCase(),
        displayName: formState.displayName.trim(),
        characterId: formState.characterId
      });

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
            <h1>Claim your seat</h1>
            <p className="phone-muted-copy">Pick an operative, join the room, and play from the controller view that fits your hand.</p>
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
                <h2>Join Room</h2>
                <p className="phone-muted-copy">Enter the room code, choose a callsign, and select a character.</p>
              </div>
            </div>
            <form className="phone-join-form" onSubmit={handleJoin}>
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
                <span>Display name</span>
                <input
                  value={formState.displayName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, displayName: event.target.value }))
                  }
                  placeholder="Seat name"
                  required
                />
              </label>
              <fieldset className="phone-character-picker">
                <legend>Character</legend>
                <div className="phone-character-grid" role="radiogroup" aria-label="Character">
                  {characters.map((character) => (
                    <label
                      key={character.id}
                      className={`phone-character-option${formState.characterId === character.id ? " phone-character-option-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="characterId"
                        value={character.id}
                        checked={formState.characterId === character.id}
                        onChange={() => setFormState((current) => ({ ...current, characterId: character.id }))}
                      />
                      <img src={getCharacterPortraitPath(character.id)} alt="" />
                      <span>
                        <strong>{character.name}</strong>
                        <small>{character.archetype}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {(joinError || error) && <p className="error">{joinError ?? error}</p>}
              <div className="phone-join-actions">
                <button className="phone-button phone-button-primary" type="submit">
                  Join room
                </button>
                {debugOpen && <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} />}
              </div>
            </form>
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
  const abilityTelemetry = getPhoneAbilityTelemetry(phonePatch?.payload ?? null, previousPhonePatchRef.current);

  return (
    <main className="phone-page phone-page-controller">
      <div className={`phone-controller-layout${isLandscape ? " phone-controller-layout-landscape" : ""}`}>
        {isLandscape ? (
          <LandscapeCharacterCardView
            self={self}
            activeContractCard={activeContractCard ?? null}
            roomCode={auth.roomCode}
            displayName={auth.displayName}
            connectionStatus={status}
            sessionStatus={phonePatch?.payload.status ?? null}
            phase={phonePatch?.phase ?? "start"}
            activeSeatId={activeSeatId}
            activeNemesis={phonePatch?.payload.nemesis ?? null}
            encounter={phonePatch?.payload.encounter ?? null}
            outcomeSummary={phonePatch?.payload.outcomeSummary ?? null}
            latestAbilityTriggerSummary={abilityTelemetry.latestTrigger?.summary ?? null}
            abilityChangeItems={abilityTelemetry.changes}
            characters={characters}
            patch={phonePatch?.payload ?? null}
            onIntent={phonePatch ? sendIntent : null}
            onLeave={clearSession}
          />
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
          />
        )}

        <div className="phone-debug-anchor">
          <MobileDebugDrawer events={debugEvents} onClear={clearDebugEvents} defaultOpen={debugOpen} />
        </div>
      </div>
    </main>
  );
}
