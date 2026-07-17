import { useEffect, useId, useState, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { CardArtImage } from "../shared/CardArtImage.js";

interface PhoneInspectableCardArtProps {
  cardType: CardImageType;
  cardId: string | null | undefined;
  title: string;
  lore?: string | null;
  rules?: string | null;
  className?: string;
  testId?: string;
}

export function PhoneInspectableCardArt({
  cardType,
  cardId,
  title,
  lore = null,
  rules = null,
  className = "",
  testId
}: PhoneInspectableCardArtProps): ReactElement {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="phone-card-inspect-trigger"
        aria-label={`Inspect ${title}`}
        data-testid={testId ? `${testId}-inspect` : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <CardArtImage cardType={cardType} cardId={cardId} alt={title} className={className} data-testid={testId} />
        <span className="phone-card-inspect-trigger__hint">Inspect</span>
      </button>

      {open ? (
        <div
          className="phone-card-inspect"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="phone-card-inspect__backdrop"
            aria-label={`Close ${title} inspection`}
            onClick={() => setOpen(false)}
          />
          <section className="phone-card-inspect__panel">
            <header>
              <div>
                <span>Card archive</span>
                <h2 id={titleId}>{title}</h2>
              </div>
              <button type="button" className="phone-card-inspect__close" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>
            <div className="phone-card-inspect__art-frame">
              <CardArtImage cardType={cardType} cardId={cardId} alt={`${title} full card artwork`} />
            </div>
            {(lore || rules) ? (
              <div className="phone-card-inspect__copy">
                {lore ? <p className="phone-card-inspect__lore">{lore}</p> : null}
                {rules ? <p className="phone-card-inspect__rules">{rules}</p> : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
