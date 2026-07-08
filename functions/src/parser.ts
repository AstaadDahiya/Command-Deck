/**
 * Safely parses the Gemini JSON response, stripping markdown fences if present.
 */
export function parseGeminiResponse(text: string) {
    try {
        let cleaned = text.trim();
        // Strip markdown fences
        cleaned = cleaned.replace(/^```json/m, "").replace(/^```/m, "").trim();
        
        const generatedJson = JSON.parse(cleaned);
        
        // Validate shape
        if (!['low','medium','high','critical'].includes(generatedJson.severity)) {
            generatedJson.severity = 'medium';
        }
        
        return generatedJson;
    } catch (err) {
        // Fallback state
        return {
            severity: "medium",
            brief: "Analysis failed due to error or malformed response.",
            recommendedAction: "Review raw feeds manually.",
            sopSource: "N/A"
        };
    }
}
