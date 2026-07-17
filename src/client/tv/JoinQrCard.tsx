import { useEffect, useState, type ReactElement } from "react";
import QRCode from "qrcode";
import { getConnectionDiagnostics, getPhoneJoinUrl } from "../shared/network.js";

interface JoinQrCardProps {
  roomCode: string;
  variant?: "full" | "compact";
}

export function JoinQrCard({ roomCode, variant = "full" }: JoinQrCardProps): ReactElement {
  const [qrMarkup, setQrMarkup] = useState<string>("");
  const joinUrl = getPhoneJoinUrl(roomCode);
  const connectionDiagnostics = getConnectionDiagnostics();
  const hasLocalhostHost = connectionDiagnostics.isLocalhostPage && !connectionDiagnostics.publicClientOrigin;

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
      <section className="join-qr-card join-qr-card-compact" aria-label={`Join room ${roomCode} by QR code`}>
        <div className="join-qr-frame" aria-label={`QR code to join room ${roomCode}`}>
          {qrMarkup ? (
            <div dangerouslySetInnerHTML={{ __html: qrMarkup }} />
          ) : (
            <span className="tv-screen-reader-only">Generating QR code</span>
          )}
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
        {hasLocalhostHost ? (
          <p className="error">This TV is on localhost. Phones need the LAN URL shown in the dev console to join.</p>
        ) : connectionDiagnostics.publicClientOrigin ? (
          <p className="join-link join-link-seat">LAN join URL is active for phones on the same Wi-Fi.</p>
        ) : null}
      </div>
      <div className="join-qr-frame" aria-label={`QR code to join room ${roomCode}`}>
        {qrMarkup ? <div dangerouslySetInnerHTML={{ __html: qrMarkup }} /> : <p>Generating code...</p>}
      </div>
    </section>
  );
}
