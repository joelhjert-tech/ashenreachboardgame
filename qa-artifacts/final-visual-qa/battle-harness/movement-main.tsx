import React from "react";
import { createRoot } from "react-dom/client";
import { TvApp } from "/src/client/tv/TvApp.tsx";
import { createMovementPatch } from "./transitionFixtures";
import { setHarnessPatch } from "/src/client/shared/useRoomSubscription.js";
import "/src/client/styles.css";

window.localStorage.setItem("ashen-reach-tv-room-code", "RT7P4");
window.localStorage.setItem("ashen-reach-tv-host-token", "host:RT7P4:secret");
setHarnessPatch(createMovementPatch("board", 20));
(window as any).__ASHEN_MOVEMENT_QA__ = { set: (kind: "board" | "planner" | "moved" | "battle", sequence: number) => setHarnessPatch(createMovementPatch(kind, sequence)) };
createRoot(document.getElementById("root")!).render(<TvApp />);
