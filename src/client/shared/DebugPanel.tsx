import type { ReactElement } from "react";
import type { DebugEvent } from "./types.js";

interface DebugPanelProps {
  events: DebugEvent[];
  onClear: () => void;
  title?: string;
}

function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function DebugPanel({ events, onClear, title = "Debug log" }: DebugPanelProps): ReactElement {
  return (
    <section className="panel nested-panel debug-panel">
      <div className="row-between">
        <div>
          <h2>{title}</h2>
          <p>Recent socket activity, sent inputs, and server responses.</p>
        </div>
        <button type="button" onClick={onClear}>
          Clear log
        </button>
      </div>
      <div className="debug-log" role="log" aria-live="polite">
        {events.length === 0 && <p>No debug events yet.</p>}
        {events.map((event) => (
          <article key={event.id} className="debug-entry">
            <div className="debug-entry-header">
              <strong>{event.label}</strong>
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            {event.detail && <p>{event.detail}</p>}
            <pre>{formatPayload(event.payload)}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}
