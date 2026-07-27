// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getYouTubeVideoId, HostYouTubePlayer } from "../HostYouTubePlayer.js";

describe("HostYouTubePlayer", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("accepts supported YouTube links and rejects other hosts", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("contains only YouTube connection controls and displays the connected video", () => {
    render(<HostYouTubePlayer />);

    fireEvent.click(screen.getByRole("button", { name: /connect a youtube video/i }));
    expect(screen.getByRole("dialog", { name: /youtube connection/i })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText(/effects volume|ambient volume|enable audio/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /youtube link/i }), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" }
    });
    fireEvent.click(screen.getByRole("button", { name: /connect video/i }));

    expect(screen.getByTitle(/ashen reach youtube table video/i)).toHaveAttribute(
      "src",
      expect.stringContaining("youtube-nocookie.com/embed/dQw4w9WgXcQ")
    );
    expect(window.localStorage.getItem("ashenreach.hostSoundtrackUrl")).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(screen.queryByRole("dialog", { name: /youtube connection/i })).not.toBeInTheDocument();
  });

  it("restores and disconnects the saved YouTube selection", () => {
    window.localStorage.setItem("ashenreach.hostSoundtrackUrl", "https://youtu.be/dQw4w9WgXcQ");
    render(<HostYouTubePlayer />);

    expect(screen.getByTitle(/ashen reach youtube table video/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /change connected youtube video/i }));
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(screen.queryByTitle(/ashen reach youtube table video/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("ashenreach.hostSoundtrackUrl")).toBeNull();
  });
});
