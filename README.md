# Command Deck 🎯

**AI Chief of Staff for Stadium Operations Command Centers**

> Real-time multi-modal incident correlation powered by Google Gemini, Firebase, and RAG.

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-FFCA28?logo=firebase)](https://command-deck-10a6b.web.app)
[![Built with Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?logo=google)](https://ai.google.dev/)

## Problem

Stadium operations command centers during mega-events receive dozens of disconnected input streams simultaneously: security radio chatter, crowd-density sensors, and CCTV feeds. Each is siloed. A human operator cannot correlate signals across sources fast enough to prevent escalation. Nearly every major stadium disaster was a **correlation failure**, not a data-availability failure.

## Solution

Command Deck ingests multi-modal operational signals (radio transcripts, sensor feeds, CCTV anomaly flags), correlates them by time and location, and uses **Gemini** to synthesize a ranked, plain-language incident feed — each with a severity score, evidence trail, and a specific recommended action grounded in retrieved SOP documentation (RAG). A human operator approves or dismisses each recommendation before dispatch.

## Architecture

```
[Radio Transcripts] ──►
[Sensor Feeds]      ──► Firestore Events ──► Cloud Function (Correlation + RAG + Gemini) ──► Incident Cards
[CCTV Anomalies]    ──►
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Backend | Firebase Cloud Functions (Node.js/TypeScript) |
| Database | Cloud Firestore (real-time listeners) |
| AI Reasoning | Gemini 2.5 Flash (structured JSON output) |
| RAG | Gemini Embedding 2 + cosine similarity |
| Hosting | Firebase Hosting |

## Quick Start

```bash
# Clone
git clone https://github.com/AstaadDahiya/Command-Deck.git
cd Command-Deck

# Frontend
cd frontend && npm install && npm run dev

# Backend (separate terminal)
cd functions && npm install && npm run build

# Deploy
firebase deploy
```

## Environment Variables

Create `functions/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Create `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Testing

```bash
cd functions && npm test
```

## Security

- **Firestore Rules**: Incidents and SOPs are read-only from the client. Events require schema validation with enum-constrained source types. All other collections are denied by default.
- **API Keys**: All secrets are stored in `.env` files excluded from version control via `.gitignore`.
- **Cloud Functions**: Backend logic runs server-side with the Firebase Admin SDK (bypasses client-side rules).
- **Event Immutability**: Once written, events cannot be updated or deleted from the client.

## License

MIT
