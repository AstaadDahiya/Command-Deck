import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { fileURLToPath } from 'url';
import { getEmbedding } from "./rag.js";

/** Standard Operating Procedure definition for seeding. */
interface SOPDefinition {
  title: string;
  text: string;
}

/** Pre-defined SOP chunks covering stadium operations procedures. */
const sops: SOPDefinition[] = [
  {
    title: "Gate Capacity Thresholds",
    text: "§4.1: If density exceeds 70% at any main gate, increase visible steward presence. If density exceeds 85%, halt incoming flow and redirect to overflow gates. Gate 7 West capacity is 500 people."
  },
  {
    title: "Crowd Surge Response",
    text: "§4.2: In the event of a crowd surge or crush risk (indicated by density sensor + correlated radio distress signal), immediately open secondary/overflow gates, hold approaching crowds, and dispatch rapid response medical."
  },
  {
    title: "Medical Escalation",
    text: "§5.1: If someone is crushed against a turnstile or barrier, stop all forward movement. Dispatch on-site paramedics immediately. Do not attempt to pull the victim forward; relieve pressure from behind."
  },
  {
    title: "Gate Closure Procedure",
    text: "§6.3: When a gate is closed due to emergency, use the PA system to announce closure. All stewards must lock turnstiles and form a human barrier 10 meters back from the gate."
  },
  {
    title: "Multilingual Announcement Protocol",
    text: "§7.1: All critical emergency instructions must be dispatched to stewards in their primary language. PA announcements must be made in English, Spanish, and the language of the opposing team."
  },
  {
    title: "Evacuation Procedures",
    text: "§8.1: Full evacuation is triggered when 3+ zones report critical severity simultaneously. Activate all emergency exits, deploy stewards to guide flow using designated evacuation routes. Ensure wheelchair-accessible exits are staffed."
  },
  {
    title: "VIP Area Protocols",
    text: "§9.1: VIP area incidents are escalated directly to the security director. VIP zones have a lower density threshold (40%) and require dedicated steward teams. All VIP evacuations use separate routes from general admission."
  },
  {
    title: "CCTV Anomaly Verification",
    text: "§3.2: When a CCTV anomaly is flagged with confidence above 80%, dispatch a roving steward to the zone within 90 seconds for visual confirmation. If confirmed, escalate immediately. If false positive, log and dismiss."
  }
];

/**
 * Seeds the Firestore `sopChunks` collection with pre-defined SOP text
 * and their corresponding Gemini embedding vectors for RAG retrieval.
 */
export async function seedSOPs(): Promise<void> {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  
  logger.info("Seeding SOPs...");
  const batch = db.batch();
  
  for (const sop of sops) {
    try {
      const embedding = await getEmbedding(sop.text);
      const docRef = db.collection("sopChunks").doc();
      batch.set(docRef, {
        title: sop.title,
        text: sop.text,
        embedding
      });
      logger.info(`Prepared SOP: ${sop.title}`);
    } catch (error) {
      logger.error(`Failed to embed SOP: ${sop.title}`, error);
    }
  }
  
  await batch.commit();
  logger.info("SOPs successfully seeded to Firestore.");
}

// Allow running directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedSOPs().then(() => process.exit(0)).catch(err => {
    logger.error("Seed CLI failed:", err);
    process.exit(1);
  });
}
