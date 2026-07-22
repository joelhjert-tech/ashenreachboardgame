export const presentationStatus = {
  yourTurn: "YOUR TURN",
  waiting: "WAITING",
  actionRequired: "ACTION REQUIRED",
  submitting: "SUBMITTING",
  rolling: "ROLLING",
  choosing: "CHOOSING",
  moving: "MOVING",
  resolving: "RESOLVING",
  result: "RESULT",
  continue: "CONTINUE",
  endTurn: "END TURN",
  purchasing: "PURCHASING",
  selling: "SELLING",
  leaving: "LEAVING",
  reconnecting: "RECONNECTING",
  connectionLost: "CONNECTION LOST",
  restoring: "RESTORING",
  ready: "READY",
  loading: "LOADING",
  blocked: "ACTION BLOCKED",
  resultReady: "RESULT READY",
  turnReady: "TURN READY"
} as const;

export const artworkRatios = {
  operative: "3 / 4",
  enemy: "3 / 4",
  encounterCard: "5 / 7",
  item: "5 / 7",
  artifact: "5 / 7",
  mission: "16 / 9",
  shop: "16 / 9",
  hostHero: "21 / 9",
  mapTile: "1 / 1"
} as const;

export const presentationCssVariables = {
  phoneSafeTop: "--phone-safe-top",
  phoneSafeRight: "--phone-safe-right",
  phoneSafeBottom: "--phone-safe-bottom",
  phoneSafeLeft: "--phone-safe-left",
  phoneNavigationHeight: "--phone-bottom-nav-height",
  phoneActionClearance: "--phone-action-clearance",
  touchTarget: "--touch-target-min"
} as const;
