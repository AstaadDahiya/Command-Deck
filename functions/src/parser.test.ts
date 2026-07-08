import { describe, it, expect } from 'vitest';
import { parseGeminiResponse } from './parser.js';

describe('parseGeminiResponse', () => {
    it('parses valid JSON successfully', () => {
        const raw = `{"severity":"high","brief":"Test brief","recommendedAction":"Do it","sopSource":"SOP 1"}`;
        const res = parseGeminiResponse(raw);
        expect(res.severity).toBe('high');
        expect(res.brief).toBe('Test brief');
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
        expect(res.severity).toBe('medium'); // Forced due to invalid value
    });
});
