


import React, { useState, useEffect } from 'react';

interface AnalogTimePickerProps {
  selectedTime: string;
  onSelect: (time: string) => void;
  onClose: () => void;
  t: any;
}

export const AnalogTimePicker: React.FC<AnalogTimePickerProps> = ({ selectedTime, onSelect, onClose, t }) => {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [currentH, setCurrentH] = useState(0);
  const [currentM, setCurrentM] = useState(0);

  useEffect(() => {
    if (selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number);
      if (!isNaN(h)) setCurrentH(h);
      if (!isNaN(m)) setCurrentM(m);
    } else {
      const now = new Date();
      setCurrentH(now.getHours());
      setCurrentM(now.getMinutes());
    }
  }, []); 

  const clockRadius = 80;
  const numberRadiusOuter = 72; 
  const numberRadiusInner = 48; 
  const center = 90; 

  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    const dist = Math.sqrt(x * x + y * y);

    if (mode === 'hours') {
      let h = Math.round(angle / 30);
      if (h === 12) h = 0;
      
      const isInner = dist < 60; 
      
      if (isInner) {
        h += 12; // PM ring (12-23)
      }
      
      setCurrentH(h);
      setMode('minutes');
    } else {
      let m = Math.round(angle / 6);
      if (m === 60) m = 0;
      setCurrentM(m);
      
      const finalH = String(currentH).padStart(2, '0');
      const finalM = String(m).padStart(2, '0');
      onSelect(`${finalH}:${finalM}`);
      onClose();
    }
  };

  const getPos = (val: number, total: number, radius: number) => {
    const angle = (val / total) * 2 * Math.PI - (Math.PI / 2);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const renderNumbers = () => {
    if (mode === 'hours') {
      return (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
             const { x, y } = getPos(h, 12, numberRadiusOuter);
             return (
               <text key={`out-${h}`} x={x} y={y} dominantBaseline="central" textAnchor="middle" className={`text-[10px] font-medium select-none pointer-events-none ${h === currentH ? 'fill-white font-bold' : 'fill-gray-600 dark:fill-gray-300'}`}>
                 {h}
               </text>
             );
          })}
          {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(h => {
             const { x, y } = getPos(h, 12, numberRadiusInner);
             return (
               <text key={`in-${h}`} x={x} y={y} dominantBaseline="central" textAnchor="middle" className={`text-[9px] font-medium select-none pointer-events-none ${h === currentH ? 'fill-white font-bold' : 'fill-gray-500 dark:fill-gray-400'}`}>
                 {h}
               </text>
             );
          })}
        </>
      );
    } else {
       return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
          const { x, y } = getPos(m, 60, numberRadiusOuter);
          return (
             <text key={m} x={x} y={y} dominantBaseline="central" textAnchor="middle" className={`text-[10px] font-medium select-none pointer-events-none ${m === currentM || (m===0 && currentM===60) ? 'fill-white font-bold' : 'fill-gray-600 dark:fill-gray-300'}`}>
               {m.toString().padStart(2, '0')}
             </text>
          );
       });
    }
  };

  const renderHand = () => {
     let val = mode === 'hours' ? currentH : currentM;
     let total = mode === 'hours' ? 12 : 60;
     let radius = numberRadiusOuter;
     if (mode === 'hours') {
         if (val >= 12) {
             val -= 12;
             radius = numberRadiusInner;
         }
     }
     const { x, y } = getPos(val, total, radius);
     return <line x1={center} y1={center} x2={x} y2={y} stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />;
  };
  
  const renderSelector = () => {
     let val = mode === 'hours' ? currentH : currentM;
     let total = mode === 'hours' ? 12 : 60;
     let radius = numberRadiusOuter;
     if (mode === 'hours') {
        if (currentH >= 12) {
           radius = numberRadiusInner;
           val = currentH - 12;
        } else {
           val = currentH;
        }
     }
     const { x, y } = getPos(val, total, radius);
     return <circle cx={x} cy={y} r="12" fill="#4f46e5" className="opacity-100" />;
  }

  return (
    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 p-4 z-50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 w-[200px]" onMouseDown={(e) => e.stopPropagation()}>
       <div className="flex items-end justify-center mb-3 space-x-1">
          <button type="button" onClick={() => setMode('hours')} className={`text-2xl font-bold leading-none ${mode === 'hours' ? 'text-indigo-600' : 'text-gray-400'}`}>{String(currentH).padStart(2,'0')}</button>
          <span className="text-2xl font-bold text-gray-400 leading-none pb-1">:</span>
          <button type="button" onClick={() => setMode('minutes')} className={`text-2xl font-bold leading-none ${mode === 'minutes' ? 'text-indigo-600' : 'text-gray-400'}`}>{String(currentM).padStart(2,'0')}</button>
       </div>
       <div className="relative w-[180px] h-[180px] bg-gray-50 dark:bg-gray-700/50 rounded-full cursor-pointer select-none" onClick={() => {}}>
           <svg width="180" height="180" viewBox="0 0 180 180" onClick={handleClockClick}>
               <circle cx={center} cy={center} r="2" fill="#4f46e5" />
               {renderHand()}
               {renderSelector()}
               {renderNumbers()}
           </svg>
       </div>
       <div className="mt-3 flex justify-end w-full">
           <button type="button" onClick={onClose} className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Done</button>
       </div>
    </div>
  );
};
