import type { ReactElement, ReactNode } from "react";

export type PhoneWrappedMediaCardVariant = "inventory" | "shop" | "movement" | "action";

interface PhoneWrappedMediaCardProps {
  variant: PhoneWrappedMediaCardVariant;
  className?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  status?: ReactNode;
  costValue?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  tags?: ReactNode;
  imageSrc?: string | null;
  imageAlt?: string;
  media?: ReactNode;
  fallbackIcon?: ReactNode;
  actions?: ReactNode;
  disabledReason?: ReactNode;
  ariaLabel?: string;
  role?: string;
  testId?: string;
  dataState?: string;
}

export function PhoneWrappedMediaCard({
  variant,
  className = "",
  title,
  eyebrow,
  status,
  costValue,
  description,
  meta,
  tags,
  imageSrc,
  imageAlt = "",
  media,
  fallbackIcon,
  actions,
  disabledReason,
  ariaLabel,
  role,
  testId,
  dataState
}: PhoneWrappedMediaCardProps): ReactElement {
  return (
    <article
      className={["phone-wrap-card", `phone-wrap-card--${variant}`, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      role={role}
      data-testid={testId}
      data-wrap-card-variant={variant}
      data-wrap-card-state={dataState}
      data-inventory-state={dataState}
    >
      <div className="phone-wrap-card__media" aria-hidden="true">
        {media ?? (
          imageSrc ? (
            <img className="phone-wrap-card__image" src={imageSrc} alt={imageAlt} />
          ) : (
            <div className="phone-wrap-card__fallback">{fallbackIcon ?? "AR"}</div>
          )
        )}
      </div>

      <div className="phone-wrap-card__body">
        <div className="phone-wrap-card__heading">
          <div className="phone-wrap-card__title-block">
            <h3 className="phone-wrap-card__title">{title}</h3>
            {eyebrow ? <span className="phone-wrap-card__eyebrow">{eyebrow}</span> : null}
          </div>
          {costValue ? <span className="phone-wrap-card__cost">{costValue}</span> : null}
        </div>
        {status ? <div className="phone-wrap-card__status">{status}</div> : null}
        {description ? <div className="phone-wrap-card__description">{description}</div> : null}
        {disabledReason ? <div className="phone-wrap-card__disabled-reason">{disabledReason}</div> : null}
      </div>

      {actions ? <div className="phone-wrap-card__actions">{actions}</div> : null}
      {tags ? <div className="phone-wrap-card__tags phone-wrap-card__details">{tags}</div> : null}
      {meta ? <div className="phone-wrap-card__meta phone-wrap-card__details">{meta}</div> : null}
    </article>
  );
}
