import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PhoneApp } from "./phone/PhoneApp.js";
import { TvApp } from "./tv/TvApp.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

const pathname = window.location.pathname;
const App = pathname.startsWith("/tv") ? TvApp : PhoneApp;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
