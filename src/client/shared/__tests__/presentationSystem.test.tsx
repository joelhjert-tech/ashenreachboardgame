// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArtworkFrame } from "../ArtworkFrame.js";
import { LiveStatus } from "../LiveStatus.js";
import { artworkRatios, presentationCssVariables, presentationStatus } from "../presentationSystem.js";

afterEach(cleanup);

describe("shared presentation system", () => {
  it("defines stable status language, artwork ratios, and CSS contracts", () => {
    expect(presentationStatus).toMatchObject({
      waiting: "WAITING",
      submitting: "SUBMITTING",
      resolving: "RESOLVING",
      connectionLost: "CONNECTION LOST",
      resultReady: "RESULT READY"
    });
    expect(artworkRatios).toMatchObject({ operative: "3 / 4", encounterCard: "5 / 7", mapTile: "1 / 1" });

    const styles = readFileSync(join(process.cwd(), "src/client/styles.css"), "utf8");
    Object.values(presentationCssVariables).forEach((variableName) => expect(styles).toContain(variableName));
    expect(styles).toContain("--touch-target-min: 44px");
    expect(styles).toContain(".artwork-frame--hero");
  });

  it("renders deterministic image containment and a private-safe fallback", () => {
    const { rerender } = render(
      <ArtworkFrame
        src="/assets/cards/example.webp"
        alt="Visible encounter artwork"
        fit="cover"
        aspectRatio="card"
        focalPoint="50% 20%"
        fallback="encounter"
      />
    );

    const image = screen.getByAltText("Visible encounter artwork");
    expect(image.parentElement).toHaveAttribute("data-artwork-fit", "cover");
    expect(image.parentElement).toHaveAttribute("data-artwork-ratio", "card");
    expect(image).toHaveStyle({ objectPosition: "50% 20%" });
    expect(image).toHaveAttribute("loading", "lazy");

    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "Visible encounter artwork" })).toHaveTextContent("Encounter art unavailable");
    expect(document.body).not.toHaveTextContent("/assets/cards/example.webp");

    rerender(<ArtworkFrame src="/hero.webp" alt="Priority hero" aspectRatio="hero" priority />);
    expect(screen.getByAltText("Priority hero")).toHaveAttribute("loading", "eager");
    expect(screen.getByAltText("Priority hero")).toHaveAttribute("fetchpriority", "high");
  });

  it("announces a revision once and updates only when state changes", () => {
    const { rerender } = render(<LiveStatus message="Waiting for Lane" revision="state-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for Lane");

    rerender(<LiveStatus message="Waiting for Lane" revision="state-1" />);
    expect(screen.getAllByRole("status")).toHaveLength(1);

    rerender(<LiveStatus message="Result ready" revision="state-2" priority="assertive" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Result ready");

    rerender(<LiveStatus message={null} revision="state-3" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
