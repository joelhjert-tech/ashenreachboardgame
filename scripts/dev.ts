import type { AddressInfo } from "node:net";
import { createServer as createViteServer, type InlineConfig } from "vite";
import { startAshenReachServer } from "../src/server/index.js";

async function main(): Promise<void> {
  const requestedClientPort = Number(process.env.CLIENT_PORT ?? 5173);
  const server = await startAshenReachServer({
    clientPort: requestedClientPort,
    logUrls: false
  });

  const apiOrigin = `http://${server.lanHost}:${server.port}`;
  const wsOrigin = `ws://${server.lanHost}:${server.port}`;

  delete process.env.VITE_API_ORIGIN;
  delete process.env.VITE_WS_ORIGIN;
  process.env.VITE_API_PORT = String(server.port);
  process.env.VITE_WS_PORT = String(server.port);

  const viteConfig: InlineConfig = {
    clearScreen: false,
    server: {
      host: "0.0.0.0",
      port: requestedClientPort
    }
  };

  const viteServer = await createViteServer(viteConfig);

  await viteServer.listen();

  const clientAddress = viteServer.httpServer?.address() as AddressInfo | null;
  const resolvedClientPort = clientAddress?.port ?? requestedClientPort;
  const clientOrigin = `http://${server.lanHost}:${resolvedClientPort}`;
  const tvUrl = `${clientOrigin}/tv`;
  const phoneUrl = `${clientOrigin}/`;

  console.log("Ashen Reach local dev");
  console.log(`  API:    ${apiOrigin}`);
  console.log(`  WS:     ${wsOrigin}`);
  console.log(`  TV:     ${tvUrl}`);
  console.log(`  Phone:  ${phoneUrl}`);

  const shutdown = async () => {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
    await viteServer.close();
    await server.close();
    process.exit(0);
  };

  const handleSigint = () => {
    void shutdown();
  };
  const handleSigterm = () => {
    void shutdown();
  };

  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
