
import React from 'react';

export const TreeTaskLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="512" height="512" rx="120" fill="#10B981"/>

      {/* Connections */}
      <path d="M256 400 L 160 280" stroke="white" strokeWidth="12" strokeLinecap="round" />
      <path d="M256 400 L 352 280" stroke="white" strokeWidth="12" strokeLinecap="round" />
      
      <path d="M160 280 L 90 160" stroke="white" strokeWidth="12" strokeLinecap="round" />
      <path d="M160 280 L 230 160" stroke="white" strokeWidth="12" strokeLinecap="round" />
      
      <path d="M352 280 L 422 160" stroke="white" strokeWidth="12" strokeLinecap="round" />

      {/* Nodes */}

      {/* Root (256, 400) - Unchecked */}
      <circle cx="256" cy="400" r="36" fill="white" />
      <rect x="236" y="394" width="40" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>
      <rect x="236" y="406" width="24" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>

      {/* L1 Left (160, 280) - Unchecked */}
      <circle cx="160" cy="280" r="36" fill="white" />
      <rect x="140" y="274" width="40" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>
      <rect x="140" y="286" width="24" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>

      {/* L1 Right (352, 280) - Checked */}
      <circle cx="352" cy="280" r="36" fill="white" />
      <path d="M336 280 L 348 292 L 368 268" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>

      {/* L2 Left A (90, 160) - Checked (NEW) */}
      <circle cx="90" cy="160" r="36" fill="white" />
      <path d="M74 160 L 86 172 L 106 148" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>

      {/* L2 Left B (230, 160) - Unchecked */}
      <circle cx="230" cy="160" r="36" fill="white" />
      <rect x="210" y="154" width="40" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>
      <rect x="210" y="166" width="24" height="6" rx="3" fill="#10B981" fillOpacity="0.3"/>

      {/* L2 Right (422, 160) - Checked */}
      <circle cx="422" cy="160" r="36" fill="white" />
      <path d="M406 160 L 418 172 L 438 148" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};
