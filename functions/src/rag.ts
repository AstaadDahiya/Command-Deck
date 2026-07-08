import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client using API key from environment
// We'll set this using Firebase secrets or .env later
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Gets embeddings for a text string using Gemini.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  
  if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
      throw new Error("Failed to generate embedding");
  }
  return response.embeddings[0].values;
}
