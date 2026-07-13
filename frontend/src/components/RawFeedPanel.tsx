import { memo } from 'react';
import type { OpsEvent, RadioPayload, SensorPayload, CCTVPayload } from '../services/scenarioService';

interface RawFeedPanelProps {
  events: OpsEvent[];
}

const sourceLabels: Record<string, string> = {
  radio: '📻 RADIO',
  sensor: '📡 SENSOR',
  cctv: '📹 CCTV',
};

/** Renders the raw payload for a single event based on its source type. */
function renderEventContent(evt: OpsEvent): string {
  switch (evt.source) {
    case 'radio': {
      const payload = evt.raw as RadioPayload;
      return `"${payload.transcript}"`;
    }
    case 'sensor': {
      const payload = evt.raw as SensorPayload;
      return `Density: ${payload.density} ${payload.metric}`;
    }
    case 'cctv': {
      const payload = evt.raw as CCTVPayload;
      return `ANOMALY: ${payload.anomalyType} (${(payload.confidence * 100).toFixed(0)}%)`;
    }
  }
}

/** Side panel displaying the raw, unprocessed event feed in real time. */
export const RawFeedPanel = memo<RawFeedPanelProps>(function RawFeedPanel({ events }) {
  return (
    <aside
      className="bg-gray-900/80 border-l border-gray-800 p-4 h-screen overflow-y-auto w-80 fixed right-0 top-0"
      aria-label="Raw event feeds"
      role="complementary"
    >
      <h2 className="text-xl font-bold mb-4 text-gray-200 sticky top-0 bg-gray-900/90 py-2 border-b border-gray-800">
        Raw Feeds 
        <span className="ml-2 text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 font-mono" aria-label="Feed status: live">Live</span>
      </h2>
      <div className="space-y-3" aria-live="polite" aria-atomic="false" role="log">
        {events.length === 0 && <p className="text-gray-400 text-sm italic" role="status">Waiting for events...</p>}
        {events.map((evt) => {
          const isoTimestamp = evt.timestamp?.toMillis
            ? new Date(evt.timestamp.toMillis()).toISOString()
            : new Date().toISOString();
          const displayTimestamp = evt.timestamp?.toMillis
            ? new Date(evt.timestamp.toMillis()).toLocaleTimeString()
            : new Date().toLocaleTimeString();

          return (
            <div key={evt.id} className="text-xs bg-black/40 p-2 rounded border border-gray-800 font-mono" aria-label={`${evt.source} event at ${evt.zone}`}>
              <div className="flex justify-between text-gray-400 mb-1">
                <span className="uppercase text-blue-400">{sourceLabels[evt.source] ?? evt.source}</span>
                <time dateTime={isoTimestamp}>{displayTimestamp}</time>
              </div>
              <div className="text-gray-300">
                {renderEventContent(evt)}
              </div>
              <div className="text-gray-400 mt-1">Zone: {evt.zone}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
