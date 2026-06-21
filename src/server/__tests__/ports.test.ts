import { describe, expect, it, vi } from "vitest";
import { findAvailablePort } from "../ports.js";

describe("findAvailablePort", () => {
  it("returns the first free port at or above the starting port", async () => {
    const isPortFree = vi.fn(async (port: number) => port === 8082);

    await expect(findAvailablePort(8080, { maxAttempts: 5, isPortFree })).resolves.toBe(8082);
    expect(isPortFree).toHaveBeenCalledTimes(3);
    expect(isPortFree).toHaveBeenNthCalledWith(1, 8080);
    expect(isPortFree).toHaveBeenNthCalledWith(2, 8081);
    expect(isPortFree).toHaveBeenNthCalledWith(3, 8082);
  });

  it("throws a clear error when every attempted port is occupied", async () => {
    const isPortFree = vi.fn(async () => false);

    await expect(findAvailablePort(9000, { maxAttempts: 4, isPortFree })).rejects.toThrow(
      "No free port found starting at 9000 within 4 attempts."
    );
    expect(isPortFree).toHaveBeenCalledTimes(4);
  });
});
