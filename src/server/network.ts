import { networkInterfaces } from "node:os";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeHost(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname;
    }
  } catch {
    return null;
  }

  return trimmed.replace(/^\[/, "").replace(/\]$/, "").split(":")[0] ?? null;
}

function isIPv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isLinkLocalIPv4(host: string): boolean {
  return host.startsWith("169.254.");
}

function isPrivateIPv4(host: string): boolean {
  if (host.startsWith("192.168.")) {
    return true;
  }

  if (host.startsWith("10.")) {
    return true;
  }

  const [first, second] = host.split(".").map(Number);
  return first === 172 && second >= 16 && second <= 31;
}

function getLanHostScore(host: string): number {
  if (host.startsWith("192.168.")) {
    return 50;
  }

  if (host.startsWith("10.")) {
    return 45;
  }

  if (isPrivateIPv4(host)) {
    return 40;
  }

  if (isIPv4(host) && !isLinkLocalIPv4(host)) {
    return 30;
  }

  return 0;
}

function sortLanHosts(hosts: string[]): string[] {
  return [...hosts].sort((left, right) => {
    const scoreDelta = getLanHostScore(right) - getLanHostScore(left);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.localeCompare(right);
  });
}

export function pickPreferredLanHost(hosts: string[], override?: string): string {
  const overrideHost = normalizeHost(override);

  if (overrideHost && overrideHost !== "0.0.0.0") {
    return overrideHost;
  }

  return (
    sortLanHosts(
      hosts.filter((host) => !LOCAL_HOSTS.has(host) && isIPv4(host) && !isLinkLocalIPv4(host))
    )[0] ?? "localhost"
  );
}

export function getLanHosts(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const nets = networkInterfaces();

  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && !isLinkLocalIPv4(entry.address)) {
        hosts.add(entry.address);
      }
    }
  }

  const localHosts = [...hosts].filter((host) => LOCAL_HOSTS.has(host));
  const lanHosts = sortLanHosts([...hosts].filter((host) => !LOCAL_HOSTS.has(host)));

  return [...localHosts, ...lanHosts];
}

export function getPreferredLanHost(): string {
  return pickPreferredLanHost(
    getLanHosts(),
    process.env.ASHEN_LAN_HOST ?? process.env.LAN_HOST ?? process.env.HOST_IP
  );
}
