import { Info, List, Tags, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { extractHeadings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  content: string;
  onClose: () => void;
  onHeadingClick?: (lineIndex: number) => void;
  activeHeadingIndex?: number;
}

const ITEM_HEIGHT = 28;
const ITEM_GAP = 2;
const STEP = ITEM_HEIGHT + ITEM_GAP;
const PATH_STROKE = 1.5;

function buildOutlinePath(
  headings: { level: number; text: string; lineIndex: number }[],
  endIndex?: number
): string {
  const count = endIndex !== undefined ? endIndex + 1 : headings.length;
  if (count < 2 && endIndex === undefined) return '';
  if (count < 1) return '';

  const getX = (level: number) => (level - 1) * 12 + 6;
  const getY = (index: number) => index * STEP + ITEM_HEIGHT / 2;

  const parts: string[] = [];
  const x0 = getX(headings[0].level);
  const y0 = getY(0);
  parts.push(`M ${x0} ${y0}`);

  for (let i = 1; i < count; i++) {
    const x = getX(headings[i].level);
    const y = getY(i);
    const prevX = getX(headings[i - 1].level);
    const prevY = getY(i - 1);

    if (x === prevX) {
      parts.push(`L ${x} ${y}`);
    } else {
      const midY = prevY + (y - prevY) * 0.35;
      parts.push(`L ${prevX} ${midY}`);
      const ctrlY1 = midY + (y - midY) * 0.3;
      const ctrlY2 = midY + (y - midY) * 0.7;
      parts.push(`C ${prevX} ${ctrlY1}, ${x} ${ctrlY2}, ${x} ${y}`);
    }
  }

  return parts.join(' ');
}

const OutlineSVG = ({
  headings,
  activeHeadingIndex,
}: {
  headings: { level: number; text: string; lineIndex: number }[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  activeHeadingIndex: number;
}) => {
  const fullPath = buildOutlinePath(headings);
  const fullPathRef = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);
  const [segmentLengths, setSegmentLengths] = useState<number[]>([]);

  // Measure total path length and length at each heading node
  useEffect(() => {
    const el = fullPathRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    setTotalLength(total);

    // Compute cumulative length at each heading's point on the path
    const getY = (index: number) => index * STEP + ITEM_HEIGHT / 2;
    const lengths: number[] = [0]; // first heading is at 0
    for (let i = 1; i < headings.length; i++) {
      const targetY = getY(i);
      // Binary search for the length at this point
      let lo = lengths[i - 1],
        hi = total;
      for (let iter = 0; iter < 30; iter++) {
        const mid = (lo + hi) / 2;
        const pt = el.getPointAtLength(mid);
        if (pt.y < targetY - 0.5) lo = mid;
        else hi = mid;
      }
      lengths.push((lo + hi) / 2);
    }
    setSegmentLengths(lengths);
  }, [fullPath, headings]);

  if (!fullPath || headings.length < 2) return null;

  const totalHeight = headings.length * STEP;
  const maxX = Math.max(...headings.map((h) => (h.level - 1) * 12 + 6)) + 10;

  // How much of the path to reveal
  const activeLength = segmentLengths[activeHeadingIndex] ?? 0;
  const dashOffset = totalLength - activeLength;

  return (
    <svg
      className="absolute left-1 top-0 pointer-events-none"
      width={maxX}
      height={totalHeight}
      fill="none"
    >
      {/* Background path (dim) */}
      <path
        ref={fullPathRef}
        d={fullPath}
        stroke="var(--sidebar-primary-12)"
        strokeWidth={PATH_STROKE}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Active path — reveals up to active heading */}
      {totalLength > 0 && (
        <motion.path
          d={fullPath}
          stroke="var(--sidebar-primary-50)"
          strokeWidth={PATH_STROKE + 0.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLength}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      )}
      {/* Dots at each heading */}
      {headings.map((h, i) => {
        const cx = (h.level - 1) * 12 + 6;
        const cy = i * STEP + ITEM_HEIGHT / 2;
        const isActive = i === activeHeadingIndex;
        const isInPath = i <= activeHeadingIndex;
        return (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={isActive ? 3 : 2.5}
            fill={
              isInPath
                ? 'var(--sidebar-primary-60)'
                : 'var(--sidebar-primary-20)'
            }
            animate={{
              r: isActive ? 3 : 2.5,
              fill: isInPath
                ? 'var(--sidebar-primary-60)'
                : 'var(--sidebar-primary-20)',
            }}
            transition={{ duration: 0.3 }}
          />
        );
      })}
    </svg>
  );
};

const RightSidebar = ({
  content,
  onClose,
  onHeadingClick,
  activeHeadingIndex = 0,
}: RightSidebarProps) => {
  const headings = extractHeadings(content);
  const scrollContainerRef = useRef<HTMLDivElement>(null!);

  return (
    <div className="flex w-52 flex-col border-l border-sidebar-border bg-sidebar">
      {/* Utility icons */}
      <div className="flex items-center gap-1 border-b border-sidebar-border px-3 py-2">
        <button className="flex size-7 items-center justify-center rounded text-sidebar-foreground bg-sidebar-accent">
          <List size={14} />
        </button>
        <button className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Tags size={14} />
        </button>
        <button className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Info size={14} />
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          title="Close sidebar"
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <X size={14} />
        </button>
      </div>

      {/* Outline */}
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Outline
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 pb-2"
      >
        {headings.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground/60">
            No headings found
          </p>
        ) : (
          <div className="relative">
            <OutlineSVG
              headings={headings}
              scrollContainerRef={scrollContainerRef}
              activeHeadingIndex={activeHeadingIndex}
            />
            <div
              className="relative flex flex-col"
              style={{ gap: `${ITEM_GAP}px` }}
            >
              {headings.map((h, i) => {
                const isActive = i === activeHeadingIndex;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center rounded-sm px-2 py-1 text-xs transition-colors duration-200 cursor-pointer',
                      isActive
                        ? 'text-sidebar-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                    style={{
                      paddingLeft: `${(h.level - 1) * 12 + 22}px`,
                      height: `${ITEM_HEIGHT}px`,
                    }}
                    onClick={() => {
                      const el = document.getElementById(
                        `heading-${h.lineIndex}`
                      );
                      if (el)
                        el.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      onHeadingClick?.(h.lineIndex);
                    }}
                  >
                    <span
                      className={cn(
                        'truncate',
                        h.level === 1 && 'font-semibold',
                        h.level === 2 && 'font-medium'
                      )}
                    >
                      {h.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
