// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SignalActionCoin } from "../SignalActionCoin.js";

describe("SignalActionCoin", () => {
  afterEach(cleanup);

  it("renders an original SVG action seal without requesting an image asset", () => {
    const rendered = render(
      <SignalActionCoin
        kind="movement"
        label="Route confirmed"
        detail="Glass Causeway"
      />
    );

    expect(screen.getByLabelText(/route confirmed.*glass causeway.*movement action seal/i)).toBeVisible();
    expect(rendered.container.querySelector("[data-signal-action-coin='movement'] svg")).toBeInTheDocument();
    expect(rendered.container.querySelector("img")).not.toBeInTheDocument();
  });

  it("uses the authoritative challenge stat to select the engraved seal", () => {
    const rendered = render(
      <SignalActionCoin
        kind="challenge"
        stat="signal"
        label="Signal challenge"
        detail="Rift Whispers"
      />
    );

    expect(screen.getByLabelText(/signal challenge.*rift whispers.*signal challenge seal/i)).toBeVisible();
    expect(rendered.container.querySelector("[data-signal-action-coin='signal']")).toBeInTheDocument();
    expect(rendered.container.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/stat-seals/signal.png"
    );
  });

  it("defines a finite reveal and a reduced-motion fallback", () => {
    const css = readFileSync(resolve("src/client/tv/SignalActionCoin.css"), "utf8");
    expect(css).toContain("@keyframes signal-action-coin-enter");
    expect(css).toContain("@keyframes signal-action-coin-scan");
    expect(css).toContain("@keyframes signal-stat-seal-activate");
    expect(css).toContain("@keyframes signal-stat-seal-ring");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toMatch(/animation:\s*[^;]*infinite/i);
  });
});
