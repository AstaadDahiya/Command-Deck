import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getEmbedding } from "./rag.js";

const sops = [
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
  }
];

export async function seedSOPs() {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  
  console.log("Seeding SOPs...");
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
      console.log(`Prepared SOP: ${sop.title}`);
    } catch (error) {
      console.error(`Failed to embed SOP: ${sop.title}`, error);
    }
  }
  
  await batch.commit();
  console.log("SOPs successfully seeded to Firestore.");
}

import { fileURLToPath } from 'url';

// Allow running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedSOPs().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
