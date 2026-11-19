import { useId, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
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

export function PhoneInspectableCardArt({ cardType, cardId, title, lore = null, rules = null, className = "", testId }: PhoneInspectableCardArtProps): ReactElement {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!open || !dialog) return;

    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
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
      {open && typeof document !== "undefined" ? createPortal(
        <dialog
          ref={dialogRef}
          className="phone-card-inspect"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const first = closeRef.current;
            const last = copyRef.current ?? first;
            if (document.activeElement !== (event.shiftKey ? first : last)) return;
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            className="phone-card-inspect__backdrop"
            aria-label={`Close ${title} inspection`}
            onClick={() => setOpen(false)}
          />
          <section className="phone-card-inspect__panel">
            <header>
              <div><span>Card archive</span><h2 id={titleId}>{title}</h2></div>
              <button type="button" ref={closeRef} className="phone-card-inspect__close" onClick={() => setOpen(false)}>Close</button>
            </header>
            <div className="phone-card-inspect__art-frame">
              <CardArtImage cardType={cardType} cardId={cardId} quality="full" loading="eager" alt={`${title} full card artwork`} />
            </div>
            {(lore || rules) ? (
              <div ref={copyRef} className="phone-card-inspect__copy" role="region" aria-label="Card text" tabIndex={0}>
                {lore ? <p className="phone-card-inspect__lore">{lore}</p> : null}
                {rules ? <p className="phone-card-inspect__rules">{rules}</p> : null}
              </div>
            ) : null}
          </section>
        </dialog>,
        document.body
      ) : null}
    </>
  );
}
