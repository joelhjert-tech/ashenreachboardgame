import { loadContracts } from "../content/contracts.js";

export function loadContractDeck(): string[] {
  return [...loadContracts().values()].map((card) => card.id);
}
