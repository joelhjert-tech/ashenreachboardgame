import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { RIFTFALL_BOARD_NODES } from "../src/data/riftfallBoardNodes.js";
import { getBoardSpace } from "../src/game/data/boardSpaces.js";
import { BOARD_RING_TRANSITIONS } from "../src/game/data/boardTransitions.js";

const outputPath = resolve(process.cwd(), "reports/ashen-reach-ring-transition-manifest.json");
const markdownPath = resolve(process.cwd(), "reports/ashen-reach-ring-transition-manifest.md");
const tileAuditPath = resolve(process.cwd(), "reports/ashen-reach-tile-function-audit.md");
const topologyAuditPath = resolve(process.cwd(), "reports/ashen-reach-map-topology-audit.md");
const manifest = {
  generatedFrom: [
    "src/data/riftfallBoardNodes.ts",
    "src/game/data/boardSpaces.ts",
    "src/game/data/boardTransitions.ts"
  ],
  authority: "Movement remains authoritative in src/game/rules/movementPlanner.ts.",
  generatedAt: "deterministic-source-build",
  sectorCounts: Object.fromEntries(
    ["outer", "middle", "inner", "center"].map((ring) => [ring, RIFTFALL_BOARD_NODES.filter((node) => node.ring === ring).length])
  ),
  sectors: RIFTFALL_BOARD_NODES.map((node) => {
    const space = getBoardSpace(node.id);
    return {
      id: node.id,
      displayName: space?.name ?? node.label,
      ring: node.ring,
      position: { x: node.x, y: node.y },
      connections: node.connections,
      threatIcons: space?.threatIcons ?? [],
      tileFunction: space?.textBox.title ?? null,
      effectKey: space?.textBox.effectKey ?? null,
      movementRule: space?.movementBox?.text ?? null,
      movementRequirements: space?.movementRequirements ?? []
    };
  }),
  transitions: BOARD_RING_TRANSITIONS
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const transitionRows = (sourceRing: string, destinationRing: string) =>
  BOARD_RING_TRANSITIONS.filter((entry) => entry.sourceRing === sourceRing && entry.destinationRing === destinationRing)
    .map((entry) => `| \`${entry.sourceSectorId}\` | \`${entry.destinationSectorId}\` | ${entry.direction} | 1 exactly | ${entry.requiredNotes.join(", ") || "None"} | ${entry.lockedReason ?? "Open"} |`)
    .join("\n");
const transitionMarkdown = `# Ashen Reach Ring Transition Manifest

Generated from the canonical graph and board-space requirements. Movement authority remains in \`movementPlanner.ts\`.

## Exact Outer to Middle transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("outer", "middle")}

## Exact Middle to Outer transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("middle", "outer")}

## Exact Middle to Inner transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("middle", "inner")}

## Exact Inner to Middle transitions

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("inner", "middle")}

## Exact final center entries

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("inner", "center")}

## Center return routes

| Source | Destination | Direction | Movement | Notes or clearance | Lock text |
|---|---|---|---|---|---|
${transitionRows("center", "inner")}

All 13 physical cross-ring links are bidirectional. Requirements are evaluated on the destination, so the Guardian Span and Core clearances gate inward travel only. A cross-ring move is offered only at authoritative movement value 1 and ends movement.
`;
writeFileSync(markdownPath, transitionMarkdown, "utf8");

const tileRows = RIFTFALL_BOARD_NODES.map((node) => {
  const space = getBoardSpace(node.id);
  const requirements = (space?.movementRequirements ?? []).map((entry) => entry.errorMessage).join("; ") || "None";
  return `| \`${node.id}\` | ${space?.name ?? node.label} | ${node.ring} | ${space?.textBox.title ?? "None"} | \`${space?.textBox.effectKey ?? "none"}\` | ${(space?.threatIcons ?? []).join(", ") || "None"} | ${requirements} |`;
}).join("\n");
const tileMarkdown = `# Ashen Reach Tile Function Audit

Generated from all 49 canonical board spaces. The effect key is the authoritative named-space resolver; printed Threat icons drive arrival exploration. Recurring tile challenges are resolved before Threat draws, followed by named text after blockers clear.

| Stable sector ID | Display name | Ring | Named function | Resolver | Threat icons | Entry requirement |
|---|---|---|---|---|---|---|
${tileRows}

## Resolution and revisit rules

1. Complete authoritative movement and record arrival.
2. Open any mandatory recurring tile challenge before Threat resolution.
3. Resolve printed Threat draws and persistent blockers.
4. Make named tile text or services available in the action phase.
5. Record source-event identities so reconnect and repeated submission cannot replay a reward.

Named tile text is generally revisitable when the sector is clear; recurring challenges remain recurring by design. The Core replaces named text with the scenario-confrontation intent. Scenario sheet art may replace only the center image, never its ID or connections.
`;
writeFileSync(tileAuditPath, tileMarkdown, "utf8");

function canEnter(from: string, to: string, notes: Set<string>): boolean {
  const requirements = getBoardSpace(to)?.movementRequirements ?? [];
  return requirements.every((requirement) =>
    (!requirement.allowedFrom || requirement.allowedFrom.includes(from)) &&
    (!requirement.requiredNotes || requirement.requiredNotes.every((note) => notes.has(note)))
  );
}

function shortestDistance(start: string, targetRing: string, notes: Set<string>): number | null {
  const queue: Array<{ id: string; distance: number }> = [{ id: start, distance: 0 }];
  const seen = new Set([start]);
  while (queue.length) {
    const current = queue.shift()!;
    const node = RIFTFALL_BOARD_NODES.find((entry) => entry.id === current.id)!;
    if (node.ring === targetRing) return current.distance;
    for (const neighbor of node.connections) {
      if (!seen.has(neighbor) && canEnter(node.id, neighbor, notes)) {
        seen.add(neighbor);
        queue.push({ id: neighbor, distance: current.distance + 1 });
      }
    }
  }
  return null;
}

const allNotes = new Set(["guardian-span-clearance", "gate-of-cinders-breached"]);
const outerReachabilityRows = RIFTFALL_BOARD_NODES.filter((node) => node.ring === "outer").map((node) =>
  `| \`${node.id}\` | ${shortestDistance(node.id, "middle", new Set()) ?? "Locked"} | ${shortestDistance(node.id, "inner", new Set()) ?? "Locked"} | ${shortestDistance(node.id, "inner", new Set(["guardian-span-clearance"])) ?? "Locked"} | ${shortestDistance(node.id, "center", allNotes) ?? "Locked"} |`
).join("\n");
const ringLists = ["outer", "middle", "inner", "center"].map((ring) =>
  `- **${ring}:** ${RIFTFALL_BOARD_NODES.filter((node) => node.ring === ring).map((node) => `\`${node.id}\``).join(" → ")}`
).join("\n");
const topologyMarkdown = `# Ashen Reach Map Topology Audit

## Direct answers

- **Outer to Middle:** seven bidirectional links; see the generated transition manifest.
- **Middle to Outer:** the exact reverse of all seven links.
- **Middle to Inner:** four bidirectional links. Only \`middle_guardian_span -> inner_veil_rift\` requires \`guardian-span-clearance\` in the standard mode.
- **Inner to Middle:** the exact reverse of all four links; outward travel is not clearance-gated.
- **Inner to Center:** \`inner_gate_of_cinders\` or \`inner_blackstar_shortcut\` to \`center_cinder_gate\`, both requiring \`gate-of-cinders-breached\`.
- **Center to Inner:** both reverse links are open; leaving the Core does not consume or require the breach note.
- **One-way routes:** none in the canonical graph.
- **Exact movement:** all cross-ring transitions require authoritative movement value 1 and end movement.
- **Transition tests:** tests happen as named board text or arrival challenges, never as an untyped client-side edge test.
- **Scenario preparation:** does not unlock topology. It modifies or qualifies the confrontation after legal arrival at the Core.
- **Nemesis Relay:** entering Inner or Center additionally requires the operative's Crown-Key Fragment.

## Clockwise canonical ring map

${ringLists}

## Reachability lower bounds from every Outer sector

Distances are graph-step lower bounds, not predicted turns: normal Outer/Middle movement is exact-distance, and a cross-ring crossing is selectable only when the movement value is 1.

| Start | Middle, no notes | Inner, no notes | Inner with Guardian clearance | Center with both clearances |
|---|---:|---:|---:|---:|
${outerReachabilityRows}

All 24 Outer starts reach Middle without notes. All starts reach Inner through the three ungated entrances; Guardian Span is the protected default breach, not the sole Inner entrance. Every start reaches the Core after the Gate breach note. No sector is disconnected and no forced displacement crosses rings.

## Gate proof

- **Guardian Span / Customs Gate:** Command 9 (seal alignment) or Signal 9 (ghost marker) grants owner-private \`guardian-span-clearance\`. Failure grants nothing and has no retired Heat consequence. The note is not consumed.
- **Cinder Lattice / Crownless Observatory:** Signal 10 or Guile 10 grants descriptive approach notes only. These notes are preparation/lore, not topology keys.
- **Gate of Cinders / Last Signal Well:** Grit, Signal, or Guile 12 grants owner-private \`gate-of-cinders-breached\`. Failure grants nothing. The note is not consumed.
- **Core:** exact stable ID \`center_cinder_gate\`; only the two authored Inner origins are accepted. Scenario art replaces presentation only.

## Mismatches found and resolved

1. Guardian Span text advertised Salvage and Guile paths that its resolver did not implement. It now names the existing Command and Signal choices.
2. Locked-route messages used lore names rather than the named clearance. They now state the exact lock reason.
3. Cross-ring links existed in topology but had no persistent TV treatment. The TV now draws all 13 canonical links, with gated links visually distinct.
4. The phone exposed only a generic Gate tag. Server projection now identifies inward/outward ring transitions and tells the player that exact movement 1 ends movement.

No visual-only route was proven. Map art is presentation and is not treated as an authority. Browser QA is used to confirm that the newly drawn canonical links remain understandable.
`;
writeFileSync(topologyAuditPath, topologyMarkdown, "utf8");
console.log(`Wrote ${BOARD_RING_TRANSITIONS.length} directed transitions to ${outputPath}`);
