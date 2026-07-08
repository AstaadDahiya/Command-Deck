import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getEmbedding, cosineSimilarity } from "./rag.js";
import { parseGeminiResponse } from "./parser.js";
import { GoogleGenAI } from "@google/genai";
import { seedSOPs } from "./seedSOPs.js";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CORRELATION_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

export const onNewEvent = onDocumentCreated("events/{eventId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const newEventData = snap.data();
    const zone = newEventData.zone;
    const now = Date.now();
    const windowStart = new Date(now - CORRELATION_WINDOW_MS);

    console.log(`Processing new event ${event.id} for zone ${zone}...`);

    try {
        await db.runTransaction(async (tx) => {
            // 1. Deduplication Guard: Check for an existing pending incident in this zone
            const pendingIncidentsQuery = db.collection("incidents")
                .where("zone", "==", zone)
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(1);

            const pendingSnap = await tx.get(pendingIncidentsQuery);
            let incidentDoc = pendingSnap.empty ? null : pendingSnap.docs[0];

            // 2. Fetch recent events in this zone for the time window
            const recentEventsQuery = db.collection("events")
                .where("zone", "==", zone)
                .where("timestamp", ">=", windowStart);
            
            const recentEventsSnap = await tx.get(recentEventsQuery);
            const recentEvents = recentEventsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

            // If no existing incident, we need at least 2 different sources to trigger
            if (!incidentDoc) {
                const sources = new Set(recentEvents.map(e => e.source));
                if (sources.size < 2) {
                    console.log(`Not enough diverse signals for ${zone} to trigger correlation.`);
                    return;
                }
            }

            console.log(`Triggering reasoning for zone ${zone} with ${recentEvents.length} recent events.`);

            // 3. RAG: Retrieve SOPs
            const summaryStr = recentEvents.map(e => `${e.source}: ${JSON.stringify(e.raw)}`).join(" | ");
            let topSop = "No specific SOP found.";
            
            try {
                const queryEmbedding = await getEmbedding(summaryStr);
                const sopsQuery = db.collection("sopChunks");
                const sopsSnap = await tx.get(sopsQuery);
                
                let maxSim = -1;
                let bestSopDoc: any = null;
                
                sopsSnap.docs.forEach(doc => {
                    const data = doc.data() as any;
                    if (data.embedding) {
                        const sim = cosineSimilarity(queryEmbedding, data.embedding);
                        if (sim > maxSim) {
                            maxSim = sim;
                            bestSopDoc = data;
                        }
                    }
                });
                
                if (bestSopDoc) {
                    topSop = bestSopDoc.text;
                    console.log(`Matched SOP: ${bestSopDoc.title} (sim: ${maxSim})`);
                }
            } catch (err) {
                console.error("RAG retrieval failed:", err);
            }

            // 4. Call Gemini
            const prompt = `
You are an AI operations analyst for a stadium command center. You are given
correlated raw signals from multiple sources describing activity in one zone,
plus the most relevant standard operating procedure excerpt. Your job is to
assess severity and recommend one concrete action.

SIGNALS:
${recentEvents.map(e => `- Source: ${e.source}, Content: ${JSON.stringify(e.raw)}`).join("\n")}

RELEVANT SOP EXCERPT:
${topSop}

Respond ONLY with valid JSON in this exact shape, no markdown, no preamble:
{
  "severity": "low" | "medium" | "high" | "critical",
  "brief": "one or two sentence plain-language summary of what is happening and why it's concerning, referencing the specific signals",
  "recommendedAction": "one specific, actionable instruction an operator could approve and dispatch immediately",
  "sopSource": "short quote or reference to which part of the SOP excerpt justifies this recommendation"
}

Be conservative: only escalate severity if multiple independent signals genuinely corroborate each other. Do not invent signals that were not given.
`;

            let generatedJson: any = {
                severity: "low",
                brief: "Analysis failed due to error.",
                recommendedAction: "Review raw feeds manually.",
                sopSource: "N/A"
            };

            try {
                // Calling Gemini inside transaction means it will retry if the read set changes (e.g., new event arrives mid-flight)
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });
                
                let text = response.text || "{}";
                generatedJson = parseGeminiResponse(text);
                
            } catch (err) {
                console.error("Gemini call failed:", err);
            }

            // 5. Write to Firestore
            const incidentData = {
                severity: generatedJson.severity,
                zone: zone,
                brief: generatedJson.brief,
                evidenceEventIds: recentEvents.map(e => e.id),
                recommendedAction: generatedJson.recommendedAction,
                sopSource: generatedJson.sopSource,
                status: "pending",
                updatedAt: FieldValue.serverTimestamp()
            };

            if (incidentDoc) {
                tx.update(incidentDoc.ref, incidentData);
                console.log(`Transaction: Updated existing incident ${incidentDoc.id} for zone ${zone}`);
            } else {
                const newDocRef = db.collection("incidents").doc();
                tx.set(newDocRef, {
                    ...incidentData,
                    createdAt: FieldValue.serverTimestamp()
                });
                console.log(`Transaction: Created new incident for zone ${zone}`);
            }
        });
    } catch (err) {
        console.error("Transaction failed:", err);
    }
});

export const seedDatabase = onRequest(async (req, res) => {
    try {
        await seedSOPs();
        res.status(200).send("Database seeded successfully!");
    } catch (err: any) {
        res.status(500).send("Error seeding database: " + err.message);
    }
});
