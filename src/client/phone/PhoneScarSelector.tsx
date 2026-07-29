import { useState, type ReactElement } from "react";
import type { ScarSummary } from "../shared/types.js";
import { PhoneInspectableCardArt } from "./PhoneInspectableCardArt.js";

export type AcceptScarButtonStatus = "available" | "confirming" | "network-pending" | "reconnect-restored" | "submitted";

interface AcceptScarButtonProps {
  scarName: string;
  scarSource: ScarSummary["source"];
  thresholdWarning: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  status?: AcceptScarButtonStatus;
  onConfirm: () => void;
}

interface PhoneScarSelectorProps {
  cards: ScarSummary[];
  source: NonNullable<ScarSummary["source"]>;
  currentCount: number;
  thresholdWarning: boolean;
  onChoose: (scarId: string) => void;
}

function sourceSigil(source: ScarSummary["source"]): string {
  switch (source) {
    case "flesh": return "✢";
    case "mind": return "◈";
    case "machine": return "⌬";
    case "rift": return "◇";
    default: return "✣";
  }
}

export function AcceptScarButton({
  scarName,
  scarSource,
  thresholdWarning,
  disabled = false,
  disabledReason = null,
  status = "available",
  onConfirm
}: AcceptScarButtonProps): ReactElement {
  const pending = status === "confirming" || status === "network-pending" || status === "submitted";
  const blocked = disabled || pending;
  const supportingLine = disabled && disabledReason
    ? disabledReason
    : thresholdWarning
      ? "Warning — this will break the operative."
      : status === "reconnect-restored"
        ? "Choice restored. This Scar is permanent."
        : pending
          ? "Binding the Scar to the operative…"
          : "This Scar is permanent.";

  return (
    <button
      type="button"
      className="accept-scar-button"
      data-source={scarSource ?? "unbound"}
      data-status={status}
      disabled={blocked}
      aria-disabled={blocked}
      aria-busy={pending || undefined}
      title={disabledReason ?? undefined}
      onClick={onConfirm}
    >
      <span className="accept-scar-button__fracture" aria-hidden="true" />
      <span className="accept-scar-button__sigil" aria-hidden="true">{sourceSigil(scarSource)}</span>
      <span className="accept-scar-button__copy">
        <strong>{pending ? "Binding Scar" : `Accept ${scarName}`}</strong>
        <small>{supportingLine}</small>
      </span>
      <span className="accept-scar-button__seal" aria-hidden="true">⌁</span>
    </button>
  );
}

function ScarSelectorHeader({ source, currentCount, thresholdWarning }: Pick<PhoneScarSelectorProps, "source" | "currentCount" | "thresholdWarning">): ReactElement {
  return (
    <header className="scar-prototype__header">
      <span>The Wound Did Not Close</span>
      <h2>Choose Your Scar</h2>
      <p>Compare both permanent choices. Read the burden and adaptation before accepting one.</p>
      <div className="scar-prototype__threshold">
        <strong>{source[0]?.toUpperCase()}{source.slice(1)} source · {currentCount} / 3 Scars</strong>
        {thresholdWarning ? <span>Threshold warning · Your next Scar will break this operative.</span> : null}
      </div>
    </header>
  );
}

function ScarEffects({ scar }: { scar: ScarSummary }): ReactElement {
  const burden = scar.burdenText ?? scar.penalty;
  const adaptation = scar.adaptationText ?? scar.upside ?? "No adaptation authored.";
  return (
    <div className="scar-prototype__effects">
      <section className="scar-prototype__effect scar-prototype__effect--burden">
        <span><i aria-hidden="true">×</i> Burden</span>
        <p>{burden}</p>
      </section>
      <section className="scar-prototype__effect scar-prototype__effect--adaptation">
        <span><i aria-hidden="true">◆</i> Adaptation</span>
        <p>{adaptation}</p>
      </section>
    </div>
  );
}

function ScarArt({ scar }: { scar: ScarSummary }): ReactElement {
  return (
    <div className="scar-choice-card__art">
      <PhoneInspectableCardArt
        cardType="scar"
        cardId={scar.id}
        title={scar.title}
        lore={scar.origin ?? scar.text}
        rules={`Burden: ${scar.burdenText ?? scar.penalty} Adaptation: ${scar.adaptationText ?? scar.upside ?? "No adaptation authored."}`}
        className="scar-choice-card__image"
        testId={`phone-scar-choice-art-${scar.id}`}
      />
      <span aria-hidden="true">{sourceSigil(scar.source)}</span>
    </div>
  );
}

function ScarChoiceCard({
  scar,
  optionLabel,
  thresholdWarning,
  pendingScarId,
  onChoose
}: {
  scar: ScarSummary;
  optionLabel: string;
  thresholdWarning: boolean;
  pendingScarId: string | null;
  onChoose: (scarId: string) => void;
}): ReactElement {
  const pending = pendingScarId === scar.id;
  const anotherPending = pendingScarId !== null && !pending;

  return (
    <article className="scar-choice-card" data-source={scar.source ?? "unbound"}>
      <div className="scar-choice-card__visual">
        <span className="scar-choice-card__option">{optionLabel}</span>
        <ScarArt scar={scar} />
      </div>
      <div className="scar-choice-card__body">
        <div className="scar-choice-card__identity">
          <span>{(scar.source ?? "unbound").toUpperCase()} Scar</span>
          <h3>{scar.title}</h3>
        </div>
        <ScarEffects scar={scar} />
      </div>
      <div className="scar-choice-card__accept">
        <AcceptScarButton
          scarName={scar.title}
          scarSource={scar.source}
          thresholdWarning={thresholdWarning}
          disabled={anotherPending}
          disabledReason={anotherPending ? "Another Scar is being bound." : null}
          status={pending ? "confirming" : "available"}
          onConfirm={() => onChoose(scar.id)}
        />
      </div>
    </article>
  );
}

export function PhoneScarSelector({ cards, source, currentCount, thresholdWarning, onChoose }: PhoneScarSelectorProps): ReactElement {
  const [pendingScarId, setPendingScarId] = useState<string | null>(null);

  if (cards.length === 0) return <p className="scar-prototype__empty">No Scar candidates are available.</p>;
  const choose = (scarId: string): void => {
    if (pendingScarId !== null) return;
    setPendingScarId(scarId);
    onChoose(scarId);
  };

  return (
    <section
      className="scar-prototype scar-prototype--compare"
      aria-label="Compare Scar choices"
    >
      <ScarSelectorHeader source={source} currentCount={currentCount} thresholdWarning={thresholdWarning} />
      <div className="scar-choice-guide" role="note">
        <strong>Compare both</strong>
        <span>Tap either image to inspect the full artwork.</span>
      </div>
      <div className="scar-choice-grid">
        {cards.map((scar, index) => (
          <ScarChoiceCard
            key={scar.id}
            scar={scar}
            optionLabel={`Choice ${String.fromCharCode(65 + index)}`}
            thresholdWarning={thresholdWarning}
            pendingScarId={pendingScarId}
            onChoose={choose}
          />
        ))}
      </div>
      <footer className="scar-prototype__required">Scar choice required</footer>
    </section>
  );
}
