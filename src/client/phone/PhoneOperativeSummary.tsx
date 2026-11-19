import type { ReactElement } from "react";
import { getEquippedGearItem } from "../../game/engine/gear.js";
import { gearSlotLabelById, statLabelById } from "../shared/statLabels.js";
import type { GearItem, GearSlot, PhonePatchPayload, PhoneSelfState } from "../shared/types.js";
import { formatSignedStatBonus } from "./statBreakdown.js";

const gearSlots: GearSlot[] = ["weapon", "armor", "utility"];

function formatEquippedPassiveBonus(item: GearItem, suppressed: boolean): string {
  const amount = formatSignedStatBonus(item.statBonus.amount);
  const stat = statLabelById[item.statBonus.stat];
  if (suppressed) return `${amount} ${stat}`;
  return item.effectModel === "conditional" && item.conditionType === "battle"
    ? `${amount} ${stat} in battle`
    : `${amount} ${stat} · always active`;
}

function getEquipmentAbilityState(item: GearItem): string | null {
  if (item.useLimit === "charge" || item.effectModel === "charged") {
    const current = item.currentCharges ?? item.charges ?? item.startingCharges ?? 0;
    const maximum = item.maxCharges ?? item.charges ?? item.startingCharges ?? current;
    return `${current}/${maximum} charges${current <= 0 ? " · depleted" : ""}`;
  }
  if (item.effectModel === "exhaust") {
    return `${item.exhausted ? "Exhausted" : "Ready"} · refreshes next round`;
  }
  return null;
}

export function PhoneOperativeSummary({
  self,
  equipmentSuppressions
}: {
  self: PhoneSelfState;
  equipmentSuppressions?: PhonePatchPayload["equipmentSuppressions"];
}): ReactElement {
  const { character, noteResources } = self;
  const scarCards = character.scarCards ?? [];
  const vitals = [
    { label: "Wounds", value: character.wounds, tone: character.wounds > 0 ? "wound" : null },
    { label: "Scars", value: character.scars.length, tone: character.scars.length > 0 ? "scar" : null },
    { label: "Salvage", value: character.salvage ?? 0, tone: "salvage" },
    { label: "Trophies", value: character.trophies, tone: null }
  ];
  const suppressedIds = new Set(
    equipmentSuppressions?.filter((entry) => entry.active).map((entry) => entry.itemInstanceId)
  );

  return (
    <div className="phone-operative-summary">
      <section className="phone-operative-summary__vitals" aria-label="Vitals and resources">
        <dl>
          {vitals.map(({ label, value, tone }) => (
            <div key={label} data-tone={tone ?? undefined}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          {noteResources?.vow != null ? (
            <div className="phone-operative-summary__vow">
              <dt>Vow Notes</dt>
              <dd>{noteResources.vow}</dd>
            </div>
          ) : null}
        </dl>
        {scarCards.length > 0 ? (
          <ul className="phone-operative-summary__scars" aria-label="Active Scars">
            {scarCards.map((scar) => <li key={scar.id}>{scar.title}</li>)}
          </ul>
        ) : null}
      </section>

      <section className="phone-operative-summary__gear" aria-label="Equipped gear bonuses">
        <h3>Equipped Gear</h3>
        <div className="phone-player-equipped-grid">
          {gearSlots.map((slot) => {
            const item = getEquippedGearItem(character, slot);
            const suppressed = Boolean(item?.instanceId && suppressedIds.has(item.instanceId));
            const abilityState = item ? getEquipmentAbilityState(item) : null;
            return (
              <article key={slot} className={`phone-player-equipped-card${suppressed ? " is-suppressed" : ""}`}>
                <span>{gearSlotLabelById[slot]}</span>
                <strong>{item?.name ?? "Empty"}</strong>
                {item ? <small>{formatEquippedPassiveBonus(item, suppressed)}</small> : null}
                {suppressed ? <em>Suppressed</em> : null}
                {abilityState ? <small>{abilityState}</small> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
