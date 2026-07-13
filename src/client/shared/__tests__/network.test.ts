import { describe, expect, it } from "vitest";
import { buildPhoneJoinUrl, resolveApiOrigin, resolveWebSocketOrigin } from "../network.js";

describe("client network origin helpers", () => {
  it("builds phone join URLs from a public LAN client origin when supplied", () => {
    expect(
      buildPhoneJoinUrl({
        roomCode: "AB12C",
        currentOrigin: "http://localhost:5173",
        publicClientOrigin: "http://192.168.1.40:5173/"
      })
    ).toBe("http://192.168.1.40:5173/?room=AB12C");
  });

  it("preserves the current browser origin when no public client origin is configured", () => {
    expect(
      buildPhoneJoinUrl({
        roomCode: "AB12C",
        currentOrigin: "https://play.ashenreach.example/tv"
      })
    ).toBe("https://play.ashenreach.example/?room=AB12C");
  });

  it("derives API origin from the current phone host without hardcoding localhost", () => {
    expect(
      resolveApiOrigin({
        protocol: "http:",
        hostname: "192.168.1.40",
        port: "8080"
      })
    ).toBe("http://192.168.1.40:8080");
  });

  it("uses the matching WebSocket host and protocol for phone clients", () => {
    expect(
      resolveWebSocketOrigin({
        protocol: "http:",
        hostname: "192.168.1.40",
        port: "8080"
      })
    ).toBe("ws://192.168.1.40:8080");

    expect(
      resolveWebSocketOrigin({
        protocol: "https:",
        hostname: "ashenreach.example",
        port: "443"
      })
    ).toBe("wss://ashenreach.example:443");
  });

  it("honors explicit production origins without adding trailing slashes", () => {
    expect(
      resolveApiOrigin({
        protocol: "http:",
        hostname: "localhost",
        port: "8080",
        configuredOrigin: "https://api.ashenreach.example/"
      })
    ).toBe("https://api.ashenreach.example");

    expect(
      resolveWebSocketOrigin({
        protocol: "http:",
        hostname: "localhost",
        port: "8080",
        configuredOrigin: "wss://socket.ashenreach.example/"
      })
    ).toBe("wss://socket.ashenreach.example");
  });
});
