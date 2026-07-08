import React, { useState } from 'react';

export interface Incident {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  zone: string;
  brief: string;
  evidenceEventIds: string[];
  recommendedAction: string;
  sopSource: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: any;
}

const severityColors = {
  low: 'bg-gray-700 border-gray-500 text-gray-200',
  medium: 'bg-yellow-900/50 border-yellow-600 text-yellow-200',
  high: 'bg-orange-900/50 border-orange-600 text-orange-200',
  critical: 'bg-red-900/50 border-red-600 text-red-200'
};

export const IncidentCard: React.FC<{ incident: Incident, onApprove: (id: string) => void, onDismiss: (id: string) => void }> = ({ incident, onApprove, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-4 mb-4 border rounded-lg shadow-lg ${severityColors[incident.severity]} transition-all duration-500 ease-in-out animate-fade-in`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{incident.zone}</h3>
        <div className="flex flex-col items-end gap-1">
          <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded bg-black/30 border border-white/10">
            {incident.severity}
          </span>
          <span className="text-[10px] text-white/50 font-mono">
            {incident.createdAt ? new Date(incident.createdAt.toMillis ? incident.createdAt.toMillis() : Date.now()).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>
      
      <p className="mb-4 text-sm font-medium">{incident.brief}</p>
      
      <div className="bg-black/20 p-3 rounded-md mb-4 border border-white/5">
        <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Recommended Action</p>
        <p className="text-sm font-bold text-white">{incident.recommendedAction}</p>
        <p className="text-xs text-gray-400 mt-2 italic flex gap-1">
          <span className="text-blue-400">SOP Citation:</span> {incident.sopSource}
        </p>
      </div>

      {incident.status === 'pending' ? (
        <div className="flex gap-2 mb-2">
          <button onClick={() => onApprove(incident.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold transition-colors">
            Approve & Dispatch
          </button>
          <button onClick={() => onDismiss(incident.id)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-bold transition-colors">
            Dismiss
          </button>
        </div>
      ) : (
        <div className={`text-center py-2 rounded font-bold uppercase tracking-wider text-sm ${incident.status === 'approved' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
          {incident.status}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-white transition-colors w-full text-left mt-2 flex justify-between">
        <span>Evidence Trail ({incident.evidenceEventIds.length} signals)</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-300">
          <ul className="list-disc pl-4 space-y-1">
            {incident.evidenceEventIds.map((id, idx) => (
              <li key={idx}>Event ID: {id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
