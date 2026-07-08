/** Shape of the structured JSON response expected from Gemini reasoning. */
export interface GeminiIncidentResponse {
  severity: 'low' | 'medium' | 'high' | 'critical';
  brief: string;
  recommendedAction: string;
  sopSource: string;
}

const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

const FALLBACK_RESPONSE: GeminiIncidentResponse = {
  severity: 'medium',
  brief: 'Analysis failed due to error or malformed response.',
  recommendedAction: 'Review raw feeds manually.',
  sopSource: 'N/A'
};

/**
 * Safely parses a Gemini JSON response, stripping markdown fences if present.
 * Falls back to a safe default if the response is malformed.
 *
 * @param text - Raw text response from Gemini
 * @returns Parsed and validated incident response
 */
export function parseGeminiResponse(text: string): GeminiIncidentResponse {
  try {
    let cleaned = text.trim();
    // Strip markdown fences that Gemini sometimes adds
    cleaned = cleaned.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').trim();
    
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    
    // Validate and coerce severity
    const severity = VALID_SEVERITIES.has(parsed.severity as string)
      ? (parsed.severity as GeminiIncidentResponse['severity'])
      : 'medium';
    
    return {
      severity,
      brief: typeof parsed.brief === 'string' ? parsed.brief : FALLBACK_RESPONSE.brief,
      recommendedAction: typeof parsed.recommendedAction === 'string' ? parsed.recommendedAction : FALLBACK_RESPONSE.recommendedAction,
      sopSource: typeof parsed.sopSource === 'string' ? parsed.sopSource : FALLBACK_RESPONSE.sopSource
    };
  } catch {
    return { ...FALLBACK_RESPONSE };
  }
}
