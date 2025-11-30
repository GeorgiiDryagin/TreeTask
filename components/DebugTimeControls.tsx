
import React, { useEffect, useState } from 'react';

interface DebugTimeControlsProps {
  debugOffset: number;
  setDebugOffset: (offset: number | ((prev: number) => number)) => void;
  t: any;
}

export const DebugTimeControls: React.FC<DebugTimeControlsProps> = ({ debugOffset, setDebugOffset, t }) => {
  const [simulatedTime, setSimulatedTime] = useState(new Date(Date.now() + debugOffset));

  useEffect(() => {
    // Update the display every second to show "ticking" simulated time
    const timer = setInterval(() => {
      setSimulatedTime(new Date(Date.now() + debugOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [debugOffset]);

  const addOffset = (ms: number) => {
    setDebugOffset((prev) => prev + ms);
  };

  const resetTime = () => {
    setDebugOffset(0);
  };

  const formatDateTime = (d: Date) => {
    return d.toLocaleString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Visibility is controlled by parent now, so no internal check needed here.
  // Component is only rendered if active.

  return (
    <div className="bg-gray-800 text-white text-xs p-2 flex flex-col sm:flex-row items-center justify-center gap-4 border-b border-gray-700 shadow-inner z-50">
      <div className="flex items-center gap-2 font-mono text-emerald-400">
        <i className="fas fa-clock"></i>
        <span>{formatDateTime(simulatedTime)}</span>
        {debugOffset !== 0 && <span className="text-orange-400 font-bold">(DEBUG)</span>}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => addOffset(-604800000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">-1 Wk</button>
        <button onClick={() => addOffset(-86400000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">-1 Day</button>
        <button onClick={() => addOffset(-3600000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">-1h</button>
        <button onClick={resetTime} className="px-3 py-1 bg-red-900/50 hover:bg-red-900 border border-red-800 rounded text-red-200">Reset</button>
        <button onClick={() => addOffset(3600000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">+1h</button>
        <button onClick={() => addOffset(86400000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">+1 Day</button>
        <button onClick={() => addOffset(604800000)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">+1 Wk</button>
      </div>
    </div>
  );
};
