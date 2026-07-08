import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Computes cosine similarity between two embedding vectors.
 * Returns a value between -1 (opposite) and 1 (identical).
 *
 * @param vecA - First embedding vector
 * @param vecB - Second embedding vector
 * @returns Cosine similarity score, or 0 if vectors are incompatible
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
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
 * Generates a text embedding vector using the Gemini embedding model.
 *
 * @param text - The input text to embed
 * @returns A numeric embedding vector
 * @throws Error if the embedding API returns empty results
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot embed empty text");
  }

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  
  if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
    throw new Error("Failed to generate embedding: empty response");
  }
  return response.embeddings[0].values;
}
