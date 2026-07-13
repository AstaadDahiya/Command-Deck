import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from './firebase'
import { IncidentCard } from './components/IncidentCard'
import type { Incident } from './components/IncidentCard'
import { triggerScenario } from './services/scenarioService'
import type { OpsEvent } from './services/scenarioService'

const RawFeedPanel = lazy(() =>
  import('./components/RawFeedPanel').then(m => ({ default: m.RawFeedPanel }))
)

/**
 * Root application component for Command Deck.
 * Subscribes to real-time Firestore listeners for incidents and events,
 * and renders the main dashboard layout.
 */
function App(): React.JSX.Element {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [events, setEvents] = useState<OpsEvent[]>([])
  const [isTriggering, setIsTriggering] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => { setAuthReady(true) })
      .catch(() => { setError('Authentication failed. Please refresh the page.') })
  }, [])

  useEffect(() => {
    if (!authReady) return;
    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      const inc = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Incident);
      setIncidents(inc);
    });

    const qEvents = query(collection(db, 'events'), orderBy('timestamp', 'desc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const evts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as OpsEvent);
      setEvents(evts);
    });

    return () => {
      unsubIncidents();
      unsubEvents();
    }
  }, [authReady]);

  /** Pre-compute event timestamps into a Map for O(1) lookups. */
  const eventTimestamps = useMemo(() => {
    const map = new Map<string, number>();
    for (const evt of events) {
      if (evt.timestamp?.toMillis) {
        map.set(evt.id, evt.timestamp.toMillis());
      }
    }
    return map;
  }, [events]);

  /** Pre-compute surfacedIn for each incident. */
  const surfacedInMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const incident of incidents) {
      if (incident.createdAt?.toMillis && incident.evidenceEventIds.length > 0) {
        let oldest = Infinity;
        for (const eid of incident.evidenceEventIds) {
          const ts = eventTimestamps.get(eid);
          if (ts !== undefined && ts < oldest) oldest = ts;
        }
        if (oldest !== Infinity) {
          const diffSecs = Math.max(0, Math.floor((incident.createdAt.toMillis() - oldest) / 1000));
          map.set(incident.id, `${diffSecs}s`);
        }
      }
    }
    return map;
  }, [incidents, eventTimestamps]);

  const pendingCount = useMemo(
    () => incidents.filter(i => i.status === 'pending').length,
    [incidents]
  );

  /** Triggers the demo scenario and manages button loading state. */
  const handleTriggerScenario = useCallback(async (): Promise<void> => {
    setIsTriggering(true);
    setError(null);
    try {
      await triggerScenario();
    } catch {
      setError('Failed to trigger scenario. Please try again.');
    } finally {
      setTimeout(() => setIsTriggering(false), 2000);
    }
  }, []);

  /** Approves an incident and dispatches the recommended action. */
  const handleApprove = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await updateDoc(doc(db, 'incidents', id), { status: 'approved' });
    } catch {
      setError('Failed to approve incident. Please try again.');
    }
  }, []);

  /** Dismisses an incident as a false positive. */
  const handleDismiss = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await updateDoc(doc(db, 'incidents', id), { status: 'dismissed' });
    } catch {
      setError('Failed to dismiss incident. Please try again.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pr-80">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white">
        Skip to main content
      </a>

      {error && (
        <div
          className="fixed top-0 left-0 right-80 z-50 bg-red-900/90 text-red-100 px-6 py-3 text-sm font-medium flex justify-between items-center"
          role="alert"
          aria-live="assertive"
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-white font-bold ml-4 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2"
            aria-label="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

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
          aria-busy={isTriggering}
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

        <div className="space-y-6" aria-live="polite" aria-label="Incident list" aria-busy={!authReady}>
          {!authReady && (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl" role="status">
              Authenticating...
            </div>
          )}
          {authReady && incidents.length === 0 && (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl" role="status">
              Waiting for incidents... Trigger scenario to begin.
            </div>
          )}
          {incidents.map(incident => (
            <IncidentCard 
              key={incident.id} 
              incident={incident} 
              surfacedIn={surfacedInMap.get(incident.id) ?? ''}
              onApprove={handleApprove} 
              onDismiss={handleDismiss} 
            />
          ))}
        </div>
      </main>

      <Suspense fallback={<aside className="bg-gray-900/80 border-l border-gray-800 p-4 h-screen w-80 fixed right-0 top-0 flex items-center justify-center text-slate-500">Loading feed...</aside>}>
        <RawFeedPanel events={events} />
      </Suspense>
    </div>
  )
}

export default App
