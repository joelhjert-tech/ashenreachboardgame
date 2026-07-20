import { useEffect, useRef, useState, type ReactElement, type TouchEvent } from "react";
import type { ScarSummary } from "../shared/types.js";
import { CardArtImage } from "../shared/CardArtImage.js";

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
      <p>{source[0]?.toUpperCase()}{source.slice(1)} source · Permanent cursed adaptation</p>
      <div className="scar-prototype__threshold">
        <strong>{currentCount} / 3 Scars</strong>
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
    <div className="scar-prototype__art">
      <CardArtImage cardType="scar" cardId={scar.id} alt={`${scar.title} Scar artwork`} />
      <span>{sourceSigil(scar.source)}</span>
    </div>
  );
}

function ComparePanel({ cards, onClose }: { cards: ScarSummary[]; onClose: () => void }): ReactElement {
  return (
    <div className="scar-prototype__compare" role="dialog" aria-modal="true" aria-label="Compare both Scars">
      <header><strong>Compare Both Scars</strong><button type="button" onClick={onClose}>Close</button></header>
      <div>
        {cards.map((scar) => (
          <article key={scar.id}>
            <h3>{scar.title}</h3>
            <ScarEffects scar={scar} />
            <p className="scar-prototype__compare-lore">{scar.origin ?? scar.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PhoneScarSelector({ cards, source, currentCount, thresholdWarning, onChoose }: PhoneScarSelectorProps): ReactElement {
  const [index, setIndex] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [status, setStatus] = useState<AcceptScarButtonStatus>("available");
  const touchStartX = useRef<number | null>(null);
  const scar = cards[index] ?? cards[0];

  useEffect(() => {
    if (index >= cards.length) setIndex(0);
    setStatus("available");
  }, [cards, index]);

  if (!scar) return <p className="scar-prototype__empty">No Scar candidates are available.</p>;
  const move = (offset: number): void => setIndex((current) => (current + offset + cards.length) % cards.length);
  const onTouchEnd = (event: TouchEvent<HTMLElement>): void => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const end = event.changedTouches[0]?.clientX ?? start;
    if (Math.abs(end - start) < 42) return;
    move(end < start ? 1 : -1);
  };

  return (
    <section
      className="scar-prototype scar-prototype--carousel"
      aria-label="Focused Scar carousel"
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={onTouchEnd}
    >
      <ScarSelectorHeader source={source} currentCount={currentCount} thresholdWarning={thresholdWarning} />
      <div className="scar-carousel__position">
        <span>{index + 1} of {cards.length}</span>
        <div>{cards.map((candidate, cardIndex) => <i key={candidate.id} data-active={cardIndex === index ? "true" : "false"} />)}</div>
      </div>
      <div className="scar-carousel__stage">
        <button type="button" className="scar-carousel__arrow scar-carousel__arrow--previous" aria-label="Previous Scar" onClick={() => move(-1)}>‹</button>
        <article className="scar-carousel__card" key={scar.id}>
          <ScarArt scar={scar} />
          <div className="scar-carousel__identity"><span>{(scar.source ?? source).toUpperCase()} Scar</span><h3>{scar.title}</h3></div>
          <ScarEffects scar={scar} />
        </article>
        <button type="button" className="scar-carousel__arrow scar-carousel__arrow--next" aria-label="Next Scar" onClick={() => move(1)}>›</button>
      </div>
      <div className="scar-prototype__action-dock">
        <AcceptScarButton
          scarName={scar.title}
          scarSource={scar.source ?? source}
          thresholdWarning={thresholdWarning}
          status={status}
          onConfirm={() => {
            if (status !== "available" && status !== "reconnect-restored") return;
            setStatus("confirming");
            onChoose(scar.id);
          }}
        />
        <button type="button" className="scar-prototype__compare-action" onClick={() => setCompareOpen(true)}>Compare both</button>
        <span>Scar choice required</span>
      </div>
      {compareOpen ? <ComparePanel cards={cards} onClose={() => setCompareOpen(false)} /> : null}
    </section>
  );
}
