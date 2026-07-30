// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostGameIntro } from "../HostGameIntro.js";

describe("HostGameIntro", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("plays the registered intro and hands off after the video ends", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const onComplete = vi.fn();
    render(<HostGameIntro onComplete={onComplete} />);

    const video = screen.getByTestId("host-game-intro-video");
    expect(video).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/intro/ashenreach-intro.mp4"
    );

    fireEvent.canPlay(video);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();

    fireEvent.ended(video);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it("continues muted when the TV browser blocks unmuted autoplay", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new Error("Autoplay with sound blocked"))
      .mockResolvedValueOnce();
    render(<HostGameIntro onComplete={vi.fn()} />);

    const video = screen.getByTestId("host-game-intro-video") as HTMLVideoElement;
    fireEvent.canPlay(video);

    expect(await screen.findByRole("button", { name: "Enable sound" })).toBeVisible();
    expect(video.muted).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });

  it("falls through immediately when the video cannot load", () => {
    const onComplete = vi.fn();
    render(<HostGameIntro onComplete={onComplete} />);

    fireEvent.error(screen.getByTestId("host-game-intro-video"));

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("does not force cinematic motion when reduced motion is requested", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as MediaQueryList);
    const onComplete = vi.fn();

    render(<HostGameIntro onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});
