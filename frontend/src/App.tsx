import { useState, useEffect, useCallback, useMemo } from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from './firebase'
import { IncidentCard } from './components/IncidentCard'
import type { Incident } from './components/IncidentCard'
import { RawFeedPanel } from './components/RawFeedPanel'
import { triggerScenario } from './services/scenarioService'
import type { OpsEvent } from './services/scenarioService'

/**
 * Root application component for Command Deck.
 * Subscribes to real-time Firestore listeners for incidents and events,
 * and renders the main dashboard layout.
 */
function App() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [events, setEvents] = useState<OpsEvent[]>([])
  const [isTriggering, setIsTriggering] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    signInAnonymously(auth).then(() => {
      setAuthReady(true);
    }).catch(err => {
      console.error("Auth failed:", err);
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      const inc = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Incident));
      setIncidents(inc);
    });

    const qEvents = query(collection(db, 'events'), orderBy('timestamp', 'desc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const evts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OpsEvent));
      setEvents(evts);
    });

    return () => {
      unsubIncidents();
      unsubEvents();
    }
  }, [authReady]);

  const eventTimestamps = useMemo(() => {
    const map = new Map<string, number>();
    for (const evt of events) {
      if (evt.timestamp) {
        map.set(evt.id, evt.timestamp.toMillis ? evt.timestamp.toMillis() : Date.now());
      }
    }
    return map;
  }, [events]);

  /** Triggers the demo scenario and manages button loading state. */
  const handleTriggerScenario = useCallback(async () => {
    setIsTriggering(true);
    try {
      await triggerScenario();
    } finally {
      setTimeout(() => setIsTriggering(false), 2000);
    }
  }, []);

  /** Approves an incident and dispatches the recommended action. */
  const handleApprove = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'incidents', id), { status: 'approved' });
    } catch (err) {
      console.error('Failed to approve incident:', err);
    }
  }, []);

  /** Dismisses an incident as a false positive. */
  const handleDismiss = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'incidents', id), { status: 'dismissed' });
    } catch (err) {
      console.error('Failed to dismiss incident:', err);
    }
  }, []);

  const pendingCount = incidents.filter(i => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pr-80">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white">
        Skip to main content
      </a>

      <header className="border-b border-slate-800 bg-slate-900/50 p-6 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md" role="banner">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            COMMAND DECK
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono tracking-widest uppercase">
            AI Chief of Staff · Operations
          </p>
        </div>
        <button 
          onClick={handleTriggerScenario}
          disabled={isTriggering}
          aria-label="Trigger demo scenario for Gate 7 West crowd surge"
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-indigo-900/50 transition-all hover:scale-105 active:scale-95"
        >
          {isTriggering ? '⏳ Triggering...' : '🚨 Trigger Scenario'}
        </button>
      </header>

      <main id="main-content" className="p-8 max-w-4xl mx-auto" role="main">
        <div className="mb-8 flex justify-between items-end border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-200">Active Incidents</h2>
          <span className="text-sm font-mono text-slate-400" aria-live="polite" role="status">
            {pendingCount} Action Required
          </span>
        </div>

        <div className="space-y-6" aria-live="polite" aria-label="Incident list">
          {incidents.length === 0 && (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl" role="status">
              Waiting for incidents... Trigger scenario to begin.
            </div>
          )}
          {incidents.map(incident => {
            let surfacedIn = '';
            if (incident.createdAt && incident.evidenceEventIds.length > 0) {
              let oldest = Infinity;
              for (const eid of incident.evidenceEventIds) {
                const ts = eventTimestamps.get(eid);
                if (ts && ts < oldest) oldest = ts;
              }
              if (oldest !== Infinity) {
                const created = incident.createdAt.toMillis ? incident.createdAt.toMillis() : Date.now();
                const diffSecs = Math.max(0, Math.floor((created - oldest) / 1000));
                surfacedIn = `${diffSecs}s`;
              }
            }
            return (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                surfacedIn={surfacedIn}
                onApprove={handleApprove} 
                onDismiss={handleDismiss} 
              />
            )
          })}
        </div>
      </main>

      <RawFeedPanel events={events} />
    </div>
  )
}

export default App
