import { loadGear } from "../content/gear.js";

export function loadGearDeck(): string[] {
  return [...loadGear().values()].map((item) => item.id);
}
