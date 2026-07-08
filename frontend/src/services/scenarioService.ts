import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export type EventSource = "radio" | "sensor" | "cctv";

export interface OpsEvent {
  source: EventSource;
  zone: string;
  timestamp: any;
  raw: any;
}

const scenarioEvents = [
  { delayMs: 0,     source: "sensor", raw: { density: 60, threshold: 50, metric: "people/sqm" } },
  { delayMs: 5000,  source: "radio",  raw: { transcript: "Control, we have some pushing starting at Gate 7 West." } },
  { delayMs: 15000, source: "sensor", raw: { density: 75, threshold: 50, metric: "people/sqm" } },
  { delayMs: 25000, source: "radio",  raw: { transcript: "Medical needed at Gate 7 West, someone is getting crushed against the turnstile." } },
  { delayMs: 35000, source: "cctv",   raw: { anomalyType: "Crowd Surge", confidence: 0.92, camera: "CAM-G7W-02" } },
  { delayMs: 45000, source: "sensor", raw: { density: 88, threshold: 50, metric: "people/sqm" } },
  { delayMs: 55000, source: "sensor", raw: { density: 95, threshold: 50, metric: "people/sqm" } },
  { delayMs: 65000, source: "radio",  raw: { transcript: "Gate 7 West is completely blocked, we need to open the overflow gates now!" } },
];

export async function triggerScenario() {
  const zone = "Gate 7 West";
  console.log(`Starting scenario for ${zone}...`);
  
  for (const event of scenarioEvents) {
    setTimeout(async () => {
      try {
        await addDoc(collection(db, "events"), {
          source: event.source,
          zone,
          timestamp: serverTimestamp(),
          raw: event.raw
        });
        console.log(`Fired ${event.source} event for ${zone}`);
      } catch (err) {
        console.error("Failed to add event:", err);
      }
    }, event.delayMs);
  }
}
