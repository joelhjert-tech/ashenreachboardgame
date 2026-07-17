import React from "react";
import { createRoot } from "react-dom/client";
import { TvApp } from "/src/client/tv/TvApp.tsx";
import { createTransitionPatch, type TransitionState } from "./transitionFixtures";
import { setHarnessPatch } from "/src/client/shared/useRoomSubscription.js";
import "/src/client/styles.css";

declare global {
  interface Window {
    __ASHEN_TRANSITION_QA__: {
      setState: (state: TransitionState) => void;
      getRenderCount: () => number;
    };
  }
}

let renderCount = 0;
window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
setHarnessPatch(createTransitionPatch("board-before"));

window.__ASHEN_TRANSITION_QA__ = {
  setState(state) {
    setHarnessPatch(createTransitionPatch(state));
  },
  getRenderCount() {
    return renderCount;
  }
};

function HarnessApp() {
  renderCount += 1;
  return <TvApp />;
}

createRoot(document.getElementById("root")!).render(<HarnessApp />);
