import { describe, expect, it } from "vitest";
import { pickPreferredLanHost } from "../network.js";

describe("pickPreferredLanHost", () => {
  it("prefers a home LAN IPv4 address over loopback and VPN-like addresses", () => {
    expect(
      pickPreferredLanHost(["localhost", "127.0.0.1", "10.8.0.4", "192.168.50.238"])
    ).toBe("192.168.50.238");
  });

  it("ignores link-local addresses when no routable LAN host is available", () => {
    expect(pickPreferredLanHost(["localhost", "127.0.0.1", "169.254.12.34"])).toBe(
      "localhost"
    );
  });

  it("allows an explicit LAN host override", () => {
    expect(pickPreferredLanHost(["localhost", "192.168.50.238"], "http://10.0.0.42:5173")).toBe(
      "10.0.0.42"
    );
  });
});
