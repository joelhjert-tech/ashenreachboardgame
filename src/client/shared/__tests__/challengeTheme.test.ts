import { describe, expect, it } from "vitest";
import { getChallengeThemeStyle, THREAT_ICON_CHALLENGE_STAT } from "../../../game/ui/challengeTheme.js";

describe("challenge stat theme", () => {
  it("styles Guile with the shared green token", () => {
    const style = getChallengeThemeStyle("guile");

    expect(style["--challenge-color"]).toBe("#4FBF78");
    expect(style["--challenge-color"]).not.toBe("#E3B341");
    expect(style["--challenge-glow"]).toContain("79, 191, 120");
  });

  it("keeps yellow threat icons mapped to Guile without making Guile yellow", () => {
    expect(THREAT_ICON_CHALLENGE_STAT.yellow).toBe("guile");
    expect(getChallengeThemeStyle(THREAT_ICON_CHALLENGE_STAT.yellow)["--challenge-color"]).toBe("#4FBF78");
  });
});
