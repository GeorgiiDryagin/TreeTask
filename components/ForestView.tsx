
import React, { useMemo, useRef } from 'react';
import { Task } from '../types';

interface ForestViewProps {
  tasks: Task[];
  t: any;
  onEdit: (task: Task) => void;
  onFocusRoot: (task: Task) => void; // New prop
}

interface TreeNode {
  task: Task;
  children: TreeNode[];
}

const buildTree = (root: Task, allTasks: Task[]): TreeNode => {
  const children = allTasks.filter(t => t.parentId === root.id);
  return {
    task: root,
    children: children.map(c => buildTree(c, allTasks))
  };
};

const getTreeDepth = (node: TreeNode): number => {
    if (node.children.length === 0) return 0;
    return 1 + Math.max(...node.children.map(getTreeDepth));
};

// Deterministic Random Generator
const getPseudoRandom = (input: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) / 4294967296);
}

// Deterministic color generator
const getTaskNodeColor = (task: Task) => {
    const isCompleted = ['Completed', 'Cancelled'].includes(task.status);
    const rng = getPseudoRandom(task.id + "color");
    
    if (isCompleted) {
        // Yellow/Orange/Amber/Gold shades
        const colors = [
            "#FCD34D", // Amber-300
            "#F59E0B", // Amber-500
            "#D97706", // Amber-600
            "#F97316", // Orange-500
            "#EAB308", // Yellow-500
        ];
        return colors[Math.floor(rng * colors.length)];
    } else {
        // Various shades of Green/Emerald/Teal/Lime
        const greens = [
            "#4ADE80", // Green-400
            "#22C55E", // Green-500
            "#16A34A", // Green-600
            "#10B981", // Emerald-500
            "#34D399", // Emerald-400
            "#84CC16", // Lime-500
            "#14B8A6", // Teal-500
        ];
        return greens[Math.floor(rng * greens.length)];
    }
};

// Helper to format title: Max 2 words per line
const formatRootTitle = (title: string): string[] => {
    const words = title.split(' ');
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += 2) {
        lines.push(words.slice(i, i + 2).join(' '));
    }
    return lines;
};

// Recursive Component to draw branches
const FractalBranch: React.FC<{
  node: TreeNode;
  x: number;
  y: number;
  angle: number;
  length: number;
  depth: number;
  onEdit: (task: Task) => void;
}> = ({ node, x, y, angle, length, depth, onEdit }) => {
  // End point of this branch
  const endX = x + length * Math.cos(angle);
  const endY = y - length * Math.sin(angle); // Subtract because SVG Y goes down

  const nodeColor = getTaskNodeColor(node.task);
  
  // Radius Logic:
  // Max diameter 25mm ~ 48px radius.
  // Min diameter 10mm ~ 19px radius.
  // Size depends on distance from root (depth) + Randomness.
  // The higher (deeper), the smaller.
  const maxR = 48;
  const minR = 19;
  
  const rng = getPseudoRandom(node.task.id + "radius");
  const effectiveDepth = depth + 1; // 1, 2, 3...
  
  // Base decay: lose ~5px per level up
  let baseRadius = maxR - (effectiveDepth * 5);
  
  // Random jitter: +/- 5px
  const jitter = (rng - 0.5) * 10;
  
  let radius = baseRadius + jitter;
  
  // Clamp strict limits
  radius = Math.max(minR, Math.min(maxR, radius));

  // Branch styling
  const branchColor = "#5D4037"; // Darker wood color
  // Start thicker (18px) and decrease by 2px per level, minimum 2px
  const strokeWidth = Math.max(2, 18 - (depth * 2)); 
  const isLeaf = node.children.length === 0;

  // Curvature Calculation
  // We use a Quadratic Bezier curve (Q).
  // Control point is the midpoint displaced perpendicularly.
  const curveRng = getPseudoRandom(node.task.id + "curve");
  const curveAmount = (curveRng - 0.5) * length * 0.25; // Random curvature up to 25% of length
  
  const midX = (x + endX) / 2;
  const midY = (y + endY) / 2;
  
  // Perpendicular vector to the angle: (sin(a), cos(a)) roughly
  const cpX = midX + curveAmount * Math.sin(angle);
  const cpY = midY + curveAmount * Math.cos(angle);

  return (
    <g>
      {/* 1. Curved Branch Line connecting Parent to Self */}
      <path 
        d={`M ${x} ${y} Q ${cpX} ${cpY} ${endX} ${endY}`}
        stroke={branchColor} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round"
        fill="none"
      />
      
      {/* 2. Recursion for Children (Drawn BEFORE current node so lines are underneath) */}
      {node.children.map((child, i) => {
        const count = node.children.length;
        const childRng = getPseudoRandom(child.task.id + "branch");
        
        // --- Angle Logic ---
        const maxCone = Math.PI / 1.4; 
        const coneWidth = Math.min(maxCone, count * (Math.PI / 8)); 
        
        const startAngle = angle + (coneWidth / 2);
        const step = count > 1 ? coneWidth / (count - 1) : 0;
        
        let targetAngle = count === 1 
            ? angle + ((childRng - 0.5) * 0.5) // Single child: slight random wobble
            : startAngle - (step * i);         // Fan out

        // Add organic jitter
        const jitter = (getPseudoRandom(child.task.id + "jitter") - 0.5) * 0.3;
        targetAngle += jitter;

        // Constraint: Upper Half Priority
        const minAngle = Math.PI * 0.15; 
        const maxAngle = Math.PI * 0.85; 
        
        if (targetAngle < minAngle) targetAngle = minAngle + (childRng * 0.1);
        if (targetAngle > maxAngle) targetAngle = maxAngle - (childRng * 0.1);

        // Decay length significantly with depth
        // Increase base decay slightly to support longer visuals
        const decay = 0.70 + (childRng * 0.10); 

        return (
          <FractalBranch 
            key={child.task.id}
            node={child}
            x={endX}
            y={endY}
            angle={targetAngle}
            length={length * decay}
            depth={depth + 1}
            onEdit={onEdit}
          />
        );
      })}

      {/* 3. Node Circle at End of Branch (Drawn LAST to be on top) */}
      <g 
        className="cursor-pointer group"
        onClick={(e) => { e.stopPropagation(); onEdit(node.task); }}
      >
            <title>{node.task.title} ({node.task.status})</title>
            <circle 
            cx={endX} 
            cy={endY} 
            r={radius} 
            fill={nodeColor} 
            stroke={isLeaf ? "#064E3B" : branchColor}
            strokeWidth={isLeaf ? 2 : 1}
            className="transition-all duration-200 group-hover:brightness-110 group-hover:stroke-2"
            />
      </g>
    </g>
  );
};

// Component for a Single Tree
const TreeSvg: React.FC<{ rootNode: TreeNode, heightPercent: number, onEdit: (task: Task) => void, onFocusRoot: (task: Task) => void }> = ({ rootNode, heightPercent, onEdit, onFocusRoot }) => {
  const isSingle = rootNode.children.length === 0;
  const depth = getTreeDepth(rootNode);

  // Layout Dimensions - Increased to accommodate longer branches
  const width = isSingle ? 140 : 350 + (depth * 100);
  const height = isSingle ? 140 : 400 + (depth * 120);
  
  const centerX = width / 2;
  const groundY = height - 20; // Bottom of SVG drawing area

  // RNG for this tree
  const rng = getPseudoRandom(rootNode.task.id + "treeConfig");
  
  // Trunk Logic - Longer trunks
  const trunkLength = isSingle ? 0 : 120 + (depth * 30) + (rng * 40); 
  const trunkAngle = (Math.PI / 2) + ((rng - 0.5) * 0.15); // Slight tilt

  // Coordinates for Top of Trunk (where children start)
  const trunkTopX = centerX + trunkLength * Math.cos(trunkAngle);
  const trunkTopY = groundY - trunkLength * Math.sin(trunkAngle);

  // Trunk Curvature
  const trunkCurveRng = getPseudoRandom(rootNode.task.id + "trunkCurve");
  const trunkCurveOffset = (trunkCurveRng - 0.5) * trunkLength * 0.15;
  const trunkMidX = (centerX + trunkTopX) / 2;
  const trunkMidY = (groundY + trunkTopY) / 2;
  // Perpendicular
  const trCpX = trunkMidX + trunkCurveOffset * Math.sin(trunkAngle);
  const trCpY = trunkMidY + trunkCurveOffset * Math.cos(trunkAngle);

  // Root Node styling
  const rootColor = getTaskNodeColor(rootNode.task);
  
  // Radius Logic:
  // Standalone tasks: 10mm (~19px)
  // Root of complex tree: 25mm (~48px)
  const rootRadius = isSingle ? 19 : 48; 

  const formattedTitleLines = formatRootTitle(rootNode.task.title);

  return (
    <div 
        className={`flex flex-col items-center justify-end shrink-0 relative`}
        style={{ 
            height: `${heightPercent}%`, 
            // Changed from -15px to +30px to spread them out
            marginLeft: '30px',
            marginRight: '30px',
            zIndex: Math.floor(heightPercent)
        }}
    >
       {/* SVG Container */}
       <div className="flex-1 w-full min-h-0 relative flex items-end justify-center pb-2">
            <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    className="w-auto h-full overflow-visible drop-shadow-md"
                    preserveAspectRatio="xMidYMax meet"
            >
                    {/* 1. TRUNK */}
                    {!isSingle && (
                        <path 
                            d={`M ${centerX} ${groundY} Q ${trCpX} ${trCpY} ${trunkTopX} ${trunkTopY}`}
                            stroke="#5D4037" 
                            strokeWidth={22} 
                            strokeLinecap="round"
                            fill="none"
                        />
                    )}

                    {/* 2. CHILDREN (Branches drawn first) */}
                    {!isSingle && rootNode.children.map((child, i) => {
                        const count = rootNode.children.length;
                        const childRng = getPseudoRandom(child.task.id + "rootbranch");
                        
                        const maxCone = Math.PI / 1.5; 
                        const coneWidth = Math.min(maxCone, count * (Math.PI / 6));
                        const startAngle = trunkAngle + (coneWidth / 2);
                        const step = count > 1 ? coneWidth / (count - 1) : 0;
                        
                        let targetAngle = count === 1 
                            ? trunkAngle + ((childRng - 0.5) * 0.4) 
                            : startAngle - (step * i);

                        targetAngle += (getPseudoRandom(child.task.id + "j") - 0.5) * 0.2;

                        // Increased base length for primary branches
                        return (
                            <FractalBranch 
                                key={child.task.id}
                                node={child}
                                x={trunkTopX}
                                y={trunkTopY}
                                angle={targetAngle}
                                length={140 * (0.8 + childRng * 0.3)} 
                                depth={0}
                                onEdit={onEdit}
                            />
                        )
                    })}

                    {/* 3. ROOT NODE CIRCLE (Drawn last to be on top) */}
                    <g 
                        className="cursor-pointer group"
                        onClick={(e) => { e.stopPropagation(); onEdit(rootNode.task); }}
                    >
                        <title>{rootNode.task.title} ({rootNode.task.status})</title>
                        <circle 
                            cx={isSingle ? centerX : trunkTopX} 
                            cy={isSingle ? groundY - rootRadius : trunkTopY} 
                            r={rootRadius} 
                            fill={rootColor} 
                            stroke="#5D4037" 
                            strokeWidth={isSingle ? 2 : 0}
                            className="transition-all duration-200 group-hover:brightness-110"
                        />
                    </g>
            </svg>
       </div>
       
       {/* Permanent Label Below Tree - Absolute & Rotated */}
       <div 
          onClick={() => onFocusRoot(rootNode.task)}
          className="absolute top-full left-1/2 transform -translate-x-1/4 mt-1 origin-top-left rotate-45 flex flex-col items-start bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/20 dark:border-white/10 z-20 cursor-pointer hover:scale-105 hover:bg-white dark:hover:bg-black/70 hover:shadow-md transition-all duration-200"
       >
          {formattedTitleLines.map((line, idx) => (
             <span key={idx} className="text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap leading-tight">
                 {line}
             </span>
          ))}
       </div>
    </div>
  );
}

export const ForestView: React.FC<ForestViewProps> = ({ tasks, t, onEdit, onFocusRoot }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Build Trees
  const rootNodes = useMemo(() => {
     // FILTER: Exclude recurring tasks
     const visibleTasks = tasks.filter(t => !t.isRecurring);

     const taskIds = new Set(visibleTasks.map(t => t.id));
     // Identify roots within the non-recurring set
     const roots = visibleTasks.filter(t => !t.parentId || !taskIds.has(t.parentId));
     return roots.map(root => buildTree(root, visibleTasks));
  }, [tasks]);

  // 2. Sort Trees
  const sortedRoots = useMemo(() => {
      const getCompletionPercent = (node: TreeNode) => {
          if (node.task.totalChildrenCount === 0) return 0;
          const completed = node.task.totalChildrenCount - node.task.pendingChildrenCount;
          return completed / node.task.totalChildrenCount;
      };

      return [...rootNodes].sort((a, b) => {
          const isACompleted = ['Completed', 'Cancelled'].includes(a.task.status);
          const isBCompleted = ['Completed', 'Cancelled'].includes(b.task.status);

          if (isACompleted && !isBCompleted) return -1;
          if (!isACompleted && isBCompleted) return 1;

          if (isACompleted && isBCompleted) {
              const dateA = a.task.completedAt || 0;
              const dateB = b.task.completedAt || 0;
              return dateA - dateB;
          } else {
              const perA = getCompletionPercent(a);
              const perB = getCompletionPercent(b);
              if (perA !== perB) return perB - perA; // Descending
              return a.task.createdAt - b.task.createdAt;
          }
      });
  }, [rootNodes]);
  
  const maxForestDepth = useMemo(() => {
      if (rootNodes.length === 0) return 0;
      return Math.max(...rootNodes.map(getTreeDepth), 0);
  }, [rootNodes]);

  const scrollToEnd = () => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
      }
  };

  if (tasks.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 bg-green-50 dark:bg-green-950/30 rounded-3xl m-4 border-2 border-dashed border-green-200 dark:border-green-900">
              <i className="fas fa-seedling text-4xl mb-2 text-green-300 dark:text-green-800"></i>
              <p>{t.forestEmpty}</p>
          </div>
      )
  }

  return (
    // Window takes full height available (layout handled by App.tsx)
    <div className="relative w-full h-full flex flex-col bg-green-100 dark:bg-green-950 transition-colors duration-500 overflow-hidden rounded-3xl shadow-inner border border-green-200 dark:border-green-900">
       
       {/* Ambient Light/Shadow Overlay */}
       <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-green-900/10 dark:to-black/40 z-0"></div>

       {/* Horizontal Scroll Container */}
       {/* Increased bottom padding to lift trees further up and accommodate rotated labels */}
       <div 
         ref={scrollRef}
         className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar px-6 flex items-end relative z-10 pb-48"
       >
           {/* Trees arranged in a single horizontal line */}
           {sortedRoots.map(node => {
               const depth = getTreeDepth(node);
               // Scale Logic:
               // If maxForestDepth is 0 (all single), everything is 50%
               // If maxForestDepth > 0: Map depth 0 -> 50%, Max -> 90%
               
               let percent = 50;
               if (maxForestDepth > 0) {
                   const ratio = depth / maxForestDepth;
                   percent = 50 + (ratio * 40); // 50% base + up to 40% growth
               }
               
               return <TreeSvg key={node.task.id} rootNode={node} heightPercent={percent} onEdit={onEdit} onFocusRoot={onFocusRoot} />
           })}
           
           {/* Spacer for right padding */}
           <div className="w-16 shrink-0 h-1"></div>
       </div>

       {/* Floating Action Button for Scroll to Right (Visible on all sizes) */}
       <button 
          onClick={scrollToEnd}
          className="absolute bottom-6 right-6 z-40 w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-green-600 dark:text-green-400 rounded-full shadow-lg border border-green-200 dark:border-green-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Scroll to End"
       >
           <i className="fas fa-arrow-right"></i>
       </button>
    </div>
  );
};
