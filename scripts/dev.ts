import { spawn } from "node:child_process";
import type { AddressInfo } from "node:net";
import { createServer as createViteServer, type InlineConfig } from "vite";
import { startAshenReachServer } from "../src/server/index.js";
import { createPortAvailabilityCheck, findAvailablePort } from "../src/server/ports.js";

function isProcessRunning(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function openExternalUrl(url: string): void {
  const command =
    process.platform === "win32"
      ? { executable: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] }
      : process.platform === "darwin"
        ? { executable: "open", args: [url] }
        : { executable: "xdg-open", args: [url] };

  const browser = spawn(command.executable, command.args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  browser.on("error", (error) => {
    console.warn(`Could not open the browser automatically: ${error.message}`);
  });
  browser.unref();
}

async function main(): Promise<void> {
  const clientPortArg = process.argv.find((entry) => entry.startsWith("--client-port="))?.split("=")[1];
  const apiPortArg = process.argv.find((entry) => entry.startsWith("--api-port="))?.split("=")[1];
  const openTvOnStart = process.argv.includes("--open-tv");
  const openPhoneOnStart = process.argv.includes("--open-phone");
  const requestedClientPort = Number(clientPortArg ?? process.env.CLIENT_PORT ?? 5173);
  if (apiPortArg) process.env.PORT = apiPortArg;
  const resolvedClientPort = await findAvailablePort(requestedClientPort, {
    isPortFree: createPortAvailabilityCheck("0.0.0.0")
  });
  const server = await startAshenReachServer({
    clientPort: resolvedClientPort,
    logUrls: false,
    qaFixturesEnabled: process.env.ASHEN_REACH_QA_FIXTURES === "1" || process.argv.includes("--qa-fixtures"),
    adminContentEditingEnabled:
      process.env.ASHEN_REACH_ADMIN_CONTENT_EDITOR === "1" || process.argv.includes("--admin-content-editor")
  });

  const apiOrigin = `http://${server.lanHost}:${server.port}`;
  const wsOrigin = `ws://${server.lanHost}:${server.port}`;
  const publicClientOrigin =
    process.env.PUBLIC_CLIENT_ORIGIN || `http://${server.lanHost}:${resolvedClientPort}`;

  delete process.env.VITE_API_ORIGIN;
  delete process.env.VITE_WS_ORIGIN;
  process.env.VITE_API_PORT = String(server.port);
  process.env.VITE_WS_PORT = String(server.port);
  process.env.VITE_PUBLIC_CLIENT_ORIGIN = publicClientOrigin;

  const viteConfig: InlineConfig = {
    clearScreen: false,
    server: {
      host: "0.0.0.0",
      port: resolvedClientPort,
      strictPort: true,
      allowedHosts: true
    }
  };

  const viteServer = await createViteServer(viteConfig);

  await viteServer.listen();

  const clientAddress = viteServer.httpServer?.address() as AddressInfo | null;
  const listeningClientPort = clientAddress?.port ?? resolvedClientPort;
  const clientOrigin = process.env.PUBLIC_CLIENT_ORIGIN || `http://${server.lanHost}:${listeningClientPort}`;
  const localClientOrigin = `http://127.0.0.1:${listeningClientPort}`;
  const tvUrl = `${clientOrigin}/tv`;
  const phoneUrl = `${clientOrigin}/`;
  const localTvUrl = `${localClientOrigin}/tv`;
  const localPhoneUrl = `${localClientOrigin}/`;

  console.log("");
  console.log("============================================================");
  console.log("  ASHEN REACH IS READY");
  console.log("============================================================");
  console.log(`  TV on this computer: ${localTvUrl}`);
  console.log(`  Phone on this computer: ${localPhoneUrl}`);
  console.log("");
  console.log("  Devices on the same Wi-Fi:");
  console.log(`  TV:     ${tvUrl}`);
  console.log(`  Phone:  ${phoneUrl}`);
  console.log("");
  console.log(`  API:    ${apiOrigin}`);
  console.log(`  WS:     ${wsOrigin}`);
  console.log("============================================================");
  console.log("  Keep this window open while playing.");
  console.log("  Press Ctrl+C once to stop Ashen Reach.");
  console.log("============================================================");
  console.log("");

  if (openTvOnStart) {
    console.log("Opening the Host TV...");
    openExternalUrl(localTvUrl);
  } else if (openPhoneOnStart) {
    console.log("Opening the phone controller...");
    openExternalUrl(localPhoneUrl);
  }

  let launcherWatch: NodeJS.Timeout | null = null;
  let shutdownPromise: Promise<void> | null = null;
  const shutdown = (reason?: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      if (launcherWatch) {
        clearInterval(launcherWatch);
        launcherWatch = null;
      }
      process.off("SIGINT", handleSigint);
      process.off("SIGTERM", handleSigterm);
      console.log("");
      if (reason) console.log(reason);
      console.log("Stopping Ashen Reach...");
      await viteServer.close();
      await server.close();
      console.log("Ashen Reach stopped.");
      process.exit(0);
    })();

    return shutdownPromise;
  };

  const handleSigint = () => {
    void shutdown();
  };
  const handleSigterm = () => {
    void shutdown();
  };

  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);

  const launcherProcessId = Number.parseInt(process.env.ASHEN_REACH_LAUNCHER_PID ?? "", 10);
  if (Number.isSafeInteger(launcherProcessId) && launcherProcessId > 0) {
    launcherWatch = setInterval(() => {
      if (!isProcessRunning(launcherProcessId)) {
        void shutdown("Launcher window closed.");
      }
    }, 750);
    launcherWatch.unref();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
