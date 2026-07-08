import React from 'react';
import type { OpsEvent } from '../services/scenarioService';

export const RawFeedPanel: React.FC<{ events: (OpsEvent & { id: string })[] }> = ({ events }) => {
  return (
    <div className="bg-gray-900/80 border-l border-gray-800 p-4 h-screen overflow-y-auto w-80 fixed right-0 top-0">
      <h2 className="text-xl font-bold mb-4 text-gray-200 sticky top-0 bg-gray-900/90 py-2 border-b border-gray-800">
        Raw Feeds 
        <span className="ml-2 text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 font-mono">Live</span>
      </h2>
      <div className="space-y-3">
        {events.length === 0 && <p className="text-gray-500 text-sm italic">Waiting for events...</p>}
        {events.map((evt) => (
          <div key={evt.id} className="text-xs bg-black/40 p-2 rounded border border-gray-800 font-mono">
            <div className="flex justify-between text-gray-500 mb-1">
              <span className="uppercase text-blue-400">{evt.source}</span>
              <span>{new Date(evt.timestamp?.toMillis ? evt.timestamp.toMillis() : Date.now()).toLocaleTimeString()}</span>
            </div>
            <div className="text-gray-300">
              {evt.source === 'radio' && `"${evt.raw.transcript}"`}
              {evt.source === 'sensor' && `Density: ${evt.raw.density} ${evt.raw.metric}`}
              {evt.source === 'cctv' && `ANOMALY: ${evt.raw.anomalyType} (${(evt.raw.confidence * 100).toFixed(0)}%)`}
            </div>
            <div className="text-gray-500 mt-1">Zone: {evt.zone}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
