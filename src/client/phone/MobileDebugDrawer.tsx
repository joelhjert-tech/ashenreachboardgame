import type { ReactElement } from "react";
import { DebugPanel } from "../shared/DebugPanel.js";
import type { DebugEvent } from "../shared/types.js";

interface MobileDebugDrawerProps {
  events: DebugEvent[];
  onClear: () => void;
  defaultOpen?: boolean;
}

export function MobileDebugDrawer({ events, onClear, defaultOpen = false }: MobileDebugDrawerProps): ReactElement {
  return (
    <details className="phone-debug-drawer" open={defaultOpen}>
      <summary>Debug</summary>
      <DebugPanel events={events} onClear={onClear} title="Phone debug" />
    </details>
  );
}
