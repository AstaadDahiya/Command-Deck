import { memo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';

/** Represents a processed incident from the AI reasoning pipeline. */
export interface Incident {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  zone: string;
  brief: string;
  evidenceEventIds: string[];
  recommendedAction: string;
  sopSource: string;
  status: 'pending' | 'approved' | 'dismissed';
  createdAt: Timestamp | null;
}

const severityConfig: Record<Incident['severity'], { classes: string; icon: string; label: string }> = {
  low:      { classes: 'bg-gray-700 border-gray-500 text-gray-200',         icon: 'ℹ️', label: 'Low severity' },
  medium:   { classes: 'bg-yellow-900/50 border-yellow-600 text-yellow-200', icon: '⚠️', label: 'Medium severity' },
  high:     { classes: 'bg-orange-900/50 border-orange-600 text-orange-200', icon: '🔶', label: 'High severity' },
  critical: { classes: 'bg-red-900/50 border-red-600 text-red-200',         icon: '🔴', label: 'Critical severity' }
};

interface IncidentCardProps {
  incident: Incident;
  surfacedIn?: string;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

/** Renders a single incident card with severity indicator, action buttons, and evidence trail. */
export const IncidentCard = memo<IncidentCardProps>(function IncidentCard({ incident, surfacedIn, onApprove, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[incident.severity];

  const isoTime = incident.createdAt?.toMillis
    ? new Date(incident.createdAt.toMillis()).toISOString()
    : '';
  const displayTime = incident.createdAt?.toMillis
    ? new Date(incident.createdAt.toMillis()).toLocaleTimeString()
    : '';

  return (
    <article
      className={`p-4 mb-4 border rounded-lg shadow-lg ${config.classes} transition-all duration-500 ease-in-out animate-fade-in`}
      aria-label={`${config.label} incident at ${incident.zone}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{incident.zone}</h3>
        <div className="flex flex-col items-end gap-1">
          <span
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded bg-black/30 border border-white/10"
            aria-label={config.label}
            role="status"
          >
            {config.icon} {incident.severity}
          </span>
          {displayTime && (
            <time className="text-[10px] text-white/70 font-mono flex items-center gap-2" dateTime={isoTime}>
              {displayTime}
              {surfacedIn && <span className="text-blue-300 font-bold bg-blue-900/40 px-1 rounded">⚡ Surfaced in {surfacedIn}</span>}
            </time>
          )}
        </div>
      </div>
      
      <p className="mb-4 text-sm font-medium">{incident.brief}</p>
      
      <div className="bg-black/40 p-3 rounded-md mb-4 border border-white/10">
        <p className="text-xs text-gray-300 mb-1 font-semibold uppercase tracking-wider">Recommended Action</p>
        <p className="text-sm font-bold text-white">{incident.recommendedAction}</p>
        <p className="text-xs text-gray-300 mt-2 italic flex gap-1">
          <span className="text-blue-300">SOP Citation:</span> {incident.sopSource}
        </p>
      </div>

      {incident.status === 'pending' ? (
        <div className="flex gap-2 mb-2" role="group" aria-label="Incident actions">
          <button
            onClick={() => onApprove(incident.id)}
            aria-label={`Approve and dispatch incident at ${incident.zone}`}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            ✅ Approve &amp; Dispatch
          </button>
          <button
            onClick={() => onDismiss(incident.id)}
            aria-label={`Dismiss incident at ${incident.zone}`}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            ❌ Dismiss
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            className={`text-center py-2 rounded font-bold uppercase tracking-wider text-sm ${incident.status === 'approved' ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-300 border border-gray-600'}`}
            role="status"
            aria-label={`Incident ${incident.status}`}
          >
            {incident.status === 'approved' ? '✅ ' : '❌ '}{incident.status}
          </div>
          
          {incident.status === 'approved' && (
            <div className="bg-blue-900/30 p-3 rounded border border-blue-500/30" role="status" aria-label="Dispatch instruction">
              <p className="text-xs text-blue-300 font-semibold mb-1 uppercase">📡 Dispatch Transmitted</p>
              <p className="text-sm text-gray-200">&quot;Attention: {incident.recommendedAction}&quot;</p>
              <p className="text-sm text-gray-400 italic mt-1" lang="es" aria-label="Spanish translation">&quot;Atención: {incident.recommendedAction}&quot;</p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`evidence-${incident.id}`}
        className="text-xs text-gray-400 hover:text-white transition-colors w-full text-left mt-2 flex justify-between focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
      >
        <span>Evidence Trail ({incident.evidenceEventIds.length} signals)</span>
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      <div
        id={`evidence-${incident.id}`}
        className={`mt-2 pt-2 border-t border-white/10 text-xs text-gray-300 ${expanded ? '' : 'hidden'}`}
        role="list"
        aria-label="Evidence event IDs"
      >
        <ul className="list-disc pl-4 space-y-1">
          {incident.evidenceEventIds.map((eid) => (
            <li key={eid} role="listitem">Event ID: <code>{eid}</code></li>
          ))}
        </ul>
      </div>
    </article>
  );
});
