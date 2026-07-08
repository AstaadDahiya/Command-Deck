import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { IncidentCard } from './components/IncidentCard'
import type { Incident } from './components/IncidentCard'
import { RawFeedPanel } from './components/RawFeedPanel'
import { triggerScenario } from './services/scenarioService'

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      const inc = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(inc);
    });

    const qEvents = query(collection(db, 'events'), orderBy('timestamp', 'desc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(evts);
    });

    return () => {
      unsubIncidents();
      unsubEvents();
    }
  }, []);

  const handleTriggerScenario = () => {
    triggerScenario();
  }

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, 'incidents', id), { status: 'approved' });
  }

  const handleDismiss = async (id: string) => {
    await updateDoc(doc(db, 'incidents', id), { status: 'dismissed' });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pr-80">
      <header className="border-b border-slate-800 bg-slate-900/50 p-6 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
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
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-indigo-900/50 transition-all hover:scale-105 active:scale-95"
        >
          🚨 Trigger Scenario
        </button>
      </header>

      <main className="p-8 max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-end border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-200">Active Incidents</h2>
          <span className="text-sm font-mono text-slate-400">{incidents.filter(i => i.status === 'pending').length} Action Required</span>
        </div>

        <div className="space-y-6">
          {incidents.length === 0 && (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Waiting for incidents... Trigger scenario to begin.
            </div>
          )}
          {incidents.map(incident => (
            <IncidentCard 
              key={incident.id} 
              incident={incident} 
              onApprove={handleApprove} 
              onDismiss={handleDismiss} 
            />
          ))}
        </div>
      </main>

      <RawFeedPanel events={events} />
    </div>
  )
}

export default App
