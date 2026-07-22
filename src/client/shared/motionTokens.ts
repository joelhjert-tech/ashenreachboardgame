export const motionDurations = {
  instant: "80ms",
  quick: "140ms",
  normal: "220ms",
  deliberate: "360ms",
  cinematic: "520ms",
  heavy: "760ms"
} as const;

export const motionEasings = {
  command: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  impact: "cubic-bezier(0.16, 1, 0.3, 1)",
  warning: "cubic-bezier(0.4, 0, 0.2, 1)",
  snap: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  fade: "ease-out"
} as const;

export const hostPresentationTimings = {
  encounterRevealMs: 460,
  cardFlipMs: 840,
  encounterSettleMs: 420,
  participantEntranceMs: 620,
  diceRollMs: 1200,
  modifierRevealMs: 340,
  totalSettleMs: 520,
  resultEmphasisMs: 900,
  movementStartMs: 300,
  movementSegmentMs: 520,
  movementCrossRingMs: 680,
  movementArrivalMs: 600
} as const;

export const motionCssVariables = {
  instant: "--motion-instant",
  quick: "--motion-quick",
  normal: "--motion-normal",
  deliberate: "--motion-deliberate",
  cinematic: "--motion-cinematic",
  heavy: "--motion-heavy",
  command: "--ease-command",
  impact: "--ease-impact",
  warning: "--ease-warning",
  snap: "--ease-snap",
  fade: "--ease-fade"
} as const;

export const motionClassNames = {
  tokenStep: "motion-token-step",
  routeGlow: "motion-route-glow",
  diceThrow: "motion-dice-throw",
  cardFlip: "motion-card-flip",
  woundReveal: "motion-wound-reveal",
  battleImpact: "motion-battle-impact",
  rewardPulse: "motion-reward-pulse",
  shopTransaction: "motion-shop-transaction",
  scenarioProgress: "motion-scenario-progress",
  tabEnter: "motion-tab-enter",
  tabExit: "motion-tab-exit",
  invalidAction: "motion-invalid-action",
  networkStatus: "motion-network-status",
  reducedFallback: "motion-reduced-fallback"
} as const;

export type MotionDurationToken = keyof typeof motionDurations;
export type MotionEasingToken = keyof typeof motionEasings;
export type MotionClassToken = keyof typeof motionClassNames;
