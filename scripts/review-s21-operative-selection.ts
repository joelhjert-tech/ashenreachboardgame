import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type CdpTarget = {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type CdpMessage = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

class CdpClient {
  private readonly socket: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, {
    resolve: (value: Record<string, unknown>) => void;
    reject: (reason: Error) => void;
  }>();

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message ?? "Unknown CDP error"));
      else request.resolve(message.result ?? {});
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out connecting to the S21 Chrome target")), 10_000);
      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Could not connect to the S21 Chrome target"));
      }, { once: true });
    });
    return new CdpClient(socket);
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const response = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`S21 CDP command timed out: ${method}`));
      }, 10_000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          reject(reason);
        }
      });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    const remote = response.result as { value?: T; description?: string } | undefined;
    if (!remote || !("value" in remote)) {
      throw new Error(remote?.description ?? `S21 evaluation returned no value for ${expression}`);
    }
    return remote.value as T;
  }

  close(): void {
    this.socket.close();
  }
}

async function waitFor<T>(client: CdpClient, expression: string, timeoutMs = 15_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await client.evaluate<T | null>(expression);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for S21 expression: ${expression}`);
}

async function tapButtonMatching(client: CdpClient, patternSource: string): Promise<void> {
  const point = await waitFor<{ x: number; y: number }>(client, `(() => {
    const pattern = new RegExp(${JSON.stringify(patternSource)}, 'i');
    const button = [...document.querySelectorAll('button')].find((entry) => pattern.test(entry.textContent?.trim() ?? ''));
    if (!(button instanceof HTMLButtonElement) || button.disabled) return null;
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 4, radiusY: 4, force: 1 }]
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function resolveRoomCode(): Promise<string> {
  const configured = process.env.S21_ROOM_CODE?.trim().toUpperCase();
  if (configured) return configured;
  const response = await fetch("http://127.0.0.1:8080/api/session/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionMode: "single-player",
      interactionMode: "co-op",
      gameMode: "standard",
      playerCount: 1
    })
  });
  if (!response.ok) throw new Error(`Could not create an S21 QA room: ${response.status}`);
  const session = await response.json() as { roomCode?: string };
  if (!session.roomCode) throw new Error("S21 QA room response did not include a room code");
  return session.roomCode;
}

async function main(): Promise<void> {
  const roomCode = await resolveRoomCode();

  const targetResponse = await fetch("http://127.0.0.1:9222/json");
  if (!targetResponse.ok) throw new Error(`Could not list S21 Chrome targets: ${targetResponse.status}`);
  const targets = await targetResponse.json() as CdpTarget[];
  const target = targets.find((entry) => entry.type === "page" && entry.url.startsWith("http://127.0.0.1:5173"))
    ?? targets.find((entry) => entry.type === "page");
  if (!target) throw new Error("No S21 Chrome page target is available");

  const output = path.resolve("reports/ui/s21-operative-selection");
  await mkdir(output, { recursive: true });
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", {
      url: `http://127.0.0.1:5173/?room=${roomCode}&resetAuth=1`
    });
    await waitFor<boolean>(client, "document.readyState === 'complete'");
    await waitFor<boolean>(client, "Boolean(document.querySelector('input[name=playerName]'))");

    await client.evaluate<boolean>(`(() => {
      const input = document.querySelector('input[name="playerName"]');
      if (!(input instanceof HTMLInputElement)) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'S21 QA');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await client.evaluate<boolean>(`(() => {
      const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent?.trim() === 'Join Game');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`);
    await waitFor<boolean>(client, "[...document.querySelectorAll('h1')].some((entry) => entry.textContent?.trim() === 'Choose Piece')");
    await client.evaluate<boolean>(`(() => {
      const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent?.trim() === 'Continue to Operative');
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`);
    await waitFor<boolean>(client, "[...document.querySelectorAll('h1')].some((entry) => entry.textContent?.trim() === 'Choose Operative')");

    const tapPoint = await waitFor<{ x: number; y: number }>(client, `(() => {
      const button = document.querySelector('.phone-character-inspect');
      if (!(button instanceof HTMLButtonElement)) return null;
      button.scrollIntoView({ block: 'center' });
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: tapPoint.x, y: tapPoint.y, radiusX: 4, radiusY: 4, force: 1 }]
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    const inspection = await waitFor<{
      open: boolean;
      operative: string | null;
      statCount: number;
      abilityCount: number;
      footerVisible: boolean;
      viewport: { innerHeight: number; visualHeight: number | null };
      footerRect: { top: number; bottom: number } | null;
      horizontalOverflow: boolean;
      inspectHitTarget: { width: number; height: number } | null;
    }>(client, `(() => {
      const dialog = document.querySelector('.phone-operative-inspection__sheet');
      if (!(dialog instanceof HTMLElement)) return null;
      const footer = dialog.querySelector('.phone-operative-inspection__actions');
      const footerRect = footer?.getBoundingClientRect();
      const inspect = document.querySelector('.phone-character-inspect');
      const inspectRect = inspect?.getBoundingClientRect();
      return {
        open: true,
        operative: dialog.querySelector('h2')?.textContent?.trim() ?? null,
        statCount: dialog.querySelectorAll('.phone-operative-inspection__stats > div').length,
        abilityCount: dialog.querySelectorAll('.phone-operative-inspection__abilities article').length,
        footerVisible: Boolean(footerRect && footerRect.top >= 0 && footerRect.bottom <= (visualViewport?.height ?? innerHeight) + 1),
        viewport: { innerHeight, visualHeight: visualViewport?.height ?? null },
        footerRect: footerRect ? { top: footerRect.top, bottom: footerRect.bottom } : null,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        inspectHitTarget: inspectRect ? { width: inspectRect.width, height: inspectRect.height } : null
      };
    })()`);

    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(output, "s21-operative-inspection.png"), Buffer.from(String(screenshot.data), "base64"));
    const selectPoint = await client.evaluate<{ x: number; y: number } | null>(`(() => {
      const button = document.querySelector('.phone-operative-inspection__actions .phone-button-primary');
      if (!(button instanceof HTMLButtonElement)) return null;
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    let selectedFromDossier = false;
    if (selectPoint) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: selectPoint.x, y: selectPoint.y, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      try {
        selectedFromDossier = await waitFor<boolean>(
          client,
          "!document.querySelector('.phone-operative-inspection__sheet') && [...document.querySelectorAll('h1,h2,h3')].some((entry) => entry.textContent?.trim() === 'Choose Starting Contract')",
          8_000
        );
      } catch {
        selectedFromDossier = false;
      }
    }
    let provisionPickCount = 0;
    let readyAfterTwoProvisions = false;
    let unexpectedThirdProvision = false;
    if (selectedFromDossier) {
      await tapButtonMatching(client, "^Select Contract$");
      await waitFor<boolean>(client, "[...document.querySelectorAll('h1')].some((entry) => entry.textContent?.trim() === 'Choose one provision')");
      for (let pick = 1; pick <= 2; pick += 1) {
        await tapButtonMatching(client, "^Choose (Equipment|Follower)$");
        provisionPickCount = pick;
        if (pick === 1) {
          await waitFor<boolean>(client, "[...document.querySelectorAll('small')].some((entry) => /Pick 2 of 2/i.test(entry.textContent ?? ''))");
        }
      }
      readyAfterTwoProvisions = await waitFor<boolean>(
        client,
        "[...document.querySelectorAll('button')].some((entry) => entry.textContent?.trim() === 'Ready' && !entry.disabled)",
        8_000
      );
      unexpectedThirdProvision = await client.evaluate<boolean>(
        "[...document.querySelectorAll('h1')].some((entry) => entry.textContent?.trim() === 'Choose one provision')"
      );
    }
    const report = {
      device: "Samsung Galaxy S21 SM-G996B",
      roomCode,
      inspection,
      selectedFromDossier,
      startingInventory: {
        provisionPickCount,
        readyAfterTwoProvisions,
        unexpectedThirdProvision
      },
      passed: inspection.open
        && inspection.statCount === 5
        && inspection.abilityCount > 0
        && inspection.footerVisible
        && selectedFromDossier
        && provisionPickCount === 2
        && readyAfterTwoProvisions
        && !unexpectedThirdProvision
        && !inspection.horizontalOverflow
    };
    await writeFile(path.join(output, "s21-operative-inspection.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    client.close();
  }
}

await main();
