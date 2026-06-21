import { createServer } from "node:net";

export interface FindAvailablePortOptions {
  maxAttempts?: number;
  isPortFree?: (port: number) => boolean | Promise<boolean>;
}

export async function findAvailablePort(
  startPort: number,
  options: FindAvailablePortOptions = {}
): Promise<number> {
  const maxAttempts = options.maxAttempts ?? 10;
  const isPortFree = options.isPortFree ?? (() => true);

  if (!Number.isInteger(startPort) || startPort <= 0) {
    throw new Error(`Invalid start port: ${startPort}`);
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error(`Invalid max attempts: ${maxAttempts}`);
  }

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;

    if (await isPortFree(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free port found starting at ${startPort} within ${maxAttempts} attempts.`);
}

export function createPortAvailabilityCheck(host: string): (port: number) => Promise<boolean> {
  return async (port) =>
    await new Promise<boolean>((resolve) => {
      const probe = createServer();

      probe.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false);
          return;
        }

        resolve(false);
      });

      probe.once("listening", () => {
        probe.close(() => resolve(true));
      });

      probe.listen(port, host);
    });
}
