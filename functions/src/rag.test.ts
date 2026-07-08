import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, getEmbedding } from './rag.js';

const { mockEmbedContent } = vi.hoisted(() => {
  return { mockEmbedContent: vi.fn() };
});

// Mock the entire @google/genai module
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        embedContent: mockEmbedContent
      }
    }
  };
});

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        const vecA = [1, 2, 3];
        const vecB = [1, 2, 3];
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
        const vecA = [1, 0];
        const vecB = [0, 1];
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0, 5);
    });

    it('returns -1 for opposite vectors', () => {
        const vecA = [1, 2, 3];
        const vecB = [-1, -2, -3];
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1, 5);
    });

    it('returns expected ranking on known vectors', () => {
        const query = [1, 1, 1];
        const match1 = [1, 1, 0.9];
        const match2 = [0, -1, -1];
        
        const sim1 = cosineSimilarity(query, match1);
        const sim2 = cosineSimilarity(query, match2);
        
        expect(sim1).toBeGreaterThan(sim2);
    });

    it('returns 0 for mismatched vector lengths', () => {
        expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('returns 0 for empty vectors', () => {
        expect(cosineSimilarity([], [])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
        expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
        expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    });

    it('handles single-element vectors', () => {
        expect(cosineSimilarity([5], [5])).toBeCloseTo(1, 5);
        expect(cosineSimilarity([5], [-5])).toBeCloseTo(-1, 5);
    });

    it('is commutative', () => {
        const a = [1, 2, 3, 4];
        const b = [5, 6, 7, 8];
        expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
    });

    it('ignores magnitude (normalized result)', () => {
        const a = [1, 0];
        const b = [100, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('handles high-dimensional vectors', () => {
        const dim = 768;
        const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
        const b = Array.from({ length: dim }, (_, i) => Math.sin(i + 0.1));
        const sim = cosineSimilarity(a, b);
        expect(sim).toBeGreaterThan(0.9);
        expect(sim).toBeLessThanOrEqual(1);
    });
});

describe('getEmbedding', () => {
    beforeEach(() => {
        mockEmbedContent.mockReset();
    });

    it('throws error for empty text', async () => {
        await expect(getEmbedding('')).rejects.toThrow("Cannot embed empty text");
    });

    it('throws error for whitespace-only text', async () => {
        await expect(getEmbedding('   \n  ')).rejects.toThrow("Cannot embed empty text");
    });

    it('throws error when response has no embeddings array', async () => {
        mockEmbedContent.mockResolvedValueOnce({
            embeddings: undefined
        });
        await expect(getEmbedding('test')).rejects.toThrow("Failed to generate embedding: empty response");
    });

    it('throws error when response has empty embeddings array', async () => {
        mockEmbedContent.mockResolvedValueOnce({
            embeddings: []
        });
        await expect(getEmbedding('test')).rejects.toThrow("Failed to generate embedding: empty response");
    });

    it('throws error when first embedding has no values', async () => {
        mockEmbedContent.mockResolvedValueOnce({
            embeddings: [{ values: undefined }]
        });
        await expect(getEmbedding('test')).rejects.toThrow("Failed to generate embedding: empty response");
    });

    it('returns the embedding values when successful', async () => {
        mockEmbedContent.mockResolvedValueOnce({
            embeddings: [{ values: [0.1, 0.2, 0.3] }]
        });
        const result = await getEmbedding('valid text');
        expect(result).toEqual([0.1, 0.2, 0.3]);
    });
});
