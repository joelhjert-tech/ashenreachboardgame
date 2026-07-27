import { useEffect, useMemo, useState, type ReactElement } from "react";
import { MISSION_RELIC_EXCHANGE_COST, MAX_ACTIVE_MISSIONS } from "../../game/rules/missionLifecycle.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { PhoneOptimizedImage } from "../shared/PhoneOptimizedImage.js";
import { GameButton } from "../shared/GameButton.js";
import { getInventoryCategoryIconPath } from "../shared/assetPaths.js";
import type { ClientIntent, ContractCard, PhonePatchPayload } from "../shared/types.js";

interface PhoneMissionRelicExchangeProps {
  patch: PhonePatchPayload;
  onIntent: ((intent: ClientIntent) => void) | null;
}

type ExchangeStep = "archive" | "select" | "relic";

function resolveMission(patch: PhonePatchPayload, missionId: string): ContractCard | null {
  return patch.availableContracts.find((contract) => contract.id === missionId) ?? null;
}

export function PhoneMissionRelicExchange({
  patch,
  onIntent
}: PhoneMissionRelicExchangeProps): ReactElement | null {
  const self = patch.self;
  const exchange = patch.pendingMissionRelicExchange ?? null;
  const [step, setStep] = useState<ExchangeStep>(exchange ? "relic" : "archive");
  const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    exchange?.options[0]?.id ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  const unspentMissionIds = useMemo(() => {
    if (!self) return [];
    const recordsById = new Map(
      (self.character.completedMissionRecords ?? []).map((record) => [record.missionId, record])
    );
    return (self.character.completedContracts ?? []).filter(
      (missionId) => recordsById.get(missionId)?.spent !== true
    );
  }, [self]);
  const activeMissionCount =
    self?.character.activeContracts?.length ??
    (self?.character.activeContract ? 1 : 0);
  const completedRecords = self?.character.completedMissionRecords ?? [];
  const spentRecords = completedRecords.filter((record) => record.spent);

  useEffect(() => {
    if (!exchange) return;
    setStep("relic");
    setSelectedArtifactId((current) =>
      exchange.options.some((option) => option.id === current)
        ? current
        : exchange.options[0]?.id ?? null
    );
    setSubmitting(false);
  }, [exchange]);

  useEffect(() => {
    if (exchange || step !== "relic") return;
    setStep("archive");
    setSelectedMissionIds([]);
    setSelectedArtifactId(null);
    setSubmitting(false);
  }, [exchange, step]);

  if (!self) return null;

  const startSelection = (): void => {
    setSelectedMissionIds(unspentMissionIds.slice(0, MISSION_RELIC_EXCHANGE_COST));
    setStep("select");
  };
  const toggleMission = (missionId: string): void => {
    setSelectedMissionIds((current) => {
      if (current.includes(missionId)) return current.filter((id) => id !== missionId);
      if (current.length >= MISSION_RELIC_EXCHANGE_COST) return current;
      return [...current, missionId];
    });
  };
  const offerSelectedMissions = (): void => {
    if (!onIntent || selectedMissionIds.length !== MISSION_RELIC_EXCHANGE_COST || submitting) return;
    setSubmitting(true);
    onIntent({
      type: "OPEN_MISSION_RELIC_EXCHANGE",
      seatId: self.seatId,
      missionIds: selectedMissionIds
    });
  };
  const claimSelectedRelic = (): void => {
    if (!onIntent || !exchange || !selectedArtifactId || submitting) return;
    setSubmitting(true);
    onIntent({
      type: "CLAIM_MISSION_RELIC",
      seatId: self.seatId,
      exchangeId: exchange.id,
      artifactId: selectedArtifactId
    });
  };

  return (
    <section
      className="phone-mission-exchange"
      aria-label="Completed Contract ledger and Relic exchange"
      data-step={step}
      data-testid="phone-mission-relic-exchange"
    >
      <div className="phone-mission-exchange__steps" aria-label="Relic exchange progress">
        {(["archive", "select", "relic"] as const).map((entry, index) => (
          <span
            key={entry}
            className={
              step === entry
                ? "is-current"
                : (["archive", "select", "relic"] as const).indexOf(step) > index
                  ? "is-done"
                  : ""
            }
          >
            <b>{index + 1}</b>
            {entry === "archive" ? "Archive" : entry === "select" ? "Offer" : "Relic"}
          </span>
        ))}
      </div>

      {step === "archive" ? (
        <>
          <div className="phone-mission-capacity">
            <div>
              <span>Active Missions</span>
              <strong>{activeMissionCount < MAX_ACTIVE_MISSIONS ? "A path remains open" : "Mission capacity full"}</strong>
            </div>
            <em>{activeMissionCount} <small>/ {MAX_ACTIVE_MISSIONS}</small></em>
            <div className="phone-mission-capacity__slots" aria-label={`${activeMissionCount} of ${MAX_ACTIVE_MISSIONS} Mission slots occupied`}>
              {Array.from({ length: MAX_ACTIVE_MISSIONS }, (_, index) => (
                <i key={index} className={index < activeMissionCount ? "is-filled" : ""} />
              ))}
            </div>
            {(patch.heldMissionRewardCount ?? 0) > 0 ? (
              <p>{patch.heldMissionRewardCount} Mission reward{patch.heldMissionRewardCount === 1 ? " is" : "s are"} held until a slot opens.</p>
            ) : (
              <p>Mission rewards from secured transit tiles and marked enemy battles fill open slots.</p>
            )}
          </div>

          <div className="phone-mission-reliquary" aria-label={`${unspentMissionIds.length} completed Missions available`}>
            <span className="phone-mission-reliquary__socket phone-mission-reliquary__socket--left">I</span>
            <span className="phone-mission-reliquary__socket phone-mission-reliquary__socket--right">II</span>
            <span className="phone-mission-reliquary__socket phone-mission-reliquary__socket--bottom">III</span>
            <div className="phone-mission-reliquary__aperture">
              <PhoneOptimizedImage
                src={getInventoryCategoryIconPath("artifacts")}
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                decoding="async"
              />
            </div>
          </div>

          <div className="phone-mission-exchange__status">
            <strong>{unspentMissionIds.length >= MISSION_RELIC_EXCHANGE_COST ? "Relic exchange ready" : "Archive more Missions"}</strong>
            <span>{Math.min(unspentMissionIds.length, MISSION_RELIC_EXCHANGE_COST)} / {MISSION_RELIC_EXCHANGE_COST} required · {unspentMissionIds.length} unspent</span>
          </div>
          {unspentMissionIds.length > 0 ? (
            <ul className="phone-mission-exchange__archive" aria-label="Unspent completed Missions">
              {unspentMissionIds.map((missionId) => (
                <li key={missionId}>
                  <span>Completed</span>
                  <strong>{resolveMission(patch, missionId)?.name ?? "Archived Mission"}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="phone-mission-exchange__support">Active Missions are never spent. Exchanged records remain visible in Mission history.</p>
          <GameButton
            type="button"
            tone="action"
            className="phone-mission-exchange__primary"
            disabled={unspentMissionIds.length < MISSION_RELIC_EXCHANGE_COST || !onIntent}
            disabledReason={unspentMissionIds.length < MISSION_RELIC_EXCHANGE_COST ? `Complete ${MISSION_RELIC_EXCHANGE_COST - unspentMissionIds.length} more Mission${MISSION_RELIC_EXCHANGE_COST - unspentMissionIds.length === 1 ? "" : "s"}.` : undefined}
            onClick={startSelection}
          >
            Open Relic Exchange
          </GameButton>
          {spentRecords.length > 0 ? (
            <details className="phone-mission-exchange__history">
              <summary>Spent Mission history ({spentRecords.length})</summary>
              <ul>
                {spentRecords.map((record) => (
                  <li key={`${record.missionId}:${record.completedAtSequence}`}>
                    {resolveMission(patch, record.missionId)?.name ?? "Archived Mission"}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}

      {step === "select" ? (
        <>
          <header className="phone-mission-exchange__heading">
            <span>Offer to the Reliquary</span>
            <h3>Select three completed Missions</h3>
            <p>Spent Missions stay visible in your history.</p>
          </header>
          <div className="phone-mission-exchange__mission-list" role="group" aria-label="Completed Missions">
            {unspentMissionIds.map((missionId, index) => {
              const mission = resolveMission(patch, missionId);
              const selectedIndex = selectedMissionIds.indexOf(missionId);
              const selected = selectedIndex >= 0;
              return (
                <button
                  key={missionId}
                  type="button"
                  className={`phone-mission-exchange__mission${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleMission(missionId)}
                >
                  <CardArtImage cardType="contract" cardId={missionId} alt="" />
                  <span>
                    <small>Completed Mission</small>
                    <strong>{mission?.name ?? `Archived Mission ${index + 1}`}</strong>
                    <em>{selected ? `Seal ${["I", "II", "III"][selectedIndex]} selected` : "Remains in archive"}</em>
                  </span>
                  <i aria-hidden="true">{selected ? "✓" : "+"}</i>
                </button>
              );
            })}
          </div>
          <div className="phone-mission-exchange__actions">
            <button type="button" onClick={() => setStep("archive")}>Back</button>
            <GameButton
              type="button"
              tone="action"
              disabled={selectedMissionIds.length !== MISSION_RELIC_EXCHANGE_COST || submitting || !onIntent}
              onClick={offerSelectedMissions}
            >
              {submitting ? "Holding Relic Offer..." : `Offer ${MISSION_RELIC_EXCHANGE_COST} Mission Seals`}
            </GameButton>
          </div>
        </>
      ) : null}

      {step === "relic" && exchange ? (
        <>
          <header className="phone-mission-exchange__heading">
            <span>One exchange · one choice</span>
            <h3>The Reliquary Answers</h3>
            <p>The server holds both offers until you confirm.</p>
          </header>
          <div className="phone-mission-exchange__relics" role="radiogroup" aria-label="Relic choices">
            {exchange.options.map((artifact) => {
              const selected = artifact.id === selectedArtifactId;
              return (
                <button
                  key={artifact.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`phone-mission-exchange__relic${selected ? " is-selected" : ""}`}
                  onClick={() => setSelectedArtifactId(artifact.id)}
                >
                  <div>
                    <CardArtImage cardType="artifact" cardId={artifact.id} alt={artifact.name} />
                    {selected ? <span>Selected</span> : null}
                  </div>
                  <small>Relic · {artifact.slot}</small>
                  <strong>{artifact.name}</strong>
                  <p>{artifact.activeText ?? artifact.flavor ?? `Permanent ${artifact.statBonus.stat} +${artifact.statBonus.amount}.`}</p>
                </button>
              );
            })}
          </div>
          <p className="phone-mission-exchange__warning">
            <b>III</b>
            <span><strong>Three Mission cards will be marked spent.</strong> This cannot be undone after confirmation.</span>
          </p>
          <div className="phone-mission-exchange__actions">
            <button type="button" onClick={() => setStep("select")}>Back</button>
            <GameButton
              type="button"
              tone="action"
              disabled={!selectedArtifactId || submitting || !onIntent}
              onClick={claimSelectedRelic}
            >
              {submitting ? "Claiming Relic..." : "Claim Selected Relic"}
            </GameButton>
          </div>
        </>
      ) : null}
    </section>
  );
}
