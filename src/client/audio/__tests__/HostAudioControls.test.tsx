// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AshenReachAudioController } from "../useAshenReachAudio.js";
import { getYouTubeVideoId, HostAudioControls } from "../HostAudioControls.js";

function makeAudioController(overrides: Partial<AshenReachAudioController> = {}): AshenReachAudioController {
  return {
    available: true,
    unlocked: false,
    settings: {
      music: { volume: 0.28, muted: false },
      sfx: { volume: 0.72, muted: false },
      ambient: { volume: 0.34, muted: false }
    },
    unlock: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    ...overrides
  };
}

describe("HostAudioControls", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("accepts only supported YouTube video links", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("starts collapsed and opens the floating audio panel from the audio button", () => {
    render(<HostAudioControls audio={makeAudioController()} />);

    expect(screen.getByRole("button", { name: /open audio controls/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: /audio control panel/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open audio controls/i }));

    expect(screen.getByRole("button", { name: /open audio controls/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: /audio control panel/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Master volume")).toBeInTheDocument();
    expect(screen.getByLabelText("Music volume")).toBeInTheDocument();
    expect(screen.getByLabelText("Effects volume")).toBeInTheDocument();
  });

  it("closes from the close button and from outside clicks", () => {
    render(
      <div>
        <button type="button">Outside</button>
        <HostAudioControls audio={makeAudioController({ unlocked: true })} />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: /open audio controls/i }));
    expect(screen.getByRole("dialog", { name: /audio control panel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close audio controls/i }));
    expect(screen.queryByRole("dialog", { name: /audio control panel/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open audio controls/i }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("dialog", { name: /audio control panel/i })).not.toBeInTheDocument();
  });

  it("shows unavailable state and disables controls when Web Audio is missing", () => {
    render(<HostAudioControls audio={makeAudioController({ available: false })} />);

    expect(screen.getByRole("button", { name: /status: unavailable/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open audio controls/i }));

    expect(screen.getByLabelText("Master volume")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Audio unavailable" })).toBeDisabled();
  });

  it("connects and stops a player-chosen YouTube soundtrack on the host", () => {
    render(<HostAudioControls audio={makeAudioController()} />);
    fireEvent.click(screen.getByRole("button", { name: /open audio controls/i }));

    fireEvent.change(screen.getByRole("textbox", { name: /youtube link/i }), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" }
    });
    fireEvent.click(screen.getByRole("button", { name: /connect soundtrack/i }));

    expect(screen.getByTitle(/ashen reach table soundtrack/i)).toHaveAttribute(
      "src",
      expect.stringContaining("youtube-nocookie.com/embed/dQw4w9WgXcQ")
    );
    expect(window.localStorage.getItem("ashenreach.hostSoundtrackUrl")).toBe("https://youtu.be/dQw4w9WgXcQ");

    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));
    expect(screen.queryByTitle(/ashen reach table soundtrack/i)).not.toBeInTheDocument();
  });
});
