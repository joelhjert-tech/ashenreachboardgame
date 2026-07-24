export type SignalJourneyPathVariant =
  | "fracture"
  | "switchback"
  | "rising-arc"
  | "sunken-arc"
  | "relay-zigzag"
  | "broken-crown";

export interface SignalJourneyPoint {
  x: number;
  y: number;
}

export interface SignalJourneyPathModel {
  variant: SignalJourneyPathVariant;
  points: SignalJourneyPoint[];
  sampledPoints: SignalJourneyPoint[];
  sampleDistances: number[];
  totalLength: number;
  path: string;
}

const variants: Record<SignalJourneyPathVariant, SignalJourneyPoint[]> = {
  fracture: [
    { x: 55, y: 142 }, { x: 188, y: 116 }, { x: 318, y: 157 },
    { x: 448, y: 91 }, { x: 582, y: 121 }, { x: 720, y: 76 }, { x: 945, y: 133 }
  ],
  switchback: [
    { x: 55, y: 128 }, { x: 178, y: 73 }, { x: 316, y: 139 },
    { x: 455, y: 65 }, { x: 594, y: 148 }, { x: 738, y: 92 }, { x: 945, y: 117 }
  ],
  "rising-arc": [
    { x: 55, y: 158 }, { x: 187, y: 137 }, { x: 319, y: 101 },
    { x: 456, y: 68 }, { x: 592, y: 76 }, { x: 729, y: 111 }, { x: 945, y: 151 }
  ],
  "sunken-arc": [
    { x: 55, y: 79 }, { x: 185, y: 103 }, { x: 319, y: 143 },
    { x: 456, y: 164 }, { x: 592, y: 143 }, { x: 729, y: 104 }, { x: 945, y: 76 }
  ],
  "relay-zigzag": [
    { x: 55, y: 135 }, { x: 187, y: 83 }, { x: 318, y: 118 },
    { x: 455, y: 86 }, { x: 592, y: 136 }, { x: 731, y: 99 }, { x: 945, y: 130 }
  ],
  "broken-crown": [
    { x: 55, y: 151 }, { x: 184, y: 111 }, { x: 318, y: 124 },
    { x: 455, y: 54 }, { x: 590, y: 124 }, { x: 730, y: 110 }, { x: 945, y: 151 }
  ]
};

const variantOrder = Object.keys(variants) as SignalJourneyPathVariant[];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function quadraticPoint(
  start: SignalJourneyPoint,
  control: SignalJourneyPoint,
  end: SignalJourneyPoint,
  progress: number
): SignalJourneyPoint {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y
  };
}

function sampleSmoothedPath(points: SignalJourneyPoint[], samplesPerCurve = 12): SignalJourneyPoint[] {
  if (points.length < 2) return points.map((point) => ({ ...point }));
  const sampled = [{ ...points[0]! }];
  let start = points[0]!;

  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index]!;
    const next = points[index + 1]!;
    const end = {
      x: (control.x + next.x) / 2,
      y: (control.y + next.y) / 2
    };
    for (let sample = 1; sample <= samplesPerCurve; sample += 1) {
      sampled.push(quadraticPoint(start, control, end, sample / samplesPerCurve));
    }
    start = end;
  }

  const finalPoint = points.at(-1)!;
  for (let sample = 1; sample <= samplesPerCurve; sample += 1) {
    sampled.push(quadraticPoint(start, finalPoint, finalPoint, sample / samplesPerCurve));
  }
  return sampled;
}

function buildDistanceTable(points: SignalJourneyPoint[]): { distances: number[]; totalLength: number } {
  const distances = [0];
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    totalLength += Math.hypot(current.x - previous.x, current.y - previous.y);
    distances.push(totalLength);
  }
  return { distances, totalLength };
}

function pathFromSamples(points: SignalJourneyPoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function getSignalJourneyPathModel(
  route: readonly string[],
  _currentSectorId: string,
  _crossingRings: boolean
): SignalJourneyPathModel {
  const signature = route.join(">");
  const variant = variantOrder[stableHash(signature) % variantOrder.length]!;
  const points = variants[variant].map((point) => ({ ...point }));
  const sampledPoints = sampleSmoothedPath(points);
  const { distances: sampleDistances, totalLength } = buildDistanceTable(sampledPoints);
  return {
    variant,
    points,
    sampledPoints,
    sampleDistances,
    totalLength,
    path: pathFromSamples(sampledPoints)
  };
}

export function getSignalJourneyPoint(
  model: SignalJourneyPathModel,
  progress: number
): SignalJourneyPoint {
  const bounded = Math.max(0, Math.min(1, progress));
  const targetDistance = bounded * model.totalLength;
  let upperIndex = model.sampleDistances.findIndex((distance) => distance >= targetDistance);
  if (upperIndex <= 0) return { ...model.sampledPoints[0]! };
  if (upperIndex < 0) upperIndex = model.sampledPoints.length - 1;
  const lowerIndex = upperIndex - 1;
  const lowerDistance = model.sampleDistances[lowerIndex]!;
  const upperDistance = model.sampleDistances[upperIndex]!;
  const segmentLength = Math.max(Number.EPSILON, upperDistance - lowerDistance);
  const local = (targetDistance - lowerDistance) / segmentLength;
  const from = model.sampledPoints[lowerIndex]!;
  const to = model.sampledPoints[upperIndex]!;
  return {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local
  };
}
