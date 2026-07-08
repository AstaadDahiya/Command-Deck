import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
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

/** Time window for correlating events from the same zone. */
const CORRELATION_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

/** Valid event source types. */
const VALID_SOURCES = new Set(['radio', 'sensor', 'cctv']);

/** Severity levels recognized by the system. */
const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

/**
 * Firestore-triggered Cloud Function: processes each new event document.
 * 
 * Pipeline:
 * 1. Deduplication guard — checks for existing pending incident in the same zone
 * 2. Source diversity check — requires 2+ distinct sources before triggering
 * 3. RAG retrieval — finds the most relevant SOP chunk via embedding similarity
 * 4. Gemini reasoning — synthesizes a severity assessment with recommended action
 * 5. Atomic write — creates or updates the incident inside a Firestore transaction
 */
export const onNewEvent = onDocumentCreated("events/{eventId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const newEventData = snap.data();
    const zone = newEventData.zone as string;

    // Validate event source
    if (!VALID_SOURCES.has(newEventData.source as string)) {
        logger.warn(`Invalid event source: ${newEventData.source}. Skipping.`);
        return;
    }

    const now = Date.now();
    const windowStart = new Date(now - CORRELATION_WINDOW_MS);

    logger.info(`Processing new event ${event.id} for zone ${zone}...`);

    try {
        await db.runTransaction(async (tx) => {
            // 1. Deduplication Guard: Check for an existing pending incident in this zone
            const pendingIncidentsQuery = db.collection("incidents")
                .where("zone", "==", zone)
                .where("status", "==", "pending")
                .orderBy("createdAt", "desc")
                .limit(1);

            const pendingSnap = await tx.get(pendingIncidentsQuery);
            const incidentDoc = pendingSnap.empty ? null : pendingSnap.docs[0];

            // 2. Fetch recent events in this zone for the time window
            const recentEventsQuery = db.collection("events")
                .where("zone", "==", zone)
                .where("timestamp", ">=", windowStart);
            
            const recentEventsSnap = await tx.get(recentEventsQuery);
            const recentEvents = recentEventsSnap.docs.map(d => {
                const data = d.data();
                return { id: d.id, source: data.source as string, raw: data.raw as Record<string, unknown> };
            });

            if (!incidentDoc) {
                const sources = new Set(recentEvents.map(e => e.source));
                if (sources.size < 2) {
                    logger.info(`Not enough diverse signals for ${zone} to trigger correlation.`);
                    return;
                }
            }

            logger.info(`Triggering reasoning for zone ${zone} with ${recentEvents.length} recent events.`);

            // 3. RAG: Retrieve most relevant SOP
            const summaryStr = recentEvents.map(e => `${e.source}: ${JSON.stringify(e.raw)}`).join(" | ");
            let topSop = "No specific SOP found.";
            
            try {
                const queryEmbedding = await getEmbedding(summaryStr);
                const sopsQuery = db.collection("sopChunks");
                const sopsSnap = await tx.get(sopsQuery);
                
                let maxSim = -1;
                let bestSopDoc: { title: string; text: string } | null = null;
                
                sopsSnap.docs.forEach(sopDoc => {
                    const data = sopDoc.data();
                    if (data.embedding && Array.isArray(data.embedding)) {
                        const sim = cosineSimilarity(queryEmbedding, data.embedding as number[]);
                        if (sim > maxSim) {
                            maxSim = sim;
                            bestSopDoc = { title: data.title as string, text: data.text as string };
                        }
                    }
                });
                
                if (bestSopDoc) {
                    topSop = (bestSopDoc as { title: string; text: string }).text;
                    logger.info(`Matched SOP: ${(bestSopDoc as { title: string; text: string }).title} (sim: ${maxSim.toFixed(4)})`);
                }
            } catch (err) {
                logger.error("RAG retrieval failed:", err);
            }

            // 4. Call Gemini for structured reasoning
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

            let generatedJson = {
                severity: "low" as string,
                brief: "Analysis failed due to error.",
                recommendedAction: "Review raw feeds manually.",
                sopSource: "N/A"
            };

            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });
                
                const text = response.text || "{}";
                generatedJson = parseGeminiResponse(text);
                
            } catch (err) {
                logger.error("Gemini call failed:", err);
            }

            // Validate severity from Gemini
            if (!VALID_SEVERITIES.has(generatedJson.severity)) {
                generatedJson.severity = 'medium';
            }

            // 5. Write to Firestore atomically
            const incidentData = {
                severity: generatedJson.severity,
                zone,
                brief: generatedJson.brief,
                evidenceEventIds: recentEvents.map(e => e.id),
                recommendedAction: generatedJson.recommendedAction,
                sopSource: generatedJson.sopSource,
                status: "pending",
                updatedAt: FieldValue.serverTimestamp()
            };

            if (incidentDoc) {
                tx.update(incidentDoc.ref, incidentData);
                logger.info(`Transaction: Updated existing incident ${incidentDoc.id} for zone ${zone}`);
            } else {
                const newDocRef = db.collection("incidents").doc();
                tx.set(newDocRef, {
                    ...incidentData,
                    createdAt: FieldValue.serverTimestamp()
                });
                logger.info(`Transaction: Created new incident for zone ${zone}`);
            }
        });
    } catch (err) {
        logger.error("Transaction failed:", err);
    }
});

/**
 * HTTP endpoint to seed the SOP database.
 * Restricts to POST/GET methods only.
 */
export const seedDatabase = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
    }

    try {
        await seedSOPs();
        res.status(200).send("Database seeded successfully!");
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Seed failed:', message);
        res.status(500).send("Error seeding database: " + message);
    }
});
