import { networkInterfaces } from "node:os";

export function getLanHosts(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const nets = networkInterfaces();

  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        hosts.add(entry.address);
      }
    }
  }

  return [...hosts];
}

export function getPreferredLanHost(): string {
  return getLanHosts().find((host) => host !== "localhost" && host !== "127.0.0.1") ?? "localhost";
}
