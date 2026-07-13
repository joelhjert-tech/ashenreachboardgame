import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { reduceGameState } from "../reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadCharacters } from "../../content/characters.js";

const ROOT = process.cwd();
function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : productionFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Phase 1P Heat-free runtime character construction", () => {
  it.each([
    ["single-player", "single-player", "co-op"],
    ["cooperative", "multiplayer", "co-op"],
    ["rivalry", "multiplayer", "rivalry"]
  ] as const)("constructs %s session characters without Heat", (_label, sessionMode, interactionMode) => {
    const state = createInitialSessionState(`phase-1p-${_label}`, sessionMode, undefined, interactionMode, "standard", sessionMode === "multiplayer" ? 2 : 1);
    expect(state.players.every((player) => !("heat" in player.character))).toBe(true);
  });

  it("constructs a Heat-free replacement without changing inherited scars", () => {
    const state = createInitialSessionState("phase-1p-replacement", "single-player");
    state.players[0]!.character.status = "recalled";
    state.players[0]!.character.scars = ["scar-wound-1"];
    const replacement = loadCharacters().get("signal-witch");
    if (!replacement) throw new Error("Missing signal-witch");
    const result = reduceGameState(state, { type: "RECRUIT_REPLACEMENT", seatId: state.players[0]!.seatId, replacementCharacterId: replacement.id, replacementCharacter: replacement, createdAt: "phase-1p" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("heat" in result.state.players[0]!.character).toBe(false);
    expect(result.state.players[0]!.character.scars).toContain("scar-wound-1");
  });

  it("forbids gameplay character Heat access and current server projection Heat", () => {
    const files = [...productionFiles(join(ROOT, "src", "game")), ...productionFiles(join(ROOT, "src", "server"))];
    const accesses: string[] = [];
    const projectionZeros: string[] = [];
    for (const file of files) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        const location = `${relative(ROOT, file).replaceAll("\\", "/")}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
        if (ts.isPropertyAccessExpression(node) && node.getText(source).endsWith("character.heat")) accesses.push(location);
        if (ts.isPropertyAssignment(node) && node.name.getText(source) === "heat" && file.replaceAll("\\", "/").endsWith("src/server/roomServer.ts")) projectionZeros.push(location);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(accesses).toEqual([]);
    expect(projectionZeros).toEqual([]);
  });

  it("confines the old Mirror threshold key to strict snapshot compatibility and migration", () => {
    const files = [...productionFiles(join(ROOT, "src", "game")), ...productionFiles(join(ROOT, "src", "server"))];
    const allowed = new Set([
      "src/game/schema/session.schema.ts",
      "src/game/persistence/sessionSnapshot.ts"
    ]);
    const violations: string[] = [];

    for (const file of files) {
      const relativePath = relative(ROOT, file).replaceAll("\\", "/");
      if (allowed.has(relativePath)) continue;
      readFileSync(file, "utf8").split(/\r?\n/).forEach((line, index) => {
        if (/\bheatThreshold\b/.test(line)) violations.push(`${relativePath}:${index + 1}`);
      });
    }

    expect(violations).toEqual([]);
  });
});
