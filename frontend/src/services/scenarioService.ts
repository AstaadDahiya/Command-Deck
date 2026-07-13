import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { Timestamp } from "firebase/firestore";

/** The three possible event source types in the Command Deck pipeline. */
export type EventSource = 'radio' | 'sensor' | 'cctv';

/** Raw payload for a radio transcript event. */
export interface RadioPayload {
  transcript: string;
}

/** Raw payload for a crowd density sensor event. */
export interface SensorPayload {
  density: number;
  threshold: number;
  metric: string;
}

/** Raw payload for a CCTV anomaly detection event. */
export interface CCTVPayload {
  anomalyType: string;
  confidence: number;
  camera: string;
}

/** A raw operational event from any source in the stadium. */
export interface OpsEvent {
  id: string;
  source: EventSource;
  zone: string;
  timestamp: Timestamp | null;
  raw: RadioPayload | SensorPayload | CCTVPayload;
}

interface ScenarioStep {
  delayMs: number;
  source: EventSource;
  raw: RadioPayload | SensorPayload | CCTVPayload;
}

/** Waits for the specified number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const scenarioEvents: ScenarioStep[] = [
  { delayMs: 0,     source: 'sensor', raw: { density: 60, threshold: 50, metric: 'people/sqm' } },
  { delayMs: 5000,  source: 'radio',  raw: { transcript: 'Control, we have some pushing starting at Gate 7 West.' } },
  { delayMs: 15000, source: 'sensor', raw: { density: 75, threshold: 50, metric: 'people/sqm' } },
  { delayMs: 25000, source: 'radio',  raw: { transcript: 'Medical needed at Gate 7 West, someone is getting crushed against the turnstile.' } },
  { delayMs: 35000, source: 'cctv',   raw: { anomalyType: 'Crowd Surge', confidence: 0.92, camera: 'CAM-G7W-02' } },
  { delayMs: 45000, source: 'sensor', raw: { density: 88, threshold: 50, metric: 'people/sqm' } },
  { delayMs: 55000, source: 'sensor', raw: { density: 95, threshold: 50, metric: 'people/sqm' } },
  { delayMs: 65000, source: 'radio',  raw: { transcript: 'Gate 7 West is completely blocked, we need to open the overflow gates now!' } },
];

/**
 * Triggers the pre-scripted Gate 7 West crowd surge scenario.
 * Fires events sequentially with realistic delays to simulate a live escalation.
 */
export async function triggerScenario(): Promise<void> {
  const zone = 'Gate 7 West';
  let lastDelay = 0;

  for (const event of scenarioEvents) {
    const waitMs = event.delayMs - lastDelay;
    if (waitMs > 0) {
      await delay(waitMs);
    }
    lastDelay = event.delayMs;

    await addDoc(collection(db, 'events'), {
      source: event.source,
      zone,
      timestamp: serverTimestamp(),
      raw: event.raw
    });
  }
}
