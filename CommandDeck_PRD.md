# Command Deck — Product Requirements Document

**AI Chief of Staff for FIFA World Cup 2026 Stadium Operations Command Centers**

Version 1.0 · Hackathon Build (24–48h) · Built with Google AI stack

---

## 1. Problem Statement

Stadium operations command centers during mega-events receive dozens of disconnected input streams simultaneously: security radio chatter, medical radio, transport radio, CCTV feeds, crowd-density sensors, and social media monitoring. Each is siloed. A human operator cannot correlate "three radio mentions of pushing at Gate 7" with "a crowd-density sensor spike at the same location" with "a CCTV motion anomaly" fast enough to prevent escalation. Nearly every major stadium disaster in history was a *correlation failure*, not a data-availability failure — the information existed, nobody connected it in time.

## 2. Solution Summary

Command Deck ingests multi-modal operational signals (radio transcripts, sensor feeds, CCTV anomaly flags), correlates them by time and location, and uses Gemini to synthesize a ranked, plain-language incident feed — each with a severity score, an evidence trail, and a specific recommended action grounded in retrieved SOP documentation (RAG). A human operator approves or dismisses each recommendation with one click before it's dispatched.

## 3. Goals for the Demo

| Goal | Success Signal |
|---|---|
| Prove multi-modal correlation | System flags an incident from radio + sensor data that neither source alone would trigger |
| Prove grounded reasoning, not hallucination | Every recommendation cites the specific SOP passage it came from |
| Prove speed advantage | Incident surfaces in the dashboard within seconds of the underlying scripted event |
| Prove human-in-the-loop safety | No action auto-dispatches without operator approval |

## 4. Non-Goals (cut for time)

- Real live CCTV computer vision (simulate as anomaly-flag events)
- Real radio hardware integration (use scripted/pre-recorded audio)
- Multi-venue/multi-city rollout (single simulated stadium is enough)
- User auth / multi-tenant infrastructure

## 5. Primary Users

- **Command center operators** (primary demo persona)
- Security leads, medical dispatch, transport liaisons (secondary — shown as recipients of dispatched instructions)

## 6. Core AI Workflow

```
[Scripted radio audio] ──► Google Cloud Speech-to-Text ──► transcript + timestamp
[Synthetic sensor feed] ──► JSON event stream (crowd density, gate flow)
[Synthetic CCTV flags]  ──► JSON anomaly events

        ▼ (all three merge into a time+location-indexed event bus)

Correlation layer (simple windowed grouping by zone + time)
        ▼
Gemini 2.5 (via Vertex AI / Gemini API) reasoning step:
  - Input: correlated raw events + retrieved SOP chunks (RAG)
  - Output (structured JSON): severity, plain-language brief,
    evidence trail, recommended action, cited SOP source
        ▼
Incident card streams to dashboard (Firestore realtime listener)
        ▼
Operator clicks Approve → dispatch instruction generated
  (optionally translated via Cloud Translation API for
  multilingual stadium staff)
```

## 7. Google Tech Stack (and exactly why each piece is used)

| Component | Google Service | Why this one |
|---|---|---|
| Reasoning / synthesis | **Gemini API (Gemini 2.5 Flash or Pro)** via Vertex AI or AI Studio | Core reasoning engine — turns correlated raw events into a grounded, structured incident brief |
| Radio transcription | **Google Cloud Speech-to-Text** | Converts scripted radio audio to timestamped text; supports streaming for the "live" demo feel |
| SOP grounding (RAG) | **Vertex AI Search** (or a lightweight Firestore + embeddings-based retrieval if time-constrained) | Ensures recommendations are grounded in actual playbook text, not hallucinated — directly answers "logical decision making" judging criterion |
| Realtime backend | **Firebase Firestore + Firestore listeners** | Simplest way to get a live-updating dashboard without building custom websocket infra |
| Multilingual dispatch | **Cloud Translation API** | Converts approved instructions into the language of the receiving team (relevant for a 16-city, multilingual World Cup workforce) |
| Zone/venue mapping | **Google Maps Platform (Maps JavaScript API)** | Visual stadium zone map with incident pins — makes the dashboard immediately legible to judges |
| Hosting | **Firebase Hosting** | One-command deploy, no DevOps overhead during the hackathon |
| Auth (if time allows) | **Firebase Authentication** | Only if you want an "operator login" moment in the demo; otherwise skip |

> If Vertex AI Search feels heavy to wire up in the time available, fall back to: store 5–8 SOP text chunks in Firestore, embed them with the Gemini embeddings API, do cosine similarity in-memory in a Cloud Function. Same RAG effect, far less setup.

## 8. Data Model (Firestore)

```
/events/{eventId}
  source: "radio" | "sensor" | "cctv"
  zone: "Gate 7" | "Concourse B" | ...
  timestamp: ISO8601
  raw: { ...source-specific payload }

/incidents/{incidentId}
  severity: "low" | "medium" | "high" | "critical"
  zone: string
  brief: string                // Gemini-generated plain-language summary
  evidenceEventIds: [eventId]  // links back to /events
  recommendedAction: string
  sopSource: string            // citation from RAG retrieval
  status: "pending" | "approved" | "dismissed"
  createdAt: timestamp

/sopChunks/{chunkId}
  text: string
  embedding: number[]          // if doing manual RAG
  title: string
```

## 9. MVP Scope for 24–48 Hours

**Must-build (core demo):**
1. Scripted scenario generator — pre-written JSON timeline of radio/sensor/CCTV events for one escalating incident (e.g., Gate 7 crowd surge) firing on a timer
2. Speech-to-Text pipeline for 2–3 pre-recorded radio clips
3. Correlation + Gemini reasoning Cloud Function → writes incident to Firestore
4. Dashboard (React + Firestore listener) showing live incident cards with severity color, evidence trail, and SOP citation
5. Approve/Dismiss buttons that update status and (optionally) trigger a translated dispatch message

**Stretch (only if ahead of schedule):**
- Google Maps zone visualization with pinned incidents
- Cloud Translation live dispatch demo
- Second concurrent scenario to show the system isn't single-threaded

## 10. Demo Script (3 minutes)

1. **0:00–0:20** — Show the "raw" view: three separate feeds (radio transcript scrolling, sensor numbers ticking, CCTV flag list) — deliberately overwhelming, to set up the contrast.
2. **0:20–1:00** — Trigger the scripted Gate 7 scenario. Within seconds, an incident card appears: *"Gate 7 West — Crowd surge risk rising. 3 radio mentions of 'pushing' in 90s + density sensor +40% + CCTV motion anomaly. SOP §4.2: open secondary gate when density exceeds threshold with correlated radio distress signal. Recommended: open Gate 9, hold Gate 3."*
3. **1:00–1:30** — Click into the evidence trail — show the actual radio transcript line, sensor value, and the exact SOP passage cited. This is the "not a hallucination" moment.
4. **1:30–1:50** — Click Approve — show the dispatch instruction generated, translated into Spanish for a bilingual steward team.
5. **1:50–2:30** — Zoom out: "This is what would have taken a human operator 4–6 minutes to piece together manually, across three radios and a spreadsheet. We did it in 8 seconds, with a citation trail an operator can trust and override."
6. **2:30–3:00** — Close on architecture slide showing Gemini + Speech-to-Text + Vertex AI Search + Firestore, and the startup framing: "This isn't a World Cup app — it's an operations layer for any large venue."

## 11. Judging Criteria Alignment (explicit, say this out loud in the demo)

- **Intelligent and meaningful use of GenAI** → Gemini does multi-source synthesis + grounded reasoning, not just text generation
- **Dynamic context aware assistant** → incident briefs change based on live correlated context, not static rules
- **Logical decision making** → every recommendation is cited to an SOP passage (RAG), auditable
- **Real world impact** → framed against real crowd-crush incidents (Hillsborough, Love Parade)
- **Practical implementation** → human-in-the-loop approval, not autonomous dispatch — a real ops team would actually trust this
- **Clean architecture** → event bus → correlation → reasoning → dashboard is a legible, defensible pipeline

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Live Speech-to-Text flakiness during demo | Pre-transcribe and cache results; fall back to cached transcript if live call fails |
| Vertex AI Search setup eating time | Fall back to manual Firestore + Gemini-embeddings RAG (see §7 note) |
| Judges doubting the correlation logic is "real AI" vs rules | Show the actual Gemini prompt and structured JSON output live — transparency builds trust |
| Scope creep into multi-venue/live CCTV | Explicitly state in the pitch that this is scoped to one command center by design, for depth over breadth |

---

# Master Build Prompt

Paste this into Antigravity (or your AI coding tool of choice) as the initial project instruction. It's written to produce a working scaffold in one pass, then iterate section by section.

```
You are building "Command Deck" — an AI Chief of Staff dashboard for a stadium
operations command center, for a 24-48 hour hackathon submission. Build a
working, demoable full-stack app. Prioritize a working end-to-end demo over
completeness in any single area.

ARCHITECTURE
- Frontend: React (Vite), Tailwind CSS, deployed via Firebase Hosting
- Backend: Firebase Cloud Functions (Node.js/TypeScript)
- Database: Firestore (realtime listeners for live incident feed)
- AI: Gemini API (via Vertex AI or Google AI Studio SDK) for reasoning/synthesis
- Speech: Google Cloud Speech-to-Text API for radio transcript simulation
- RAG: Store 6-8 SOP text chunks in Firestore with Gemini embeddings; retrieve
  via cosine similarity in a Cloud Function (skip Vertex AI Search unless
  there's spare time — keep this simple and reliable)
- Optional: Cloud Translation API for multilingual dispatch messages
- Optional: Google Maps JavaScript API for a zone map view

DATA MODEL (Firestore collections)
- /events/{id}: { source: "radio"|"sensor"|"cctv", zone, timestamp, raw }
- /incidents/{id}: { severity, zone, brief, evidenceEventIds, recommendedAction,
  sopSource, status: "pending"|"approved"|"dismissed", createdAt }
- /sopChunks/{id}: { text, embedding, title }

BUILD ORDER (follow this sequence exactly)

STEP 1 - Scenario generator
Create a script (Node.js) that seeds Firestore with a scripted "Gate 7 crowd
surge" scenario: a timed sequence of 3 radio events (as text, representing
what Speech-to-Text would output), 4 sensor readings showing density rising,
and 1 CCTV anomaly flag, all tagged zone="Gate 7 West" with timestamps spread
across ~90 seconds. Write these to /events on a timer (setInterval) to
simulate live incoming data, OR expose a "Trigger Scenario" button in the UI
that fires them in sequence with realistic delays. Prefer the button — more
demo-reliable than a live timer.

STEP 2 - SOP corpus + RAG
Write 6-8 short SOP text chunks covering: gate capacity thresholds, crowd
surge response, medical escalation, gate closure procedure, multilingual
announcement protocol. Store in /sopChunks with Gemini text-embedding
vectors precomputed. Write a Cloud Function `retrieveSOP(queryText)` that
embeds the query and returns the top 2 matching chunks by cosine similarity.

STEP 3 - Correlation + reasoning Cloud Function
Write a Firestore-triggered Cloud Function `onNewEvent` that:
  a. Groups recent events (last 3 min) by zone
  b. If a zone has events from 2+ different sources within the window,
     treat as a correlation candidate
  c. Calls retrieveSOP() with a query built from the event summary
  d. Calls Gemini with a structured prompt (see PROMPT TEMPLATE below)
     requesting JSON output: severity, brief, recommendedAction, sopSource
  e. Writes the result to /incidents

PROMPT TEMPLATE for the Gemini reasoning call:
"""
You are an AI operations analyst for a stadium command center. You are given
correlated raw signals from multiple sources describing activity in one zone,
plus the most relevant standard operating procedure excerpt. Your job is to
assess severity and recommend one concrete action.

SIGNALS:
{list each event: source, timestamp, content}

RELEVANT SOP EXCERPT:
{retrieved SOP chunk text}

Respond ONLY with valid JSON in this exact shape, no markdown, no preamble:
{
  "severity": "low" | "medium" | "high" | "critical",
  "brief": "one or two sentence plain-language summary of what is happening
    and why it's concerning, referencing the specific signals",
  "recommendedAction": "one specific, actionable instruction an operator
    could approve and dispatch immediately",
  "sopSource": "short quote or reference to which part of the SOP excerpt
    justifies this recommendation"
}

Be conservative: only escalate severity if multiple independent signals
genuinely corroborate each other. Do not invent signals that were not given.
"""

STEP 4 - Dashboard UI
Build a React dashboard with:
  - A "Trigger Scenario" button (top right)
  - A live-updating list of incident cards (Firestore onSnapshot listener),
    each showing: zone, severity (color-coded: low=gray, medium=yellow,
    high=orange, critical=red), the plain-language brief, an expandable
    "evidence trail" (the raw events it was built from), the SOP citation,
    and Approve/Dismiss buttons
  - Clicking Approve updates status to "approved" and displays a generated
    dispatch instruction (optionally translated via Cloud Translation API
    into Spanish as a demo of multilingual dispatch)
  - A secondary "raw feeds" panel (collapsible) showing the unprocessed
    radio/sensor/CCTV stream, for the "before" contrast in the demo

STEP 5 - Polish for demo
  - Make incident cards animate in (subtle, not distracting)
  - Add a timestamp/elapsed-time indicator showing how fast the incident
    was surfaced after the triggering events
  - Add a simple architecture diagram as a static section or slide, not
    required in the live app

CONSTRAINTS
- Keep all Gemini calls server-side (Cloud Functions), never expose API
  keys in frontend code
- Handle Gemini JSON parsing defensively (strip markdown fences if present,
  try/catch with a fallback error state)
- No user auth needed unless there's spare time at the end
- Do not build real CCTV computer vision — CCTV events are synthetic JSON
  flags only, clearly labeled as simulated in code comments
- Optimize for a live demo working end-to-end over any individual feature
  being "complete" — a working button beats an incomplete pipeline

Start by scaffolding the Firebase project structure and the Firestore data
model, then proceed through the steps in order, confirming each step works
before moving to the next.
```

---

## Quick setup checklist before you start coding

1. Create a Google Cloud / Firebase project, enable: Firestore, Cloud Functions, Cloud Speech-to-Text API, Vertex AI API (or grab a Gemini API key from Google AI Studio for simplicity), Cloud Translation API, Maps JavaScript API
2. If time is tight, use the **Gemini API via Google AI Studio key** instead of full Vertex AI setup — it's a single API key vs. IAM/service-account configuration, and functionally identical for this use case
3. Write your scripted scenario data *first*, on paper, before touching code — the quality of your demo script determines the quality of your demo, full stop
