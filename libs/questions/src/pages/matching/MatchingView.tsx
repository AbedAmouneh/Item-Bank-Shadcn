import {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
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

// ─── Styled ───────────────────────────────────────────────────────────────────

const ItemChip = styled(Paper, {
  shouldForwardProp: (p) =>
    p !== 'isSelected' &&
    p !== 'isConnected' &&
    p !== 'isInvited' &&
    p !== 'isCorrect' &&
    p !== 'isWrong',
})<{
  isSelected?: boolean;
  isConnected?: boolean;
  isInvited?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
}>(({ theme, isSelected, isConnected, isInvited, isCorrect, isWrong }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1, 2),
  minHeight: 48,
  cursor: 'pointer',
  transition: theme.transitions.create([
    'outline',
    'transform',
    'background-color',
    'border',
  ]),
  ...(isSelected && {
    outline: `2px solid ${theme.palette.primary.main}`,
    transform: 'scale(1.02)',
  }),
  ...(isConnected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
  }),
  ...(isInvited && {
    outline: `2px dashed ${theme.palette.primary.main}`,
  }),
  ...(isCorrect && {
    outline: `2px solid ${theme.palette.success.main}`,
    backgroundColor: alpha(theme.palette.success.main, 0.08),
  }),
  ...(isWrong && {
    outline: `2px solid ${theme.palette.error.main}`,
    backgroundColor: alpha(theme.palette.error.main, 0.08),
  }),
}));

const ImageCard = styled(Box, {
  shouldForwardProp: (p) =>
    p !== 'isSelected' &&
    p !== 'isConnected' &&
    p !== 'isInvited' &&
    p !== 'isCorrect' &&
    p !== 'isWrong',
})<{
  isSelected?: boolean;
  isConnected?: boolean;
  isInvited?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
}>(({ theme, isSelected, isConnected, isInvited, isCorrect, isWrong }) => ({
  width: 120,
  height: 90,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: theme.transitions.create([
    'outline',
    'transform',
    'background-color',
    'border',
  ]),
  ...(isSelected && {
    outline: `2px solid ${theme.palette.primary.main}`,
    transform: 'scale(1.02)',
  }),
  ...(isConnected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
  }),
  ...(isInvited && {
    outline: `2px dashed ${theme.palette.primary.main}`,
  }),
  ...(isCorrect && {
    outline: `2px solid ${theme.palette.success.main}`,
    backgroundColor: alpha(theme.palette.success.main, 0.08),
  }),
  ...(isWrong && {
    outline: `2px solid ${theme.palette.error.main}`,
    backgroundColor: alpha(theme.palette.error.main, 0.08),
  }),
}));

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
  const theme = useTheme();
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
          <ImageCard
            key={item.id}
            ref={(el: HTMLDivElement | null) => { leftRefs.current.set(item.id, el); }}
            isSelected={!checked && isSelected}
            isConnected={!checked && isConn}
            isCorrect={isCorrect}
            isWrong={isWrong}
            onClick={() => handleLeftClick(item.id)}
            sx={checked ? { cursor: 'default' } : undefined}
          >
            <img
              src={item.imageUrl}
              alt={item.text || item.id}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              draggable={false}
            />
          </ImageCard>
        );
      }

      return (
        <ItemChip
          key={item.id}
          ref={(el: HTMLDivElement | null) => { leftRefs.current.set(item.id, el); }}
          elevation={1}
          isSelected={!checked && isSelected}
          isConnected={!checked && isConn}
          isCorrect={isCorrect}
          isWrong={isWrong}
          onClick={() => handleLeftClick(item.id)}
          sx={checked ? { cursor: 'default' } : undefined}
        >
          <Typography variant="body2" textAlign="center">
            {item.text}
          </Typography>
        </ItemChip>
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
          <ImageCard
            key={item.id}
            ref={(el: HTMLDivElement | null) => { rightRefs.current.set(item.id, el); }}
            isConnected={!checked && isConn}
            isInvited={isInvited}
            isCorrect={isCorrect}
            isWrong={isWrong}
            onClick={() => handleRightClick(item.id)}
            sx={checked ? { cursor: 'default' } : undefined}
          >
            <img
              src={item.imageUrl}
              alt={item.text || item.id}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              draggable={false}
            />
          </ImageCard>
        );
      }

      return (
        <ItemChip
          key={item.id}
          ref={(el: HTMLDivElement | null) => { rightRefs.current.set(item.id, el); }}
          elevation={1}
          isConnected={!checked && isConn}
          isInvited={isInvited}
          isCorrect={isCorrect}
          isWrong={isWrong}
          onClick={() => handleRightClick(item.id)}
          sx={checked ? { cursor: 'default' } : undefined}
        >
          <Typography variant="body2" textAlign="center">
            {item.text}
          </Typography>
        </ItemChip>
      );
    },
    [isRightConnected, rightMode, handleRightClick, checked, selectedLeftId, getRightItemResult, showSolution],
  );

  return (
    <Box className="flex flex-col gap-4">
      {/* Question text */}
      {question.question_text && (
        <Typography
          variant="body1"
          component="div"
          dangerouslySetInnerHTML={{ __html: question.question_text }}
        />
      )}

      {/* Matching area */}
      <Box
        ref={containerRef}
        onClick={handleContainerClick}
        sx={{ position: 'relative', display: 'flex', gap: 2, minHeight: 200 }}
      >
        {/* Left column */}
        <Box
          sx={{
            flex: 2,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {leftItems.map((item) => renderLeftItem(item))}
        </Box>

        {/* Spacer for SVG lines */}
        <Box sx={{ flex: 1, minWidth: 0 }} />

        {/* Right column */}
        <Box
          sx={{
            flex: 2,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {shuffledRightItems.map((item) => renderRightItem(item))}
        </Box>

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
              ? theme.palette.success.main
              : checked
              ? getLineResult(line.leftId, line.rightId) === 'correct'
                ? theme.palette.success.main
                : theme.palette.error.main
              : theme.palette.primary.main;

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
                      fill={theme.palette.error.main}
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
      </Box>

      {/* Check Answer / Try Again / Show Solution buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {!checked ? (
          <Button
            variant="contained"
            disabled={!allLeftConnected}
            onClick={handleCheckAnswer}
          >
            {t('editor.matching.check_answer')}
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={handleTryAgain}>
              {t('editor.matching.try_again')}
            </Button>
            {hasWrongAnswer && !showSolution && (
              <Button variant="contained" onClick={handleShowSolution}>
                {t('editor.matching.show_solution')}
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Justification field */}
      {justification !== 'disabled' && (
        <Box>
          <Typography variant="body2" fontWeight={500} className="mb-1">
            {t('matching.justification_label', {
              defaultValue: 'Justify your answer',
            })}
            {justification === 'required' ? ' *' : ''}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            value={justificationText}
            onChange={(e) => setJustificationText(e.target.value)}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};

export default memo(MatchingView);
