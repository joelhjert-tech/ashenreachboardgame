export interface GateConnection {
  id: string;
  from: string;
  to: string;
  requirement: string;
  notes?: string;
}

export const GATE_CONNECTIONS: GateConnection[] = [
  {
    id: "mirecoil-beacon-escalation-lane",
    from: "mirecoil-beacon",
    to: "emberwatch-step",
    requirement: "Stabilize the beacon interval or weather the flareline on approach.",
    notes: "Temporary explicit route until deeper-tier sectors are added to content."
  }
];

export function findGateConnectionsForTile(tileId: string): GateConnection[] {
  return GATE_CONNECTIONS.filter((connection) => connection.from === tileId || connection.to === tileId);
}
