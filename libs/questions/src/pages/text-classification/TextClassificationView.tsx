import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { QuestionRow } from '../../components/QuestionsTable';

const COLOR_MAP: Record<string, string> = {
  'blue':        '#1565c0',
  'orange':      '#e65100',
  'green':       '#2e7d32',
  'red':         '#c62828',
  'purple':      '#6a1b9a',
  'pink':        '#ad1457',
  'dark-orange': '#bf360c',
  'cyan':        '#00838f',
};

type CategoryData = {
  id: string;
  name: string;
  color: string;
  answers: Array<{
    id: string;
    text: string;
    feedback?: string;
    markPercent: number;
  }>;
};

type TextClassificationViewProps = {
  question: QuestionRow;
};

const PoolContainer = styled(Box)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.3)
      : alpha(theme.palette.action.hover, 0.4),
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  minHeight: 60,
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'colorHex' && prop !== 'isDragOver',
})<{ colorHex: string; isDragOver: boolean }>(({ theme, colorHex, isDragOver }) => ({
  flex: 1,
  minWidth: 180,
  minHeight: 120,
  border: `2px ${isDragOver ? 'solid' : 'dashed'} ${isDragOver ? colorHex : alpha(colorHex, 0.4)}`,
  borderRadius: theme.spacing(1.5),
  backgroundColor: isDragOver
    ? alpha(colorHex, 0.08)
    : theme.palette.background.paper,
  padding: theme.spacing(1.5),
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.75),
  alignContent: 'flex-start',
  transition: 'all 0.2s ease',
}));

const CategoryHeaderBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'colorHex',
})<{ colorHex: string }>(({ theme, colorHex }) => ({
  backgroundColor: alpha(colorHex, 0.12),
  color: colorHex,
  padding: theme.spacing(1, 2),
  borderRadius: `${theme.spacing(1.5)} ${theme.spacing(1.5)} 0 0`,
  fontWeight: 600,
  fontSize: '0.875rem',
}));

const TextClassificationView = ({ question }: TextClassificationViewProps) => {
  const { t } = useTranslation('questions');

  const categories: CategoryData[] = question.textClassificationCategories ?? [];
  const layout = question.textClassificationLayout ?? 'columns';
  const justification = question.textClassificationJustification ?? 'disabled';

  // Collect all answers from all categories
  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.answers.map((ans) => ({
        ...ans,
        correctCategoryId: cat.id,
      }))
    );
  }, [categories]);

  // State: which items are in which zone (categoryId -> answerId[])
  const [placements, setPlacements] = useState<Record<string, string[]>>({});
  const [justificationText, setJustificationText] = useState('');
  const [checked, setChecked] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // Items currently in the pool (not placed in any category)
  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(placements).forEach((arr) => arr.forEach((id) => ids.add(id)));
    return ids;
  }, [placements]);

  const poolItems = useMemo(
    () => allItems.filter((item) => !placedIds.has(item.id)),
    [allItems, placedIds],
  );

  const hasPlacedItems = placedIds.size > 0;

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, answerId: string) => {
      e.dataTransfer.setData('text/plain', answerId);
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnCategory = useCallback(
    (e: React.DragEvent, categoryId: string) => {
      e.preventDefault();
      const answerId = e.dataTransfer.getData('text/plain');
      if (!answerId) return;

      setPlacements((prev) => {
        const next = { ...prev };
        // Remove from any existing category
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((id) => id !== answerId);
        }
        // Add to target category
        next[categoryId] = [...(next[categoryId] ?? []), answerId];
        return next;
      });
      setDragOverZone(null);
    },
    [],
  );

  const handleDropOnPool = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const answerId = e.dataTransfer.getData('text/plain');
      if (!answerId) return;

      setPlacements((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((id) => id !== answerId);
        }
        return next;
      });
      setDragOverZone(null);
    },
    [],
  );

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setPlacements({});
    setChecked(false);
  }, []);

  // Compute score
  const score = useMemo(() => {
    if (!checked) return 0;
    let correct = 0;
    const total = allItems.length;
    categories.forEach((cat) => {
      const placed = placements[cat.id] ?? [];
      const correctIds = new Set(cat.answers.map((a) => a.id));
      placed.forEach((id) => {
        if (correctIds.has(id)) correct++;
      });
    });
    return total > 0 ? Math.round((correct / total) * question.mark) : 0;
  }, [checked, categories, placements, allItems.length, question.mark]);

  const getAnswerById = useCallback(
    (id: string) => allItems.find((item) => item.id === id),
    [allItems],
  );

  const isCorrectPlacement = useCallback(
    (answerId: string, categoryId: string) => {
      const item = allItems.find((i) => i.id === answerId);
      return item?.correctCategoryId === categoryId;
    },
    [allItems],
  );

  return (
    <Box className="flex flex-col gap-4">
      {/* Item pool */}
      <PoolContainer
        onDragOver={handleDragOver}
        onDrop={handleDropOnPool}
      >
        {poolItems.length > 0 ? (
          poolItems.map((item) => (
            <Chip
              key={item.id}
              label={item.text}
              draggable={!checked}
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, item.id)}
              sx={{
                cursor: checked ? 'default' : 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.disabled" className="self-center w-full text-center">
            {allItems.length === 0 ? 'No items' : 'All items placed'}
          </Typography>
        )}
      </PoolContainer>

      {/* Category drop zones */}
      <Box
        className="flex gap-3"
        sx={{
          flexDirection: layout === 'columns' ? 'row' : 'column',
          flexWrap: layout === 'columns' ? 'wrap' : 'nowrap',
        }}
      >
        {categories.map((cat) => {
          const colorHex = COLOR_MAP[cat.color] ?? COLOR_MAP.blue;
          const placedAnswerIds = placements[cat.id] ?? [];

          return (
            <Box key={cat.id} sx={{ flex: 1, minWidth: 180 }}>
              <CategoryHeaderBox colorHex={colorHex}>
                {cat.name}
              </CategoryHeaderBox>
              <DropZone
                colorHex={colorHex}
                isDragOver={dragOverZone === cat.id}
                onDragOver={(e) => {
                  handleDragOver(e);
                  setDragOverZone(cat.id);
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => handleDropOnCategory(e, cat.id)}
                sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                {placedAnswerIds.map((answerId) => {
                  const answer = getAnswerById(answerId);
                  if (!answer) return null;
                  const isCorrect = checked ? isCorrectPlacement(answerId, cat.id) : undefined;
                  return (
                    <Chip
                      key={answerId}
                      label={answer.text}
                      draggable={!checked}
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, answerId)}
                      color={
                        isCorrect === true ? 'success' :
                        isCorrect === false ? 'error' :
                        'default'
                      }
                      variant={checked ? 'filled' : 'outlined'}
                      sx={{
                        cursor: checked ? 'default' : 'grab',
                        '&:active': { cursor: 'grabbing' },
                      }}
                    />
                  );
                })}
                {placedAnswerIds.length === 0 && (
                  <Typography variant="caption" color="text.disabled" className="self-center w-full text-center py-4">
                    Drop items here
                  </Typography>
                )}
              </DropZone>
            </Box>
          );
        })}
      </Box>

      {/* Justification field */}
      {justification !== 'disabled' && (
        <Box>
          <Typography variant="body2" fontWeight={500} className="mb-1">
            Justify your answer{justification === 'required' ? ' *' : ''}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            value={justificationText}
            onChange={(e) => setJustificationText(e.target.value)}
            disabled={checked}
            size="small"
          />
        </Box>
      )}

      {/* Check/Retry + Mark */}
      <Box className="flex items-center justify-between">
        <Box className="flex gap-2">
          {!checked ? (
            <Button
              variant="contained"
              onClick={handleCheck}
              disabled={!hasPlacedItems}
            >
              {t('check')}
            </Button>
          ) : (
            <Button variant="outlined" onClick={handleRetry}>
              {t('retry')}
            </Button>
          )}
        </Box>
        <Chip
          label={checked ? `${score} / ${question.mark}` : `${question.mark}`}
          color={checked ? (score === question.mark ? 'success' : score > 0 ? 'warning' : 'error') : 'default'}
          variant="outlined"
        />
      </Box>
    </Box>
  );
};

export default TextClassificationView;
