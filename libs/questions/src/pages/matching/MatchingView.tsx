import {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cn, Input } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

// ─── Local types ──────────────────────────────────────────────────────────────

type LeftItem = {
  id: string;
  text: string;
  imageUrl: string;
  multipleAnswers: boolean;
  linkedRightIds: string[];
  markPercent: number;
};

type RightItem = {
  id: string;
  text: string;
  imageUrl: string;
};

type MatchingViewProps = {
  question: QuestionRow;
};

// ─── SVG color tokens ─────────────────────────────────────────────────────────
// These read from the Tailwind CSS custom properties at runtime so they stay
// in sync with the active theme (light / dark).

const SVG_COLOR_PRIMARY = 'hsl(var(--primary))';
// Green-500 used as success indicator — matches Tailwind green-500 (#22c55e)
const SVG_COLOR_SUCCESS = '#22c55e';
// Destructive token maps to the error / wrong state
const SVG_COLOR_ERROR = 'hsl(var(--destructive))';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MatchingView = ({ question }: MatchingViewProps) => {
  const { t } = useTranslation('questions');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rightRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Access matching-specific data from the question row
  const leftItems: LeftItem[] = useMemo(
    () => (question as any).matchingLeftItems ?? [],
    [(question as any).matchingLeftItems],
  );
  const rightItems: RightItem[] = useMemo(
    () => (question as any).matchingRightItems ?? [],
    [(question as any).matchingRightItems],
  );
  const leftMode: 'text' | 'image' =
    (question as any).matchingLeftMode ?? 'text';
  const rightMode: 'text' | 'image' =
    (question as any).matchingRightMode ?? 'text';
  const justification: string =
    (question as any).matchingJustification ?? 'disabled';

  // Shuffle right items on mount
  const [shuffledRightItems] = useState<RightItem[]>(() =>
    shuffleArray(rightItems),
  );

  // Connections: leftId -> rightId[]
  const [connections, setConnections] = useState<Map<string, string[]>>(
    () => new Map(),
  );
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  // Hover state for SVG × button (Bug 1)
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Check answer state (Bug 2)
  const [checked, setChecked] = useState(false);

  // Show Solution state
  const [showSolution, setShowSolution] = useState(false);

  // Force re-render for SVG line positions
  const [, setLineVersion] = useState(0);
  const redrawLines = useCallback(() => setLineVersion((v) => v + 1), []);

  // Redraw lines on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      redrawLines();
    });
    observer.observe(container);

    window.addEventListener('resize', redrawLines);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', redrawLines);
    };
  }, [redrawLines]);

  // Also redraw when connections change
  useEffect(() => {
    redrawLines();
  }, [connections, redrawLines]);

  // ── Scoring helpers (Bug 2) ─────────────────────────────────────────────────

  const getLeftItemResult = useCallback(
    (leftId: string): 'correct' | 'wrong' | 'unanswered' => {
      const leftItem = leftItems.find((l) => l.id === leftId);
      if (!leftItem) return 'unanswered';
      const userConns = connections.get(leftId) ?? [];
      if (userConns.length === 0) return 'unanswered';
      const correctSet = new Set(leftItem.linkedRightIds);
      const userSet = new Set(userConns);
      if (correctSet.size !== userSet.size) return 'wrong';
      for (const id of correctSet) {
        if (!userSet.has(id)) return 'wrong';
      }
      return 'correct';
    },
    [leftItems, connections],
  );

  const getRightItemResult = useCallback(
    (rightId: string): 'correct' | 'wrong' | 'neutral' => {
      // A right item is correct if every left item that links to it is correct
      // A right item is wrong if any left item that links to it is wrong
      let involved = false;
      let allCorrect = true;
      for (const [leftId, rightIds] of connections.entries()) {
        if (rightIds.includes(rightId)) {
          involved = true;
          if (getLeftItemResult(leftId) !== 'correct') {
            allCorrect = false;
          }
        }
      }
      if (!involved) return 'neutral';
      return allCorrect ? 'correct' : 'wrong';
    },
    [connections, getLeftItemResult],
  );

  const getLineResult = useCallback(
    (leftId: string, rightId: string): 'correct' | 'wrong' => {
      const leftItem = leftItems.find((l) => l.id === leftId);
      if (!leftItem) return 'wrong';
      return leftItem.linkedRightIds.includes(rightId) ? 'correct' : 'wrong';
    },
    [leftItems],
  );

  // All left items must have at least one connection to enable "Check Answer"
  const allLeftConnected = useMemo(() => {
    return leftItems.every((item) => {
      const conns = connections.get(item.id);
      return conns !== undefined && conns.length > 0;
    });
  }, [leftItems, connections]);

  // True when checked and at least one answer is wrong (drives "Show Solution" button visibility)
  const hasWrongAnswer = useMemo(() => {
    if (!checked) return false;
    return leftItems.some((item) => getLeftItemResult(item.id) !== 'correct');
  }, [checked, leftItems, getLeftItemResult]);

  // Correct connections built from the question's linked right IDs
  const correctConnections = useMemo(() => {
    const map = new Map<string, string[]>();
    leftItems.forEach((item) => {
      if (item.linkedRightIds.length > 0) {
        map.set(item.id, item.linkedRightIds);
      }
    });
    return map;
  }, [leftItems]);

  // When showing solution, display correct connections instead of student's
  const displayConnections = useMemo(
    () => (showSolution ? correctConnections : connections),
    [showSolution, correctConnections, connections],
  );

  // ── Interaction handlers ──────────────────────────────────────────────────

  const handleLeftClick = useCallback(
    (leftId: string) => {
      if (checked) return;
      setSelectedLeftId((prev) => (prev === leftId ? null : leftId));
    },
    [checked],
  );

  const handleRightClick = useCallback(
    (rightId: string) => {
      if (checked) return;
      if (selectedLeftId === null) return;

      setConnections((prev) => {
        const next = new Map(prev);
        const existing = next.get(selectedLeftId) ?? [];
        const leftItem = leftItems.find((l) => l.id === selectedLeftId);

        // If already connected, remove connection (toggle off)
        if (existing.includes(rightId)) {
          next.set(
            selectedLeftId,
            existing.filter((id) => id !== rightId),
          );
          setSelectedLeftId(null);
          return next;
        }

        // If single answer mode and already has a connection, replace
        if (!leftItem?.multipleAnswers && existing.length > 0) {
          next.set(selectedLeftId, [rightId]);
        } else {
          next.set(selectedLeftId, [...existing, rightId]);
        }

        setSelectedLeftId(null);
        return next;
      });
    },
    [checked, selectedLeftId, leftItems],
  );

  const handleRemoveConnection = useCallback(
    (leftId: string, rightId: string) => {
      if (checked) return;
      setConnections((prev) => {
        const next = new Map(prev);
        const existing = next.get(leftId) ?? [];
        next.set(
          leftId,
          existing.filter((id) => id !== rightId),
        );
        return next;
      });
    },
    [checked],
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (checked) return;
      if (e.target === e.currentTarget) {
        setSelectedLeftId(null);
      }
    },
    [checked],
  );

  const handleCheckAnswer = useCallback(() => {
    setChecked(true);
    setSelectedLeftId(null);
  }, []);

  const handleTryAgain = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setConnections(new Map());
    setSelectedLeftId(null);
    setHoveredLine(null);
  }, []);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  // ── Helpers for checking connected state ──────────────────────────────────

  const isLeftConnected = useCallback(
    (leftId: string) => {
      const conns = connections.get(leftId);
      return conns !== undefined && conns.length > 0;
    },
    [connections],
  );

  const isRightConnected = useCallback(
    (rightId: string) => {
      for (const conns of connections.values()) {
        if (conns.includes(rightId)) return true;
      }
      return false;
    },
    [connections],
  );

  // ── Compute SVG lines ─────────────────────────────────────────────────────

  const lines = useMemo(() => {
    const container = containerRef.current;
    if (!container) return [];

    const containerRect = container.getBoundingClientRect();
    const result: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      leftId: string;
      rightId: string;
    }> = [];

    displayConnections.forEach((rightIds, leftId) => {
      const leftEl = leftRefs.current.get(leftId);
      if (!leftEl) return;
      const leftRect = leftEl.getBoundingClientRect();

      rightIds.forEach((rightId) => {
        const rightEl = rightRefs.current.get(rightId);
        if (!rightEl) return;
        const rightRect = rightEl.getBoundingClientRect();

        result.push({
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          leftId,
          rightId,
        });
      });
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayConnections, leftItems, shuffledRightItems]);

  // ── Render item ───────────────────────────────────────────────────────────

  const renderLeftItem = useCallback(
    (item: LeftItem) => {
      const isSelected = selectedLeftId === item.id;
      const isConn = isLeftConnected(item.id);

      // Check answer result styling; solution mode forces all correct
      const result = showSolution ? 'correct' : (checked ? getLeftItemResult(item.id) : null);
      const isCorrect = result === 'correct';
      const isWrong = result === 'wrong' || result === 'unanswered';

      if (leftMode === 'image' && item.imageUrl) {
        return (
          <div
            key={item.id}
            ref={(el: HTMLDivElement | null) => { leftRefs.current.set(item.id, el); }}
            onClick={() => handleLeftClick(item.id)}
            className={cn(
              'w-[120px] h-[90px] border border-border rounded-lg overflow-hidden flex items-center justify-center transition-all',
              checked ? 'cursor-default' : 'cursor-pointer',
              !checked && isSelected && 'outline outline-2 outline-primary scale-[1.02]',
              !checked && isConn && 'bg-primary/10',
              isCorrect && 'outline outline-2 outline-green-500 bg-green-500/10 dark:bg-green-500/20',
              isWrong && 'outline outline-2 outline-destructive bg-destructive/10 dark:bg-destructive/20',
            )}
          >
            <img
              src={item.imageUrl}
              alt={item.text || item.id}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        );
      }

      return (
        <div
          key={item.id}
          ref={(el: HTMLDivElement | null) => { leftRefs.current.set(item.id, el); }}
          onClick={() => handleLeftClick(item.id)}
          className={cn(
            'flex items-center justify-center px-4 py-2 min-h-[48px] rounded-lg border border-border bg-card shadow-sm transition-all',
            checked ? 'cursor-default' : 'cursor-pointer',
            !checked && isSelected && 'outline outline-2 outline-primary scale-[1.02]',
            !checked && isConn && 'bg-primary/10',
            isCorrect && 'outline outline-2 outline-green-500 bg-green-500/10 dark:bg-green-500/20',
            isWrong && 'outline outline-2 outline-destructive bg-destructive/10 dark:bg-destructive/20',
          )}
        >
          <p className="text-sm text-foreground text-center">{item.text}</p>
        </div>
      );
    },
    [selectedLeftId, isLeftConnected, leftMode, handleLeftClick, checked, getLeftItemResult, showSolution],
  );

  const renderRightItem = useCallback(
    (item: RightItem) => {
      const isConn = isRightConnected(item.id);

      // Issue 3: Show dashed border when a left item is selected (invitation to click)
      const isInvited = !checked && selectedLeftId !== null && !isConn;

      // Check answer result styling; solution mode forces all correct
      const result = showSolution ? 'correct' : (checked ? getRightItemResult(item.id) : null);
      const isCorrect = result === 'correct';
      const isWrong = result === 'wrong';

      if (rightMode === 'image' && item.imageUrl) {
        return (
          <div
            key={item.id}
            ref={(el: HTMLDivElement | null) => { rightRefs.current.set(item.id, el); }}
            onClick={() => handleRightClick(item.id)}
            className={cn(
              'w-[120px] h-[90px] border border-border rounded-lg overflow-hidden flex items-center justify-center transition-all',
              checked ? 'cursor-default' : 'cursor-pointer',
              !checked && isConn && 'bg-primary/10',
              isInvited && 'outline outline-2 outline-dashed outline-primary',
              isCorrect && 'outline outline-2 outline-green-500 bg-green-500/10 dark:bg-green-500/20',
              isWrong && 'outline outline-2 outline-destructive bg-destructive/10 dark:bg-destructive/20',
            )}
          >
            <img
              src={item.imageUrl}
              alt={item.text || item.id}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        );
      }

      return (
        <div
          key={item.id}
          ref={(el: HTMLDivElement | null) => { rightRefs.current.set(item.id, el); }}
          onClick={() => handleRightClick(item.id)}
          className={cn(
            'flex items-center justify-center px-4 py-2 min-h-[48px] rounded-lg border border-border bg-card shadow-sm transition-all',
            checked ? 'cursor-default' : 'cursor-pointer',
            !checked && isConn && 'bg-primary/10',
            isInvited && 'outline outline-2 outline-dashed outline-primary',
            isCorrect && 'outline outline-2 outline-green-500 bg-green-500/10 dark:bg-green-500/20',
            isWrong && 'outline outline-2 outline-destructive bg-destructive/10 dark:bg-destructive/20',
          )}
        >
          <p className="text-sm text-foreground text-center">{item.text}</p>
        </div>
      );
    },
    [isRightConnected, rightMode, handleRightClick, checked, selectedLeftId, getRightItemResult, showSolution],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Question text */}
      {question.question_text && (
        <div
          className="text-sm text-foreground"
          dangerouslySetInnerHTML={{ __html: question.question_text }}
        />
      )}

      {/* Matching area */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative flex gap-4 min-h-[200px]"
      >
        {/* Left column */}
        <div className="flex-[2] min-w-0 flex flex-col gap-3 items-stretch">
          {leftItems.map((item) => renderLeftItem(item))}
        </div>

        {/* Spacer for SVG lines */}
        <div className="flex-1 min-w-0" />

        {/* Right column */}
        <div className="flex-[2] min-w-0 flex flex-col gap-3 items-stretch">
          {shuffledRightItems.map((item) => renderRightItem(item))}
        </div>

        {/* SVG overlay for connection lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {lines.map((line) => {
            const lineKey = `${line.leftId}-${line.rightId}`;
            const midX = (line.x1 + line.x2) / 2;
            const midY = (line.y1 + line.y2) / 2;
            const isHovered = hoveredLine === lineKey;

            // After check: color lines green/red; solution mode = all green
            const lineColor = showSolution
              ? SVG_COLOR_SUCCESS
              : checked
              ? getLineResult(line.leftId, line.rightId) === 'correct'
                ? SVG_COLOR_SUCCESS
                : SVG_COLOR_ERROR
              : SVG_COLOR_PRIMARY;

            return (
              <g key={lineKey}>
                {/* Visible line */}
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={lineColor}
                  strokeWidth={2}
                  opacity={0.7}
                />
                {/* Wide invisible hit-area line for hover detection (Bug 1) */}
                {!checked && (
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="transparent"
                    strokeWidth={20}
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredLine(lineKey)}
                    onMouseLeave={() => setHoveredLine(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(line.leftId, line.rightId);
                    }}
                  />
                )}
                {/* Remove button at midpoint — only on hover, hidden when checked */}
                {!checked && isHovered && (
                  <g
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredLine(lineKey)}
                    onMouseLeave={() => setHoveredLine(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(line.leftId, line.rightId);
                    }}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r={10}
                      fill={SVG_COLOR_ERROR}
                      opacity={0.85}
                    />
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={700}
                      style={{ pointerEvents: 'none' }}
                    >
                      ×
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Check Answer / Try Again / Show Solution buttons */}
      <div className="flex gap-3">
        {!checked ? (
          <button
            type="button"
            disabled={!allLeftConnected}
            onClick={handleCheckAnswer}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('editor.matching.check_answer')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleTryAgain}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t('editor.matching.try_again')}
            </button>
            {hasWrongAnswer && !showSolution && (
              <button
                type="button"
                onClick={handleShowSolution}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('editor.matching.show_solution')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Justification field */}
      {justification !== 'disabled' && (
        <div>
          <p className="text-sm font-medium text-foreground mb-1">
            {t('matching.justification_label')}
            {justification === 'required' ? ' *' : ''}
          </p>
          <Input
            value={justificationText}
            onChange={(e) => setJustificationText(e.target.value)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default memo(MatchingView);
