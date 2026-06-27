import { useEffect, useState, type ReactElement } from "react";
import QRCode from "qrcode";

interface JoinQrCardProps {
  roomCode: string;
  variant?: "full" | "compact";
}

function buildJoinUrl(roomCode: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("roomCode", roomCode);
  return url.toString();
}

export function JoinQrCard({ roomCode, variant = "full" }: JoinQrCardProps): ReactElement {
  const [qrMarkup, setQrMarkup] = useState<string>("");
  const joinUrl = buildJoinUrl(roomCode);
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const hasLocalhostHost = hostname === "localhost" || hostname === "127.0.0.1";

  useEffect(() => {
    let cancelled = false;

    QRCode.toString(joinUrl, {
      type: "svg",
      margin: 1,
      width: 320,
      color: {
        dark: "#f2efe6",
        light: "#1a1412"
      }
    })
      .then((svg) => {
        if (!cancelled) {
          setQrMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrMarkup("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  if (variant === "compact") {
    return (
      <section className="join-qr-card join-qr-card-compact">
        <div>
          <h2>Scan to Join</h2>
          <p>Players 1-6</p>
        </div>
        <div className="join-qr-frame" aria-label={`QR code to join room ${roomCode}`}>
          {qrMarkup ? <div dangerouslySetInnerHTML={{ __html: qrMarkup }} /> : <p>Generating code...</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="join-qr-card join-qr-card-full">
      <div>
        <h2>Join On Phone</h2>
        <p>Scan to open the controller and prefill room code {roomCode}.</p>
        <p className="join-link">{joinUrl}</p>
        {hasLocalhostHost && (
          <p className="error">This TV is on localhost. Phones need the LAN URL shown in the dev console to join.</p>
        )}
      </div>
      <div className="join-qr-frame" aria-label={`QR code to join room ${roomCode}`}>
        {qrMarkup ? <div dangerouslySetInnerHTML={{ __html: qrMarkup }} /> : <p>Generating code...</p>}
      </div>
    </section>
  );
}
