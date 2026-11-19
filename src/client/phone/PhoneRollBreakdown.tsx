import type { ReactElement } from "react";

interface PhoneRollBreakdownProps {
  label: string;
  dice: number[];
  diceTotal: number | null;
  fixedValue?: number | null;
  total: number;
  target?: number | null;
  targetLabel?: string;
}

export function PhoneRollBreakdown({
  label,
  dice,
  diceTotal,
  fixedValue,
  total,
  target,
  targetLabel = "Target"
}: PhoneRollBreakdownProps): ReactElement {
  return (
    <section className="phone-roll-breakdown" role="group" aria-label={label}>
      <h3>{label}</h3>
      <dl>
        {diceTotal !== null ? (
          <div>
            <dt>Dice</dt>
            <dd>
              {diceTotal}
              {dice.length > 1 ? <small>{dice.join(" + ")}</small> : null}
            </dd>
          </div>
        ) : null}
        {fixedValue != null ? (
          <div>
            <dt>Skill + effects</dt>
            <dd>{fixedValue < 0 ? `−${Math.abs(fixedValue)}` : `+${fixedValue}`}</dd>
          </div>
        ) : null}
        <div className="phone-roll-breakdown__total">
          <dt>Total</dt>
          <dd>{total}</dd>
        </div>
        {target != null ? (
          <div>
            <dt>{targetLabel}</dt>
            <dd>{target}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
