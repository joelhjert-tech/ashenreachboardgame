import { lazy, StrictMode, Suspense, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { selectClientSurface, type ClientSurface } from "./clientSurface.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

const surface = selectClientSurface(window.location.pathname);
const App = lazy(() =>
  surface === "tv"
    ? import("./tv/TvApp.js").then((module) => ({ default: module.TvApp }))
    : import("./phone/PhoneApp.js").then((module) => ({ default: module.PhoneApp }))
);

function ClientLoadingShell({ surface }: { surface: ClientSurface }): ReactElement {
  return (
    <main className="client-loading-shell" aria-label="Loading Ashen Reach client">
      <span>{surface === "tv" ? "Loading Host TV" : "Loading Phone Controller"}</span>
    </main>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={<ClientLoadingShell surface={surface} />}>
      <App />
    </Suspense>
  </StrictMode>
);
