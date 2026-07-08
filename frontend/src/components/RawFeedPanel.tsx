import type { OpsEvent } from '../services/scenarioService';

interface RawFeedPanelProps {
  events: OpsEvent[];
}

const sourceLabels: Record<string, string> = {
  radio: '📻 RADIO',
  sensor: '📡 SENSOR',
  cctv: '📹 CCTV',
};

/** Side panel displaying the raw, unprocessed event feed in real time. */
export const RawFeedPanel: React.FC<RawFeedPanelProps> = ({ events }) => {
  return (
    <aside
      className="bg-gray-900/80 border-l border-gray-800 p-4 h-screen overflow-y-auto w-80 fixed right-0 top-0"
      aria-label="Raw event feeds"
      role="complementary"
    >
      <h2 className="text-xl font-bold mb-4 text-gray-200 sticky top-0 bg-gray-900/90 py-2 border-b border-gray-800">
        Raw Feeds 
        <span className="ml-2 text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 font-mono" aria-label="Feed status: live">Live</span>
      </h2>
      <div className="space-y-3" aria-live="polite" aria-atomic="false" role="log">
        {events.length === 0 && <p className="text-gray-500 text-sm italic" role="status">Waiting for events...</p>}
        {events.map((evt) => {
          const timestamp = evt.timestamp?.toMillis
            ? new Date(evt.timestamp.toMillis()).toLocaleTimeString()
            : new Date().toLocaleTimeString();

          return (
            <div key={evt.id} className="text-xs bg-black/40 p-2 rounded border border-gray-800 font-mono" aria-label={`${evt.source} event at ${evt.zone}`}>
              <div className="flex justify-between text-gray-500 mb-1">
                <span className="uppercase text-blue-400">{sourceLabels[evt.source] ?? evt.source}</span>
                <time dateTime={timestamp}>{timestamp}</time>
              </div>
              <div className="text-gray-300">
                {evt.source === 'radio' && `"${(evt.raw as { transcript?: string })?.transcript}"`}
                {evt.source === 'sensor' && `Density: ${(evt.raw as { density?: number; metric?: string })?.density} ${(evt.raw as { density?: number; metric?: string })?.metric}`}
                {evt.source === 'cctv' && `ANOMALY: ${(evt.raw as { anomalyType?: string; confidence?: number })?.anomalyType} (${(((evt.raw as { confidence?: number })?.confidence ?? 0) * 100).toFixed(0)}%)`}
              </div>
              <div className="text-gray-500 mt-1">Zone: {evt.zone}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
