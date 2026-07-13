import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputRoot = join(process.cwd(), "public", "assets", "riftfall", "ui");
const lottiePath = join(outputRoot, "dice_roll_combat@2s.lottie.json");
const gifPath = join(outputRoot, "dice_roll_combat@2s.gif");

mkdirSync(outputRoot, { recursive: true });

function shapeLayer(name: string, color: [number, number, number], x: number, y: number, delayFrames: number) {
  return {
    ddd: 0,
    ind: delayFrames + 1,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 9, s: [100] }, { t: 60, s: [100] }] },
      r: {
        a: 1,
        k: [
          { t: 9 + delayFrames, s: [0] },
          { t: 42 + delayFrames, s: [720] },
          { t: 51, s: [0] },
          { t: 60, s: [0] }
        ]
      },
      p: { a: 0, k: [x, y, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 0, s: [95, 95, 100] },
          { t: 9, s: [100, 100, 100] },
          { t: 42, s: [104, 104, 100] },
          { t: 51, s: [96, 96, 100] },
          { t: 60, s: [100, 100, 100] }
        ]
      }
    },
    ao: 0,
    shapes: [
      {
        ty: "gr",
        nm: `${name}_die`,
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [146, 146] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 18 }, nm: "die body" },
          { ty: "fl", c: { a: 0, k: [0.94, 0.97, 0.98, 1] }, o: { a: 0, k: 100 }, nm: "white fill" },
          { ty: "st", c: { a: 0, k: [...color, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 5 }, nm: "edge glow" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ]
      }
    ],
    ip: 0,
    op: 60,
    st: 0,
    bm: 0
  };
}

function textLayer(name: string, text: string, x: number, y: number, size: number, color: [number, number, number]) {
  return {
    ddd: 0,
    ind: Math.floor(x + y),
    ty: 5,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [x, y, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    t: {
      d: {
        k: [
          {
            s: {
              sz: [180, 70],
              ps: [-90, -35],
              s: size,
              f: "Arial-BoldMT",
              t: text,
              j: 2,
              tr: 0,
              lh: size,
              ls: 0,
              fc: color
            },
            t: 0
          }
        ]
      },
      p: {},
      m: { g: 1, a: { a: 0, k: [0, 0] } },
      a: []
    },
    ip: 0,
    op: 60,
    st: 0,
    bm: 0
  };
}

const lottie = {
  v: "5.12.2",
  fr: 30,
  ip: 0,
  op: 60,
  w: 512,
  h: 512,
  nm: "dice_roll_combat@2s",
  ddd: 0,
  assets: [],
  markers: [
    { tm: 9, cm: "roll_start", dr: 0 },
    { tm: 42, cm: "roll_settle", dr: 0 },
    { tm: 51, cm: "result_flash", dr: 0 },
    { tm: 54, cm: "token_launch", dr: 0 }
  ],
  x_ashenReachProps: {
    text: ["attack_value", "defense_value", "modifier_value"],
    boolean: ["attack_success", "defense_success", "has_modifier"],
    token: "A {attack_value} / D {defense_value} / {modifier_value}"
  },
  layers: [
    textLayer("attack_value", "5", 130, 236, 62, [0.08, 0.11, 0.13]),
    textLayer("defense_value", "4", 256, 236, 62, [0.08, 0.11, 0.13]),
    textLayer("modifier_value", "+1", 386, 236, 54, [0.08, 0.11, 0.13]),
    textLayer("hud_token_text", "A 5 / D 4 / +1", 256, 438, 28, [0.96, 0.9, 0.78]),
    shapeLayer("die_attack", [0.95, 0.28, 0.14], 130, 256, 0),
    shapeLayer("die_defense", [0.32, 0.68, 1], 256, 256, 1),
    shapeLayer("die_mod", [0.38, 0.9, 0.48], 386, 256, 2)
  ]
};

writeFileSync(lottiePath, `${JSON.stringify(lottie, null, 2)}\n`);

type RGB = [number, number, number];
const palette: RGB[] = [
  [12, 16, 18],
  [28, 20, 18],
  [240, 246, 248],
  [183, 199, 207],
  [16, 25, 31],
  [235, 88, 45],
  [90, 172, 236],
  [96, 214, 116],
  [245, 226, 196],
  [88, 56, 44],
  [38, 63, 82],
  [33, 78, 44],
  [255, 124, 64],
  [126, 204, 255],
  [128, 238, 148],
  [0, 0, 0]
];

function putWordLE(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function writeSubBlocks(bytes: number[], payload: number[]): void {
  for (let index = 0; index < payload.length; index += 255) {
    const block = payload.slice(index, index + 255);
    bytes.push(block.length, ...block);
  }
  bytes.push(0);
}

function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let nextCode = endCode + 1;
  let codeSize = minCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  const output: number[] = [];
  let dictionary = new Map<string, number>();

  const reset = () => {
    dictionary = new Map<string, number>();
    for (let index = 0; index < clearCode; index += 1) {
      dictionary.set(String(index), index);
    }
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
  };

  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  reset();
  writeCode(clearCode);
  let current = String(indices[0] ?? 0);

  for (let index = 1; index < indices.length; index += 1) {
    const value = indices[index] ?? 0;
    const candidate = `${current},${value}`;

    if (dictionary.has(candidate)) {
      current = candidate;
      continue;
    }

    writeCode(dictionary.get(current) ?? 0);

    if (nextCode < 4096) {
      dictionary.set(candidate, nextCode);
      nextCode += 1;

      if (nextCode === (1 << codeSize) && codeSize < 12) {
        codeSize += 1;
      }
    } else {
      writeCode(clearCode);
      reset();
    }

    current = String(value);
  }

  writeCode(dictionary.get(current) ?? 0);
  writeCode(endCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return output;
}

function setPixel(frame: Uint8Array, x: number, y: number, color: number): void {
  if (x < 0 || y < 0 || x >= 512 || y >= 512) {
    return;
  }

  frame[y * 512 + x] = color;
}

function fillRect(frame: Uint8Array, x: number, y: number, width: number, height: number, color: number): void {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(frame, px, py, color);
    }
  }
}

function fillCircle(frame: Uint8Array, cx: number, cy: number, radius: number, color: number): void {
  const radiusSquared = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(frame, x, y, color);
      }
    }
  }
}

const digitSegments: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
  "+": ["g", "h"],
  "-": ["g"]
};

function drawSegmentDigit(frame: Uint8Array, char: string, x: number, y: number, scale: number, color: number): void {
  const active = new Set(digitSegments[char] ?? []);
  const thickness = Math.max(2, Math.round(scale * 0.18));
  const width = Math.round(scale * 0.75);
  const height = scale;

  if (active.has("a")) fillRect(frame, x, y, width, thickness, color);
  if (active.has("b")) fillRect(frame, x + width - thickness, y, thickness, height / 2, color);
  if (active.has("c")) fillRect(frame, x + width - thickness, y + height / 2, thickness, height / 2, color);
  if (active.has("d")) fillRect(frame, x, y + height - thickness, width, thickness, color);
  if (active.has("e")) fillRect(frame, x, y + height / 2, thickness, height / 2, color);
  if (active.has("f")) fillRect(frame, x, y, thickness, height / 2, color);
  if (active.has("g")) fillRect(frame, x, y + height / 2 - thickness / 2, width, thickness, color);
  if (active.has("h")) fillRect(frame, x + width / 2 - thickness / 2, y + height * 0.2, thickness, height * 0.6, color);
}

function drawText(frame: Uint8Array, text: string, x: number, y: number, scale: number, color: number): void {
  let cursor = x;
  for (const char of text) {
    if (char === " ") {
      cursor += Math.round(scale * 0.45);
      continue;
    }

    if (char === "/" || char.toUpperCase() === "A" || char.toUpperCase() === "D") {
      fillRect(frame, cursor + 2, y + Math.round(scale * 0.2), Math.max(2, Math.round(scale * 0.12)), Math.round(scale * 0.65), color);
      cursor += Math.round(scale * 0.5);
      continue;
    }

    drawSegmentDigit(frame, char, cursor, y, scale, color);
    cursor += Math.round(scale * 0.88);
  }
}

function drawDie(frame: Uint8Array, cx: number, cy: number, size: number, value: string, edgeColor: number, glow: boolean): void {
  if (glow) {
    fillRect(frame, cx - size / 2 - 8, cy - size / 2 - 8, size + 16, size + 16, edgeColor);
  }
  fillRect(frame, cx - size / 2, cy - size / 2, size, size, edgeColor);
  fillRect(frame, cx - size / 2 + 6, cy - size / 2 + 6, size - 12, size - 12, 2);
  drawText(frame, value, cx - size / 5, cy - size / 4, Math.round(size * 0.52), 4);
}

function makeFrame(frameIndex: number): Uint8Array {
  const frame = new Uint8Array(512 * 512);
  frame.fill(0);
  fillCircle(frame, 256, 230, 215, 1);

  const t = frameIndex / 59;
  const tumble = t >= 0.15 && t <= 0.7;
  const settle = t > 0.7 && t < 0.85;
  const flash = t >= 0.85;
  const offset = tumble ? Math.sin(frameIndex * 0.8) * 16 : settle ? Math.sin(frameIndex * 1.3) * 4 : 0;
  const size = tumble ? 112 + Math.round(Math.sin(frameIndex * 0.9) * 9) : 118;
  const attack = tumble ? String((frameIndex % 6) + 1) : "5";
  const defense = tumble ? String(((frameIndex + 2) % 6) + 1) : "4";
  const mod = tumble ? String(((frameIndex + 4) % 6) + 1) : "+1";

  drawDie(frame, 130 + Math.round(offset), 244 - Math.round(offset * 0.35), size, attack, flash ? 12 : 5, flash);
  drawDie(frame, 256 - Math.round(offset * 0.45), 244 + Math.round(offset * 0.2), size, defense, 6, false);
  drawDie(frame, 386 + Math.round(offset * 0.3), 244 + Math.round(offset * 0.4), size, mod, flash ? 14 : 7, flash);

  if (t >= 0.9) {
    const launch = Math.min(1, (t - 0.9) / 0.1);
    const x = 146 + Math.round(130 * launch);
    const y = 410 - Math.round(26 * launch);
    fillRect(frame, x, y, 220, 48, flash ? 5 : 9);
    drawText(frame, "A 5 / D 4 / +1", x + 16, y + 10, 26, 8);
  }

  return frame;
}

const gif: number[] = [];
gif.push(...Buffer.from("GIF89a"));
putWordLE(gif, 512);
putWordLE(gif, 512);
gif.push(0xf3, 0, 0);
for (const [red, green, blue] of palette) {
  gif.push(red, green, blue);
}

for (let frameIndex = 0; frameIndex < 60; frameIndex += 1) {
  const delay = frameIndex % 3 === 0 ? 4 : 3;
  gif.push(0x21, 0xf9, 0x04, 0x00);
  putWordLE(gif, delay);
  gif.push(0, 0);
  gif.push(0x2c);
  putWordLE(gif, 0);
  putWordLE(gif, 0);
  putWordLE(gif, 512);
  putWordLE(gif, 512);
  gif.push(0);
  gif.push(4);
  writeSubBlocks(gif, lzwEncode(makeFrame(frameIndex), 4));
}

gif.push(0x3b);
mkdirSync(dirname(gifPath), { recursive: true });
writeFileSync(gifPath, Buffer.from(gif));

console.log(JSON.stringify({ lottiePath, gifPath }, null, 2));
