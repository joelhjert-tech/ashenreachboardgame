import { createServer } from "vite";
import { startAshenReachServer } from "../src/server/index.js";
import { AI_RIVAL_SUPPORTED_SCENARIO_IDS } from "../src/server/aiRival.js";
import { createAiRivalGame } from "./run-ai-rival-campaign.js";

const scenarioArgument = process.argv.slice(2).find((arg) => arg.startsWith("--scenarios="));
const scenarios = scenarioArgument
  ? scenarioArgument.slice("--scenarios=".length).split(",")
  : [...AI_RIVAL_SUPPORTED_SCENARIO_IDS];
if (scenarios.some((scenario) => !AI_RIVAL_SUPPORTED_SCENARIO_IDS.has(scenario))) {
  throw new Error("Choose a supported AI rival scenario for the spectator room.");
}

// Isolated local spectator room. Production AI timers, dice, and TV gates run
// normally; only the otherwise required human host is converted into a bot.
const server = await startAshenReachServer({ port: 8095, clientPort: 5185, host: "127.0.0.1", logUrls: false });
process.env.VITE_API_PORT = String(server.port);
process.env.VITE_WS_PORT = String(server.port);
process.env.VITE_PUBLIC_CLIENT_ORIGIN = "http://127.0.0.1:5185";
const vite = await createServer({ server: { host: "127.0.0.1", port: 5185, strictPort: true } });
await vite.listen();
let game = 0;
let endedAt: number | null = null;
function startGame() {
  const scenario = scenarios[game % scenarios.length]!;
  const state = createAiRivalGame(scenario, 4, game + 1, false).getState();
  state.seats = state.seats.map((seat) => ({ ...seat, controllerType: "ai", connected: false,
    displayName: seat.seatId === "seat-1" ? "Ashen Rival 1" : seat.displayName }));
  server.roomServer.resetSession(state);
  server.roomServer.startSession();
  game++;
  endedAt = null;
  console.log(`Live bot game ${game}/9: ${scenario} — http://127.0.0.1:5185/tv`);
}
startGame();
const interval = setInterval(() => {
  if (server.roomServer.getState().status !== "ended") return;
  endedAt ??= Date.now();
  if (game < 9 && Date.now() - endedAt > 15000) startGame();
}, 1000);
async function stop() { clearInterval(interval); await vite.close(); await server.close(); process.exit(); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
