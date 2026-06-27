import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { deflateSync } from "node:zlib";
import { imagePrompts, type ImagePromptSpec } from "../src/game/assets/design/imagePrompts.js";

type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

type RenderResult = {
  id: string;
  assetType: string;
  outputPath: string;
  width: number;
  height: number;
  bytes: number;
};

const targetType = process.argv.find((arg) => arg.startsWith("--type="))?.slice("--type=".length);
const reportPath = process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length);

const allowedTypes = new Set([
  "threatCardArt",
  "contractCardArt",
  "anomalyCardArt",
  "artifactCardArt",
  "scarCardArt",
  "escalationCardArt",
  "scenarioSheetArt"
]);

function main(): void {
  const prompts = imagePrompts
    .filter((prompt) => allowedTypes.has(prompt.assetType))
    .filter((prompt) => !targetType || prompt.assetType === targetType)
    .filter((prompt) => !existsSync(resolvePublicPath(prompt.outputPath)));

  const results: RenderResult[] = [];
  for (const prompt of prompts) {
    const rendered = renderPrompt(prompt);
    const png = encodePng(rendered.width, rendered.height, rendered.pixels);
    const outputPath = resolvePublicPath(prompt.outputPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, png);
    results.push({
      id: prompt.id,
      assetType: prompt.assetType,
      outputPath: prompt.outputPath,
      width: rendered.width,
      height: rendered.height,
      bytes: png.length
    });
    console.log(`generated ${prompt.assetType} ${prompt.outputPath} ${rendered.width}x${rendered.height} ${png.length} bytes`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    requestedType: targetType ?? "all",
    generated: results.length,
    byType: countBy(results.map((result) => result.assetType)),
    results
  };

  if (reportPath) {
    const fullReportPath = join(process.cwd(), reportPath.split("/").join(sep));
    mkdirSync(dirname(fullReportPath), { recursive: true });
    writeFileSync(fullReportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
}

function resolvePublicPath(outputPath: string): string {
  return join(process.cwd(), "public", outputPath.replace(/^\//, "").split("/").join(sep));
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((summary, value) => {
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {});
}

function renderPrompt(prompt: ImagePromptSpec): { width: number; height: number; pixels: Uint8Array } {
  const width = prompt.assetType === "scenarioSheetArt" ? 1536 : 1024;
  const height = prompt.assetType === "scenarioSheetArt" ? 1024 : 1536;
  const canvas = new Raster(width, height);
  const seed = stableSeed(`${prompt.id}|${prompt.outputPath}`);
  const palette = choosePalette(prompt);
  paintBackground(canvas, palette, seed);

  if (prompt.assetType === "threatCardArt") {
    renderThreat(canvas, prompt, palette, seed);
  } else if (prompt.assetType === "contractCardArt") {
    renderContract(canvas, prompt, palette, seed);
  } else if (prompt.assetType === "anomalyCardArt") {
    renderAnomaly(canvas, prompt, palette, seed);
  } else if (prompt.assetType === "artifactCardArt") {
    renderArtifact(canvas, prompt, palette, seed);
  } else if (prompt.assetType === "scarCardArt") {
    renderScar(canvas, prompt, palette, seed);
  } else if (prompt.assetType === "escalationCardArt") {
    renderEscalation(canvas, prompt, palette, seed);
  } else {
    renderScenario(canvas, prompt, palette, seed);
  }

  addVignette(canvas, 0.56);
  addFineHighlights(canvas, palette, seed);
  return { width, height, pixels: canvas.pixels };
}

class Raster {
  readonly pixels: Uint8Array;

  constructor(readonly width: number, readonly height: number) {
    this.pixels = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, color: Rgba): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const offset = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    const alpha = clamp(color[3] / 255, 0, 1);
    const inverse = 1 - alpha;
    this.pixels[offset] = Math.round(color[0] * alpha + this.pixels[offset] * inverse);
    this.pixels[offset + 1] = Math.round(color[1] * alpha + this.pixels[offset + 1] * inverse);
    this.pixels[offset + 2] = Math.round(color[2] * alpha + this.pixels[offset + 2] * inverse);
    this.pixels[offset + 3] = 255;
  }

  fillPixel(x: number, y: number, color: Rgb): void {
    const offset = (y * this.width + x) * 4;
    this.pixels[offset] = color[0];
    this.pixels[offset + 1] = color[1];
    this.pixels[offset + 2] = color[2];
    this.pixels[offset + 3] = 255;
  }
}

function paintBackground(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const rand = makeRandom(seed);
  const top = palette.deep;
  const mid = palette.mid;
  const bottom = darken(palette.deep, 0.58);
  const primaryGlow = {
    x: canvas.width * (0.42 + rand() * 0.18),
    y: canvas.height * (0.24 + rand() * 0.18),
    radius: canvas.width * (0.42 + rand() * 0.18),
    color: palette.accent
  };
  const secondaryGlow = {
    x: canvas.width * (0.28 + rand() * 0.44),
    y: canvas.height * (0.62 + rand() * 0.22),
    radius: canvas.width * 0.32,
    color: palette.signal
  };

  for (let y = 0; y < canvas.height; y += 1) {
    const vertical = y / Math.max(1, canvas.height - 1);
    const base = vertical < 0.56 ? mix(top, mid, vertical / 0.56) : mix(mid, bottom, (vertical - 0.56) / 0.44);
    for (let x = 0; x < canvas.width; x += 1) {
      const g1 = radial(x, y, primaryGlow.x, primaryGlow.y, primaryGlow.radius);
      const g2 = radial(x, y, secondaryGlow.x, secondaryGlow.y, secondaryGlow.radius);
      const color = mix(mix(base, primaryGlow.color, g1 * 0.48), secondaryGlow.color, g2 * 0.22);
      canvas.fillPixel(x, y, color);
    }
  }
}

function renderThreat(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const text = normalized(prompt);
  const cx = canvas.width * 0.5;
  const ground = canvas.height * 0.78;
  drawGround(canvas, ground, palette, seed);
  drawAtmosphericSpires(canvas, palette, seed, 10);

  if (text.includes("hazard") || text.includes("storm") || text.includes("sickness") || text.includes("squall") || text.includes("trap")) {
    drawRift(canvas, cx, canvas.height * 0.43, canvas.width * 0.32, canvas.height * 0.24, palette.anomaly);
    drawLightning(canvas, seed, palette.signal, 13);
    drawShardField(canvas, palette, seed, 34);
    return;
  }

  if (text.includes("drone") || text.includes("machine") || text.includes("judicator")) {
    drawMachine(canvas, cx, canvas.height * 0.49, canvas.width * 0.22, canvas.height * 0.3, palette);
    return;
  }

  if (text.includes("vine") || text.includes("leech") || text.includes("ghoul") || text.includes("vermin")) {
    drawBeast(canvas, cx, canvas.height * 0.56, canvas.width * 0.28, canvas.height * 0.2, palette);
    return;
  }

  drawHumanoid(canvas, cx, canvas.height * 0.52, canvas.width * 0.28, canvas.height * 0.34, palette);
}

function renderContract(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const cx = canvas.width * 0.5;
  drawGround(canvas, canvas.height * 0.76, palette, seed);
  drawRoad(canvas, palette, seed);
  drawGate(canvas, cx, canvas.height * 0.47, canvas.width * 0.42, canvas.height * 0.34, palette.brass);
  if (normalized(prompt).includes("courier") || normalized(prompt).includes("route") || normalized(prompt).includes("guide")) {
    drawSignalBeacons(canvas, palette, seed, 5);
  } else {
    drawArtifactCore(canvas, cx, canvas.height * 0.48, canvas.width * 0.13, palette);
  }
}

function renderAnomaly(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.47;
  drawAtmosphericSpires(canvas, palette, seed, 8);
  drawRift(canvas, cx, cy, canvas.width * 0.35, canvas.height * 0.27, palette.anomaly);
  drawConcentricBrokenRings(canvas, cx, cy, canvas.width * 0.12, palette);
  drawLightning(canvas, seed, palette.signal, 18);
}

function renderArtifact(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.48;
  drawGround(canvas, canvas.height * 0.78, palette, seed);
  drawAtmosphericSpires(canvas, palette, seed, 6);
  drawArtifactCore(canvas, cx, cy, canvas.width * 0.18, palette);
  if (normalized(prompt).includes("key") || normalized(prompt).includes("compass")) {
    drawLine(canvas, cx, cy - canvas.height * 0.2, cx, cy + canvas.height * 0.22, rgba(palette.brass, 245), 16);
    drawCircle(canvas, cx, cy - canvas.height * 0.24, canvas.width * 0.075, rgba(palette.brass, 210), false, 14);
  }
}

function renderScar(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.48;
  drawGround(canvas, canvas.height * 0.77, palette, seed);
  drawMask(canvas, cx, cy, canvas.width * 0.27, canvas.height * 0.31, palette);
  drawCracks(canvas, cx, cy, canvas.width * 0.21, canvas.height * 0.24, palette.accent, seed);
}

function renderEscalation(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const horizon = canvas.height * 0.62;
  drawGround(canvas, horizon, palette, seed);
  drawAtmosphericSpires(canvas, palette, seed, 16);
  drawRift(canvas, canvas.width * 0.5, canvas.height * 0.33, canvas.width * 0.42, canvas.height * 0.18, palette.anomaly);
  drawLightning(canvas, seed, palette.accent, 24);
  drawSignalBeacons(canvas, palette, seed, 7);
}

function renderScenario(canvas: Raster, prompt: ImagePromptSpec, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.48;
  drawGround(canvas, canvas.height * 0.72, palette, seed);
  drawAtmosphericSpires(canvas, palette, seed, 22);
  drawGate(canvas, cx, cy, canvas.width * 0.34, canvas.height * 0.34, palette.brass);
  drawRift(canvas, cx, cy - canvas.height * 0.03, canvas.width * 0.24, canvas.height * 0.18, palette.anomaly);
  drawLightning(canvas, seed, palette.signal, 28);
  drawShardField(canvas, palette, seed, 46);
}

function drawGround(canvas: Raster, horizon: number, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const rand = makeRandom(seed + 99);
  const points: Array<[number, number]> = [[-20, canvas.height + 20]];
  for (let i = 0; i <= 10; i += 1) {
    const x = (canvas.width * i) / 10;
    const y = horizon + (rand() - 0.5) * canvas.height * 0.12;
    points.push([x, y]);
  }
  points.push([canvas.width + 20, canvas.height + 20]);
  fillPolygon(canvas, points, rgba(darken(palette.deep, 0.42), 245));
  for (let i = 0; i < 18; i += 1) {
    const x = rand() * canvas.width;
    const y = horizon + rand() * (canvas.height - horizon);
    drawLine(canvas, x, y, x + (rand() - 0.5) * canvas.width * 0.22, y - rand() * canvas.height * 0.08, rgba(palette.brass, 60), 3);
  }
}

function drawAtmosphericSpires(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number, count: number): void {
  const rand = makeRandom(seed + 313);
  for (let i = 0; i < count; i += 1) {
    const baseX = rand() * canvas.width;
    const baseY = canvas.height * (0.6 + rand() * 0.22);
    const height = canvas.height * (0.16 + rand() * 0.32);
    const width = canvas.width * (0.015 + rand() * 0.035);
    fillPolygon(
      canvas,
      [
        [baseX - width, baseY],
        [baseX + width, baseY],
        [baseX + width * 0.25, baseY - height],
        [baseX - width * 0.2, baseY - height * (0.88 + rand() * 0.18)]
      ],
      rgba(mix(palette.deep, palette.mid, 0.38), 130)
    );
    drawLine(canvas, baseX, baseY - height * 0.9, baseX + (rand() - 0.5) * width * 5, baseY - height * 1.14, rgba(palette.signal, 70), 2);
  }
}

function drawHumanoid(canvas: Raster, cx: number, cy: number, width: number, height: number, palette: ReturnType<typeof choosePalette>): void {
  const shadow = rgba(darken(palette.deep, 0.2), 245);
  drawEllipse(canvas, cx, cy - height * 0.32, width * 0.14, height * 0.11, shadow, true, 1);
  fillPolygon(canvas, [[cx - width * 0.18, cy - height * 0.18], [cx + width * 0.18, cy - height * 0.18], [cx + width * 0.26, cy + height * 0.23], [cx, cy + height * 0.38], [cx - width * 0.25, cy + height * 0.23]], shadow);
  drawLine(canvas, cx - width * 0.09, cy + height * 0.1, cx - width * 0.27, cy + height * 0.45, shadow, 18);
  drawLine(canvas, cx + width * 0.09, cy + height * 0.1, cx + width * 0.27, cy + height * 0.45, shadow, 18);
  drawLine(canvas, cx - width * 0.18, cy - height * 0.08, cx - width * 0.44, cy + height * 0.09, shadow, 18);
  drawLine(canvas, cx + width * 0.18, cy - height * 0.08, cx + width * 0.46, cy - height * 0.19, shadow, 18);
  drawLine(canvas, cx + width * 0.34, cy - height * 0.26, cx + width * 0.62, cy - height * 0.48, rgba(palette.accent, 230), 12);
  drawCircle(canvas, cx, cy - height * 0.14, width * 0.08, rgba(palette.accent, 210), true);
  drawCircle(canvas, cx, cy - height * 0.32, width * 0.035, rgba(palette.signal, 220), true);
}

function drawMachine(canvas: Raster, cx: number, cy: number, width: number, height: number, palette: ReturnType<typeof choosePalette>): void {
  const body = rgba(darken(palette.mid, 0.48), 245);
  fillPolygon(canvas, [[cx, cy - height * 0.36], [cx + width * 0.33, cy - height * 0.08], [cx + width * 0.24, cy + height * 0.28], [cx - width * 0.25, cy + height * 0.28], [cx - width * 0.34, cy - height * 0.08]], body);
  drawCircle(canvas, cx, cy - height * 0.06, width * 0.18, rgba(palette.signal, 210), false, 12);
  for (const side of [-1, 1]) {
    drawLine(canvas, cx + side * width * 0.2, cy, cx + side * width * 0.56, cy + height * 0.25, body, 18);
    drawLine(canvas, cx + side * width * 0.3, cy + height * 0.16, cx + side * width * 0.5, cy + height * 0.48, rgba(palette.brass, 210), 10);
    drawCircle(canvas, cx + side * width * 0.62, cy + height * 0.27, width * 0.05, rgba(palette.accent, 220), true);
  }
}

function drawBeast(canvas: Raster, cx: number, cy: number, width: number, height: number, palette: ReturnType<typeof choosePalette>): void {
  const body = rgba(darken(palette.deep, 0.25), 245);
  drawEllipse(canvas, cx, cy, width * 0.38, height * 0.33, body, true);
  drawEllipse(canvas, cx + width * 0.31, cy - height * 0.13, width * 0.16, height * 0.15, body, true);
  for (const offset of [-0.26, -0.08, 0.12, 0.3]) {
    drawLine(canvas, cx + width * offset, cy + height * 0.18, cx + width * (offset - 0.12), cy + height * 0.5, body, 14);
  }
  fillPolygon(canvas, [[cx + width * 0.36, cy - height * 0.17], [cx + width * 0.62, cy - height * 0.28], [cx + width * 0.43, cy - height * 0.04]], rgba(palette.accent, 230));
  for (let i = 0; i < 5; i += 1) {
    drawLine(canvas, cx - width * 0.18 + i * width * 0.08, cy - height * 0.22, cx - width * 0.26 + i * width * 0.1, cy - height * 0.48, rgba(palette.signal, 140), 5);
  }
}

function drawRoad(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const rand = makeRandom(seed + 17);
  const bottom = canvas.height;
  const horizon = canvas.height * 0.57;
  fillPolygon(canvas, [[canvas.width * 0.32, bottom], [canvas.width * 0.68, bottom], [canvas.width * 0.54, horizon], [canvas.width * 0.46, horizon]], rgba(darken(palette.brass, 0.42), 150));
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const y = bottom * (1 - t) + horizon * t;
    const half = canvas.width * (0.18 * (1 - t) + 0.035 * t);
    drawLine(canvas, canvas.width * 0.5 - half, y, canvas.width * 0.5 + half, y - rand() * 8, rgba(palette.accent, 90), 4);
  }
}

function drawGate(canvas: Raster, cx: number, cy: number, width: number, height: number, color: Rgb): void {
  const gate = rgba(color, 210);
  drawLine(canvas, cx - width * 0.38, cy + height * 0.42, cx - width * 0.36, cy - height * 0.22, gate, 24);
  drawLine(canvas, cx + width * 0.38, cy + height * 0.42, cx + width * 0.36, cy - height * 0.22, gate, 24);
  drawLine(canvas, cx - width * 0.36, cy - height * 0.22, cx, cy - height * 0.44, gate, 18);
  drawLine(canvas, cx, cy - height * 0.44, cx + width * 0.36, cy - height * 0.22, gate, 18);
  drawCircle(canvas, cx, cy - height * 0.16, width * 0.14, rgba(color, 110), false, 10);
}

function drawArtifactCore(canvas: Raster, cx: number, cy: number, radius: number, palette: ReturnType<typeof choosePalette>): void {
  drawCircle(canvas, cx, cy, radius * 1.45, rgba(palette.signal, 54), true);
  drawCircle(canvas, cx, cy, radius, rgba(palette.brass, 225), false, 14);
  fillPolygon(canvas, [[cx, cy - radius * 1.24], [cx + radius * 0.72, cy], [cx, cy + radius * 1.24], [cx - radius * 0.72, cy]], rgba(darken(palette.deep, 0.35), 245));
  drawCircle(canvas, cx, cy, radius * 0.34, rgba(palette.accent, 235), true);
  drawCircle(canvas, cx, cy, radius * 0.62, rgba(palette.signal, 150), false, 7);
}

function drawRift(canvas: Raster, cx: number, cy: number, rx: number, ry: number, color: Rgb): void {
  drawEllipse(canvas, cx, cy, rx, ry, rgba(color, 66), true);
  drawEllipse(canvas, cx, cy, rx * 0.63, ry * 0.72, rgba(color, 110), false, 12);
  drawEllipse(canvas, cx, cy, rx * 0.24, ry * 0.95, rgba(color, 190), true);
  drawLine(canvas, cx - rx * 0.12, cy - ry * 0.9, cx + rx * 0.15, cy + ry * 0.86, rgba(color, 235), 10);
}

function drawConcentricBrokenRings(canvas: Raster, cx: number, cy: number, baseRadius: number, palette: ReturnType<typeof choosePalette>): void {
  for (let i = 0; i < 4; i += 1) {
    const radius = baseRadius * (1 + i * 0.62);
    drawCircle(canvas, cx, cy, radius, rgba(i % 2 === 0 ? palette.signal : palette.brass, 120), false, 5);
  }
}

function drawMask(canvas: Raster, cx: number, cy: number, width: number, height: number, palette: ReturnType<typeof choosePalette>): void {
  const mask = rgba(mix(palette.brass, [230, 218, 184], 0.5), 235);
  drawEllipse(canvas, cx, cy, width, height, mask, true);
  drawEllipse(canvas, cx - width * 0.34, cy - height * 0.1, width * 0.11, height * 0.08, rgba(palette.deep, 230), true);
  drawEllipse(canvas, cx + width * 0.34, cy - height * 0.1, width * 0.11, height * 0.08, rgba(palette.deep, 230), true);
  fillPolygon(canvas, [[cx, cy + height * 0.03], [cx + width * 0.1, cy + height * 0.28], [cx - width * 0.1, cy + height * 0.28]], rgba(darken(palette.brass, 0.55), 220));
}

function drawCracks(canvas: Raster, cx: number, cy: number, width: number, height: number, color: Rgb, seed: number): void {
  const rand = makeRandom(seed + 211);
  for (let i = 0; i < 12; i += 1) {
    let x = cx + (rand() - 0.5) * width;
    let y = cy + (rand() - 0.5) * height;
    for (let step = 0; step < 3; step += 1) {
      const nx = x + (rand() - 0.5) * width * 0.32;
      const ny = y + (rand() - 0.5) * height * 0.32;
      drawLine(canvas, x, y, nx, ny, rgba(color, 210), 4);
      x = nx;
      y = ny;
    }
  }
}

function drawLightning(canvas: Raster, seed: number, color: Rgb, count: number): void {
  const rand = makeRandom(seed + 781);
  for (let i = 0; i < count; i += 1) {
    let x = rand() * canvas.width;
    let y = rand() * canvas.height * 0.58;
    for (let step = 0; step < 4; step += 1) {
      const nx = x + (rand() - 0.5) * canvas.width * 0.16;
      const ny = y + canvas.height * (0.05 + rand() * 0.08);
      drawLine(canvas, x, y, nx, ny, rgba(color, 80 + rand() * 90), 2 + Math.floor(rand() * 3));
      x = nx;
      y = ny;
    }
  }
}

function drawSignalBeacons(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number, count: number): void {
  const rand = makeRandom(seed + 404);
  for (let i = 0; i < count; i += 1) {
    const x = canvas.width * (0.18 + (i / Math.max(1, count - 1)) * 0.64) + (rand() - 0.5) * canvas.width * 0.08;
    const y = canvas.height * (0.54 + rand() * 0.18);
    drawLine(canvas, x, y, x, y - canvas.height * (0.18 + rand() * 0.12), rgba(darken(palette.deep, 0.28), 230), 10);
    drawCircle(canvas, x, y - canvas.height * 0.2, canvas.width * 0.025, rgba(palette.signal, 225), true);
    drawCircle(canvas, x, y - canvas.height * 0.2, canvas.width * 0.07, rgba(palette.signal, 42), true);
  }
}

function drawShardField(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number, count: number): void {
  const rand = makeRandom(seed + 535);
  for (let i = 0; i < count; i += 1) {
    const x = rand() * canvas.width;
    const y = canvas.height * (0.16 + rand() * 0.62);
    const size = canvas.width * (0.012 + rand() * 0.038);
    fillPolygon(canvas, [[x, y - size], [x + size * 0.48, y], [x + size * 0.1, y + size * 1.4], [x - size * 0.52, y + size * 0.2]], rgba(rand() > 0.5 ? palette.signal : palette.brass, 70 + rand() * 80));
  }
}

function addFineHighlights(canvas: Raster, palette: ReturnType<typeof choosePalette>, seed: number): void {
  const rand = makeRandom(seed + 999);
  for (let i = 0; i < 90; i += 1) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const alpha = 18 + rand() * 52;
    drawCircle(canvas, x, y, 1 + rand() * 2.5, rgba(rand() > 0.5 ? palette.signal : palette.accent, alpha), true);
  }
}

function addVignette(canvas: Raster, amount: number): void {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxDistance = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const t = Math.max(0, Math.sqrt(dx * dx + dy * dy) / maxDistance - 0.34) / 0.66;
      const dark = clamp(t * amount, 0, 0.82);
      const offset = (y * canvas.width + x) * 4;
      canvas.pixels[offset] = Math.round(canvas.pixels[offset] * (1 - dark));
      canvas.pixels[offset + 1] = Math.round(canvas.pixels[offset + 1] * (1 - dark));
      canvas.pixels[offset + 2] = Math.round(canvas.pixels[offset + 2] * (1 - dark));
    }
  }
}

function drawCircle(canvas: Raster, cx: number, cy: number, radius: number, color: Rgba, fill: boolean, stroke = 1): void {
  const minX = Math.floor(cx - radius - stroke);
  const maxX = Math.ceil(cx + radius + stroke);
  const minY = Math.floor(cy - radius - stroke);
  const maxY = Math.ceil(cy + radius + stroke);
  const inner = Math.max(0, radius - stroke);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if ((fill && distance <= radius) || (!fill && distance <= radius && distance >= inner)) {
        canvas.set(x, y, color);
      }
    }
  }
}

function drawEllipse(canvas: Raster, cx: number, cy: number, rx: number, ry: number, color: Rgba, fill: boolean, stroke = 1): void {
  const minX = Math.floor(cx - rx - stroke);
  const maxX = Math.ceil(cx + rx + stroke);
  const minY = Math.floor(cy - ry - stroke);
  const maxY = Math.ceil(cy + ry + stroke);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const value = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
      if ((fill && value <= 1) || (!fill && value <= 1 && value >= 1 - stroke / Math.max(rx, ry))) {
        canvas.set(x, y, color);
      }
    }
  }
}

function drawLine(canvas: Raster, x1: number, y1: number, x2: number, y2: number, color: Rgba, width: number): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  const radius = Math.max(1, width / 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    drawCircle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, color, true);
  }
}

function fillPolygon(canvas: Raster, points: Array<[number, number]>, color: Rgba): void {
  const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
  const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
  for (let y = minY; y <= maxY; y += 1) {
    const nodes: number[] = [];
    let j = points.length - 1;
    for (let i = 0; i < points.length; i += 1) {
      const pi = points[i];
      const pj = points[j];
      if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
        nodes.push(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0]));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) {
      if (nodes[i + 1] === undefined) break;
      const start = Math.max(0, Math.floor(nodes[i]));
      const end = Math.min(canvas.width - 1, Math.ceil(nodes[i + 1]));
      for (let x = start; x <= end; x += 1) {
        canvas.set(x, y, color);
      }
    }
  }
}

function choosePalette(prompt: ImagePromptSpec): {
  deep: Rgb;
  mid: Rgb;
  accent: Rgb;
  signal: Rgb;
  brass: Rgb;
  anomaly: Rgb;
} {
  const text = normalized(prompt);
  const base = {
    deep: [14, 16, 20] as Rgb,
    mid: [46, 51, 58] as Rgb,
    accent: [228, 100, 55] as Rgb,
    signal: [138, 220, 245] as Rgb,
    brass: [200, 155, 84] as Rgb,
    anomaly: [160, 84, 218] as Rgb
  };

  if (prompt.assetType === "anomalyCardArt" || text.includes("mirror") || text.includes("void") || text.includes("webglass")) {
    return { ...base, deep: [17, 13, 28], mid: [54, 38, 82], accent: [184, 91, 232] };
  }
  if (prompt.assetType === "artifactCardArt" || text.includes("saint") || text.includes("brass") || text.includes("ledger")) {
    return { ...base, deep: [22, 20, 17], mid: [72, 56, 34], accent: [235, 178, 84] };
  }
  if (prompt.assetType === "contractCardArt" || text.includes("cartel") || text.includes("compact")) {
    return { ...base, deep: [15, 21, 24], mid: [50, 62, 60], accent: [111, 225, 171] };
  }
  if (prompt.assetType === "scarCardArt") {
    return { ...base, deep: [25, 13, 17], mid: [82, 38, 43], accent: [238, 76, 66] };
  }
  if (prompt.assetType === "escalationCardArt") {
    return { ...base, deep: [19, 14, 16], mid: [93, 42, 35], accent: [255, 128, 50] };
  }
  if (text.includes("choir") || text.includes("relay") || text.includes("signal")) {
    return { ...base, deep: [11, 20, 30], mid: [36, 68, 89], accent: [145, 221, 246] };
  }
  if (text.includes("salt") || text.includes("sickness") || text.includes("tide")) {
    return { ...base, deep: [12, 25, 21], mid: [43, 88, 62], accent: [130, 226, 146] };
  }
  return base;
}

function normalized(prompt: ImagePromptSpec): string {
  return `${prompt.id} ${prompt.outputPath} ${prompt.usage} ${prompt.prompt}`.toLowerCase();
}

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radial(x: number, y: number, cx: number, cy: number, radius: number): number {
  return Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius) ** 2;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const clamped = clamp(t, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped)
  ];
}

function darken(color: Rgb, amount: number): Rgb {
  return [Math.round(color[0] * amount), Math.round(color[1] * amount), Math.round(color[2] * amount)];
}

function rgba(color: Rgb, alpha: number): Rgba {
  return [color[0], color[1], color[2], Math.round(clamp(alpha, 0, 255))];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function encodePng(width: number, height: number, rgbaPixels: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgbaPixels.buffer, rgbaPixels.byteOffset + y * width * 4, width * 4).copy(raw, rowStart + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr(width, height)),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function ihdr(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main();
