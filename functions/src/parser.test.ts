import { describe, it, expect } from 'vitest';
import { parseGeminiResponse } from './parser.js';

describe('parseGeminiResponse', () => {
    it('parses valid JSON successfully', () => {
        const raw = `{"severity":"high","brief":"Test brief","recommendedAction":"Do it","sopSource":"SOP 1"}`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('high');
        expect(res.brief).toBe('Test brief');
        expect(res.recommendedAction).toBe('Do it');
        expect(res.sopSource).toBe('SOP 1');
    });

    it('strips markdown fences and parses successfully', () => {
        const raw = "```json\n" +
"{\n" +
"  \"severity\": \"critical\",\n" +
"  \"brief\": \"Markdown test\",\n" +
"  \"recommendedAction\": \"Action\",\n" +
"  \"sopSource\": \"Source\"\n" +
"}\n" +
"```";
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('critical');
        expect(res.brief).toBe('Markdown test');
    });

    it('falls back gracefully on malformed JSON', () => {
        const raw = `{"severity": "high", "brief": "Missing bracket...`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('medium');
        expect(res.brief).toContain('Analysis failed');
    });

    it('forces severity to medium if invalid severity provided', () => {
        const raw = `{"severity":"extreme","brief":"Test brief","recommendedAction":"Do it","sopSource":"SOP 1"}`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('medium');
    });

    it('handles empty string input', () => {
        const res = parseGeminiResponse('');
        expect(res.severity).toBe('medium');
        expect(res.brief).toContain('Analysis failed');
    });

    it('handles completely invalid input gracefully', () => {
        const res = parseGeminiResponse('not json at all, just random text from Gemini');
        expect(res.severity).toBe('medium');
        expect(res.recommendedAction).toBe('Review raw feeds manually.');
    });

    it('coerces missing fields to fallback values', () => {
        const raw = `{"severity":"high"}`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('high');
        expect(res.brief).toContain('Analysis failed');
        expect(res.recommendedAction).toBe('Review raw feeds manually.');
        expect(res.sopSource).toBe('N/A');
    });

    it('handles whitespace-only input', () => {
        const res = parseGeminiResponse('   \n\n  ');
        expect(res.severity).toBe('medium');
    });

    it('validates all four valid severity levels', () => {
        for (const sev of ['low', 'medium', 'high', 'critical']) {
            const raw = JSON.stringify({ severity: sev, brief: 'b', recommendedAction: 'a', sopSource: 's' });
            expect(parseGeminiResponse(raw).severity).toBe(sev);
        }
    });

    it('handles numeric fields in place of strings', () => {
        const raw = `{"severity":"high","brief":123,"recommendedAction":true,"sopSource":null}`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('high');
        expect(res.brief).toContain('Analysis failed');
        expect(res.recommendedAction).toBe('Review raw feeds manually.');
    });
});
