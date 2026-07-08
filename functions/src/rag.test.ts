import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './rag.js';

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
});
