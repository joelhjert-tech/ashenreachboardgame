import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/client/styles.css";
import { HostMovementJourney } from "../../src/client/tv/HostMovementJourney";

const params = new URLSearchParams(location.search);
const step = Number(params.get("step") ?? 1);
const arrived = params.get("arrived") === "1";
const long = params.get("long") === "1";
const route = long ? ["ashwake-crossing", "glassmere-spindle", "hollow-veil-yard", "outer_waymarket", "outer_anchor_market"] : ["ashwake-crossing", "glassmere-spindle", "hollow-veil-yard"];
const names = long ? ["Ashwake Crossing", "Glassmere Spindle", "Hollow Veil Yard", "Anchor Market", "Anchor Market"] : ["Ashwake Crossing", "Glassmere Spindle", "Hollow Veil Yard"];
const destination = { sectorId: route.at(-1)!, name: names.at(-1)!, ring: "outer", distance: route.length - 1, route, routeNames: names, tags: ["hazard"], threatIcons: ["blue"], ruleText: "Resolve the printed sector rule.", faceUpThreats: [{ instanceId: "threat-1", cardId: "signal-static", name: "Signal Static", type: "hazard", challenge: { stat: "signal", value: 7 }, blocksShop: false, blocksSectorText: true }], occupants: [], strategicTags: ["danger"] } as const;
const challenge = { id: "rift-whispers-ashen-chapel", name: "Rift Whispers", challengeType: "anomaly", sectorId: destination.sectorId, testStat: "signal", difficulty: 8, trigger: "onArrival", authoredOrder: 0, recurring: true, tags: ["anomaly"], lore: "The signal repeats.", artCardId: "rift-whispers", successSummary: "The whisper recedes.", failureSummary: "The authored consequence resolves." } as const;
createRoot(document.getElementById("root")!).render(<main style={{position:"relative",width:"100vw",height:"100vh",overflow:"hidden",background:"#080b0f"}}><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at center,#293238,#080b0f)"}}/><HostMovementJourney model={{eventId:"qa-movement",operativeName:"Tarek Voss",originName:"Ashwake Crossing",destination:{...destination}}} step={step} arrived={arrived} challenges={arrived ? [challenge] : []}/></main>);
