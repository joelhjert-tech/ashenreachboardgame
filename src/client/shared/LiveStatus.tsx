import { useEffect, useRef, useState, type ReactElement } from "react";

interface LiveStatusProps {
  message: string | null | undefined;
  revision?: string | number | null;
  priority?: "polite" | "assertive";
  visible?: boolean;
  className?: string;
}

export function LiveStatus({ message, revision = null, priority = "polite", visible = false, className = "" }: LiveStatusProps): ReactElement {
  const lastKey = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const normalized = message?.trim() ?? "";
    if (!normalized) {
      setAnnouncement("");
      return;
    }
    const key = `${revision ?? "message"}:${normalized}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    setAnnouncement(normalized);
  }, [message, revision]);

  return (
    <span className={`${visible ? "shared-live-status" : "visually-hidden"}${className ? ` ${className}` : ""}`} role={priority === "assertive" ? "alert" : "status"} aria-live={priority} aria-atomic="true">
      {announcement}
    </span>
  );
}
