import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CircleIcon from '@mui/icons-material/Circle';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

const KEY_REGEX_SOURCE = '\\[\\[([^\\]]+)\\]\\]';

function unwrapBracketToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const wrapped = trimmed.match(/^\[\[([\s\S]+)\]\]$/);
  return (wrapped?.[1] ?? trimmed).trim();
}

function isBogusEditorNode(node: Element | null): boolean {
  if (!node) return false;
  if (node.getAttribute('data-mce-bogus') === '1') return true;
  return node.closest('[data-mce-bogus="1"]') !== null;
}

function getKeyFromWrapper(wrapper: Element): string {
  const keyNode = wrapper.querySelector('.fill-in-blank-key');
  const candidates = [
    keyNode?.textContent ?? '',
    keyNode?.getAttribute('data-key') ?? '',
    wrapper.querySelector('.key-action-btn[data-key]')?.getAttribute('data-key') ?? '',
  ];

  for (const candidate of candidates) {
    const key = unwrapBracketToken(candidate);
    if (key) return key;
  }
  return '';
}

export const DRAG_DROP_GROUP_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'error',
  'info',
] as const;

type GroupColor = (typeof DRAG_DROP_GROUP_COLORS)[number];

type DragDropItem = {
  id: string;
  key: string;
  answer: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
};

type DragDropGroup = {
  id: string;
  name: string;
  color: string;
};

export function parseKeysFromText(html: string): string[] {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html ?? '', 'text/html');

    doc.querySelectorAll('.key-actions, .key-action-btn, .edit-icon, .delete-icon').forEach((node) => {
      node.remove();
    });

    doc.querySelectorAll('.key-wrapper').forEach((wrapper) => {
      if (isBogusEditorNode(wrapper)) {
        wrapper.remove();
        return;
      }
      const key = getKeyFromWrapper(wrapper);
      if (!key) {
        wrapper.remove();
        return;
      }
      wrapper.replaceWith(doc.createTextNode(`[[${key}]]`));
    });

    doc.querySelectorAll('.fill-in-blank-key').forEach((node) => {
      if (isBogusEditorNode(node)) {
        node.remove();
        return;
      }
      const key = unwrapBracketToken(
        (node.textContent ?? '').trim() || node.getAttribute('data-key') || ''
      );
      if (!key) {
        node.remove();
        return;
      }
      node.replaceWith(doc.createTextNode(`[[${key}]]`));
    });

    const text = doc.body.textContent ?? '';
    const keys: string[] = [];
    const regex = new RegExp(KEY_REGEX_SOURCE, 'g');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const key = m[1].trim();
      if (key) keys.push(key);
    }
    return keys;
  }

  const keys: string[] = [];
  const regex = new RegExp(KEY_REGEX_SOURCE, 'g');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const key = m[1].trim();
    if (key) keys.push(key);
  }
  return keys;
}

function toUniqueKeysCaseInsensitive(keys: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(key);
  }
  return unique;
}

function getDuplicateKeysCaseInsensitive(keys: string[]): string[] {
  const counts = new Map<string, { displayKey: string; count: number }>();
  for (const key of keys) {
    const normalized = key.toLowerCase();
    const existing = counts.get(normalized);
    if (existing) {
      counts.set(normalized, { ...existing, count: existing.count + 1 });
    } else {
      counts.set(normalized, { displayKey: key, count: 1 });
    }
  }
  return [...counts.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => entry.displayKey);
}

function distributeMarks(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor((100 / count) * 100) / 100;
  const remainder = Math.round((100 - base * (count - 1)) * 100) / 100;
  return [...Array(count - 1).fill(base), remainder];
}

const RowCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.6)
      : alpha(theme.palette.primary.main, 0.03),
  borderRadius: theme.spacing(1.5),
}));

const GroupChip = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: theme.spacing(3),
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.5)
      : alpha(theme.palette.primary.main, 0.04),
}));

type DragDropTextEditorProps = {
  questionText?: string;
  onAddKey: (key: string) => void;
  onRenameKey: (oldKey: string, newKey: string) => void;
  onDeleteKey: (key: string) => void;
};

function DragDropTextEditor({ questionText, onAddKey, onRenameKey, onDeleteKey }: DragDropTextEditorProps) {
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();
  const { watch, setValue, register, unregister, getValues } = useFormContext();

  const watchedItems = watch('dragDropItems');
  const items: DragDropItem[] = useMemo(() => watchedItems ?? [], [watchedItems]);

  const watchedGroups = watch('dragDropGroups');
  const groups: DragDropGroup[] = useMemo(() => watchedGroups ?? [], [watchedGroups]);

  const autoDistribute: boolean = watch('autoDistributeMarks') ?? true;

  const lastSyncedSignatureRef = useRef<string | null>(null);

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [newItemKey, setNewItemKey] = useState('');
  const [newItemKeyError, setNewItemKeyError] = useState('');

  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>('primary');
  const [keyDraftByItemId, setKeyDraftByItemId] = useState<Record<string, string>>({});
  const [keyErrorByItemId, setKeyErrorByItemId] = useState<Record<string, string>>({});

  const parsedKeys = useMemo(
    () => parseKeysFromText(questionText ?? ''),
    [questionText]
  );
  const uniqueParsedKeys = useMemo(
    () => toUniqueKeysCaseInsensitive(parsedKeys),
    [parsedKeys]
  );
  const duplicateParsedKeys = useMemo(
    () => getDuplicateKeysCaseInsensitive(parsedKeys),
    [parsedKeys]
  );
  const duplicateRowKeys = useMemo(
    () => getDuplicateKeysCaseInsensitive(items.map((item) => item.key)),
    [items]
  );

  useEffect(() => {
    register('dragDropItems', {
      validate: {
        hasAtLeastOneKey: () =>
          uniqueParsedKeys.length > 0 || t('editor.drag_drop_text.error_no_key'),
        noDuplicateTextKeys: () =>
          duplicateParsedKeys.length === 0 ||
          t('editor.drag_drop_text.error_duplicate_keys_in_text', {
            keys: duplicateParsedKeys.map((key) => `[[${key}]]`).join(', '),
          }),
        noDuplicateRowKeys: (vals: DragDropItem[]) => {
          const duplicateKeys = getDuplicateKeysCaseInsensitive(
            (vals ?? []).map((item) => item.key)
          );
          return (
            duplicateKeys.length === 0 ||
            t('editor.drag_drop_text.error_key_duplicate')
          );
        },
        keySetMatchesText: (vals: DragDropItem[]) => {
          const textNormKeys = new Set(uniqueParsedKeys.map((key) => key.toLowerCase()));
          const rowNormKeys = new Set((vals ?? []).map((item) => item.key.toLowerCase()));
          const missingInRows = uniqueParsedKeys.some(
            (key) => !rowNormKeys.has(key.toLowerCase())
          );
          const orphanInRows = (vals ?? []).some(
            (item) => !textNormKeys.has(item.key.toLowerCase())
          );
          return (
            !(missingInRows || orphanInRows) ||
            t('editor.drag_drop_text.error_key_mismatch')
          );
        },
        noEmptyAnswers: (vals: DragDropItem[]) =>
          !(vals ?? []).some((item) => !item.answer.trim()) ||
          t('editor.drag_drop_text.error_empty_answers'),
        totalIs100: (vals: DragDropItem[]) => {
          if (getValues('autoDistributeMarks')) return true;
          const total =
            Math.round((vals ?? []).reduce((s, item) => s + item.markPercent, 0) * 100) / 100;
          return (
            total === 100 ||
            t('editor.drag_drop_text.error_total_not_100', {
              total: new Intl.NumberFormat(i18n.language).format(total),
            })
          );
        },
      },
    });
    return () => {
      unregister('dragDropItems', { keepValue: true });
    };
  }, [
    register,
    unregister,
    getValues,
    t,
    i18n.language,
    uniqueParsedKeys,
    duplicateParsedKeys,
  ]);

  useEffect(() => {
    const signature = JSON.stringify(uniqueParsedKeys);
    if (signature === lastSyncedSignatureRef.current) return;

    const existingByNormKey = new Map(
      items.map((item) => [item.key.toLowerCase(), item])
    );

    const newItems: DragDropItem[] = uniqueParsedKeys.map((parsedKey) => {
      const existing = existingByNormKey.get(parsedKey.toLowerCase());
      if (existing) return { ...existing, key: parsedKey };
      return {
        id: crypto.randomUUID(),
        key: parsedKey,
        answer: parsedKey,
        groupId: '',
        markPercent: 0,
        unlimitedReuse: false,
      };
    });

    const isUnchanged =
      newItems.length === items.length &&
      newItems.every((item, idx) => {
        const cur = items[idx];
        return cur?.key === item.key && cur?.id === item.id;
      });

    lastSyncedSignatureRef.current = signature;
    if (isUnchanged) return;

    const finalItems = autoDistribute
      ? (() => {
          const marks = distributeMarks(newItems.length);
          return newItems.map((it, i) => ({ ...it, markPercent: marks[i] }));
        })()
      : newItems;

    setValue('dragDropItems', finalItems);
  }, [uniqueParsedKeys, items, autoDistribute, setValue]);

  const applyAutoDistribute = useCallback(
    (next: DragDropItem[]) => {
      const marks = distributeMarks(next.length);
      return next.map((it, i) => ({ ...it, markPercent: marks[i] }));
    },
    []
  );

  const handleAutoDistributeChange = useCallback(
    (checked: boolean) => {
      setValue('autoDistributeMarks', checked);
      if (checked) setValue('dragDropItems', applyAutoDistribute(items));
    },
    [setValue, items, applyAutoDistribute]
  );

  const handleAnswerChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'dragDropItems',
        items.map((it) => (it.id === id ? { ...it, answer: value } : it))
      );
    },
    [setValue, items]
  );

  const handleGroupChange = useCallback(
    (id: string, groupId: string) => {
      setValue(
        'dragDropItems',
        items.map((it) => (it.id === id ? { ...it, groupId } : it))
      );
    },
    [setValue, items]
  );

  const handleMarkPercentChange = useCallback(
    (id: string, raw: string) => {
      const value = parseFloat(raw);
      if (isNaN(value)) return;
      setValue('autoDistributeMarks', false);
      setValue(
        'dragDropItems',
        items.map((it) => (it.id === id ? { ...it, markPercent: value } : it))
      );
    },
    [setValue, items]
  );

  const handleUnlimitedReuseChange = useCallback(
    (id: string, checked: boolean) => {
      setValue(
        'dragDropItems',
        items.map((it) => (it.id === id ? { ...it, unlimitedReuse: checked } : it))
      );
    },
    [setValue, items]
  );

  const clearKeyRowState = useCallback((id: string) => {
    setKeyDraftByItemId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setKeyErrorByItemId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleKeyDraftChange = useCallback((id: string, value: string) => {
    setKeyDraftByItemId((prev) => ({ ...prev, [id]: value }));
    setKeyErrorByItemId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const commitItemKeyChange = useCallback(
    (id: string) => {
      const currentItem = items.find((item) => item.id === id);
      if (!currentItem) return;

      const draftValue = (keyDraftByItemId[id] ?? currentItem.key).trim();
      if (!draftValue) {
        setKeyErrorByItemId((prev) => ({
          ...prev,
          [id]: t('editor.drag_drop_text.error_key_empty'),
        }));
        return;
      }

      const duplicateExists = items.some(
        (item) =>
          item.id !== id &&
          item.key.toLowerCase() === draftValue.toLowerCase()
      );
      if (duplicateExists) {
        setKeyErrorByItemId((prev) => ({
          ...prev,
          [id]: t('editor.drag_drop_text.error_key_duplicate'),
        }));
        return;
      }

      if (draftValue !== currentItem.key) {
        setValue(
          'dragDropItems',
          items.map((item) =>
            item.id === id ? { ...item, key: draftValue } : item
          )
        );
        onRenameKey(currentItem.key, draftValue);
      }

      clearKeyRowState(id);
    },
    [items, keyDraftByItemId, t, setValue, onRenameKey, clearKeyRowState]
  );

  const handleAddItemDialogOpen = useCallback(() => {
    setNewItemKey('');
    setNewItemKeyError('');
    setAddItemDialogOpen(true);
  }, []);

  const handleAddItemDialogClose = useCallback(() => {
    setAddItemDialogOpen(false);
    setNewItemKey('');
    setNewItemKeyError('');
  }, []);

  const handleAddItemConfirm = useCallback(() => {
    const key = newItemKey.trim();
    if (!key) {
      setNewItemKeyError(t('editor.drag_drop_text.error_key_empty'));
      return;
    }
    const normalized = key.toLowerCase();
    const isDuplicate = items.some((it) => it.key.toLowerCase() === normalized);
    if (isDuplicate) {
      setNewItemKeyError(t('editor.drag_drop_text.error_key_duplicate'));
      return;
    }
    onAddKey(key);
    handleAddItemDialogClose();
  }, [newItemKey, items, onAddKey, handleAddItemDialogClose, t]);

  const handleAddGroupOpen = useCallback(() => {
    setNewGroupName('');
    setNewGroupColor('primary');
    setAddGroupDialogOpen(true);
  }, []);

  const handleAddGroupClose = useCallback(() => {
    setAddGroupDialogOpen(false);
    setNewGroupName('');
    setNewGroupColor('primary');
  }, []);

  const handleAddGroupConfirm = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    const newGroup: DragDropGroup = {
      id: crypto.randomUUID(),
      name,
      color: newGroupColor,
    };
    setValue('dragDropGroups', [...groups, newGroup]);
    handleAddGroupClose();
  }, [newGroupName, newGroupColor, groups, setValue, handleAddGroupClose]);

  const handleDeleteGroup = useCallback(
    (id: string) => {
      setValue(
        'dragDropGroups',
        groups.filter((g) => g.id !== id)
      );
      setValue(
        'dragDropItems',
        items.map((it) => (it.groupId === id ? { ...it, groupId: '' } : it))
      );
    },
    [setValue, groups, items]
  );

  const handleDeleteItem = useCallback(
    (itemKey: string) => {
      onDeleteKey(itemKey);
    },
    [onDeleteKey]
  );

  const totalMark = useMemo(
    () => Math.round(items.reduce((s, it) => s + (it.markPercent ?? 0), 0) * 100) / 100,
    [items]
  );
  const isTotalValid = totalMark === 100 || items.length === 0;
  const hasEmptyAnswers = items.some((it) => !it.answer.trim());
  const hasNoKeys = uniqueParsedKeys.length === 0;

  const keyMismatch = useMemo(() => {
    const textNormKeys = new Set(uniqueParsedKeys.map((k) => k.toLowerCase()));
    const rowNormKeys = new Set(items.map((it) => it.key.toLowerCase()));
    const missingInRows = uniqueParsedKeys.some((k) => !rowNormKeys.has(k.toLowerCase()));
    const orphanInRows = items.some((it) => !textNormKeys.has(it.key.toLowerCase()));
    return missingInRows || orphanInRows;
  }, [uniqueParsedKeys, items]);

  return (
    <Box className="flex flex-col gap-6">
      {hasNoKeys && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_no_key')}
        </Alert>
      )}
      {duplicateParsedKeys.length > 0 && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_duplicate_keys_in_text', {
            keys: duplicateParsedKeys.map((key) => `[[${key}]]`).join(', '),
          })}
        </Alert>
      )}
      {duplicateRowKeys.length > 0 && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_key_duplicate')}
        </Alert>
      )}

      <Box className="flex justify-between items-center flex-wrap gap-4">
        <Typography variant="body2" className="font-semibold" sx={{ color: 'text.primary' }}>
          {t('editor.drag_drop_text.groups_label')}
        </Typography>
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={handleAddGroupOpen}
          className="normal-case text-sm shrink-0"
        >
          {t('editor.drag_drop_text.add_group')}
        </Button>
      </Box>

      {groups.length > 0 && (
        <Box className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const paletteKey = group.color as GroupColor;
            const paletteColor = theme.palette[paletteKey];
            return (
              <GroupChip key={group.id}>
                <CircleIcon sx={{ fontSize: 12, color: paletteColor.main }} />
                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {group.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-0.5 ml-1"
                  sx={{ color: 'text.disabled' }}
                  aria-label={t('editor.drag_drop_text.delete_group')}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </GroupChip>
            );
          })}
        </Box>
      )}

      <Box className="flex justify-between items-center flex-wrap gap-4">
        <Typography variant="body2" className="font-semibold" sx={{ color: 'text.primary' }}>
          {t('editor.drag_drop_text.items_label')} *
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={autoDistribute}
              onChange={(e) => handleAutoDistributeChange(e.target.checked)}
            />
          }
          label={t('editor.drag_drop_text.auto_distribute')}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
        />
      </Box>

      {items.length > 0 && (
        <Box className="flex flex-col gap-2">
          <Box
            className="grid gap-2 px-3 pb-1"
            style={{ gridTemplateColumns: '1fr 1fr 140px 80px 80px 28px' }}
          >
            {[
              t('editor.drag_drop_text.col_key'),
              t('editor.drag_drop_text.col_answer'),
              t('editor.drag_drop_text.col_group'),
              t('editor.drag_drop_text.col_mark'),
              t('editor.drag_drop_text.col_unlimited'),
              '',
            ].map((label, i) => (
              <Typography
                key={i}
                variant="caption"
                className="font-semibold uppercase tracking-wide"
                sx={{ color: 'text.disabled', fontSize: '0.625rem' }}
              >
                {label}
              </Typography>
            ))}
          </Box>

          {items.map((item) => (
            <RowCard
              key={item.id}
              className="grid items-center gap-2 p-2"
              style={{ gridTemplateColumns: '1fr 1fr 140px 80px 80px 28px' }}
            >
              <TextField
                size="small"
                value={keyDraftByItemId[item.id] ?? item.key}
                onChange={(e) => handleKeyDraftChange(item.id, e.target.value)}
                onBlur={() => commitItemKeyChange(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitItemKeyChange(item.id);
                  }
                  if (e.key === 'Escape') {
                    clearKeyRowState(item.id);
                  }
                }}
                error={!!keyErrorByItemId[item.id]}
                helperText={keyErrorByItemId[item.id]}
                placeholder={t('editor.drag_drop_text.key_label')}
                required
                slotProps={{
                  htmlInput: { title: t('editor.drag_drop_text.key_edit_sync_hint') },
                }}
                sx={(th) => ({
                  '& .MuiOutlinedInput-root': { backgroundColor: th.palette.background.paper },
                })}
              />

              <TextField
                size="small"
                value={item.answer}
                onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                placeholder={t('editor.drag_drop_text.answer_placeholder')}
                error={!item.answer.trim()}
                required
                sx={(th) => ({
                  '& .MuiOutlinedInput-root': { backgroundColor: th.palette.background.paper },
                })}
              />

              <Select
                size="small"
                value={item.groupId}
                onChange={(e) => handleGroupChange(item.id, e.target.value)}
                displayEmpty
                renderValue={(val) => {
                  if (!val) {
                    return (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        {t('editor.drag_drop_text.no_group')}
                      </Typography>
                    );
                  }
                  const g = groups.find((gr) => gr.id === val);
                  if (!g) return val;
                  const pk = g.color as GroupColor;
                  return (
                    <Box className="flex items-center gap-1">
                      <CircleIcon sx={{ fontSize: 10, color: theme.palette[pk].main }} />
                      <Typography variant="body2">{g.name}</Typography>
                    </Box>
                  );
                }}
                sx={(th) => ({
                  backgroundColor: th.palette.background.paper,
                  fontSize: '0.875rem',
                })}
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    {t('editor.drag_drop_text.no_group')}
                  </Typography>
                </MenuItem>
                {groups.map((g) => {
                  const pk = g.color as GroupColor;
                  return (
                    <MenuItem key={g.id} value={g.id}>
                      <Box className="flex items-center gap-1.5">
                        <CircleIcon sx={{ fontSize: 12, color: theme.palette[pk].main }} />
                        {g.name}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>

              <TextField
                size="small"
                type="number"
                value={item.markPercent}
                onChange={(e) => handleMarkPercentChange(item.id, e.target.value)}
                disabled={autoDistribute}
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 0.01 },
                  input: { endAdornment: <Typography variant="caption">%</Typography> },
                }}
                sx={(th) => ({
                  '& .MuiOutlinedInput-root': { backgroundColor: th.palette.background.paper },
                })}
              />

              <Box className="flex justify-center">
                <Checkbox
                  size="small"
                  checked={item.unlimitedReuse}
                  onChange={(e) => handleUnlimitedReuseChange(item.id, e.target.checked)}
                />
              </Box>

              <Box className="flex justify-center">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteItem(item.key)}
                  sx={{ color: 'text.disabled' }}
                  aria-label={t('editor.drag_drop_text.delete_item')}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </RowCard>
          ))}
        </Box>
      )}

      <Button
        variant="text"
        startIcon={<AddIcon />}
        onClick={handleAddItemDialogOpen}
        className="self-start normal-case text-sm"
      >
        {t('editor.drag_drop_text.add_item')}
      </Button>

      {keyMismatch && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_key_mismatch')}
        </Alert>
      )}
      {hasEmptyAnswers && (
        <Alert severity="warning" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_empty_answers')}
        </Alert>
      )}
      {!autoDistribute && !isTotalValid && items.length > 0 && (
        <Alert severity="error" variant="outlined" className="text-sm">
          {t('editor.drag_drop_text.error_total_not_100', {
            total: new Intl.NumberFormat(i18n.language).format(totalMark),
          })}
        </Alert>
      )}

      <Dialog open={addItemDialogOpen} onClose={handleAddItemDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>{t('editor.drag_drop_text.add_item_dialog_title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('editor.drag_drop_text.key_label')}
            fullWidth
            value={newItemKey}
            onChange={(e) => {
              setNewItemKey(e.target.value);
              setNewItemKeyError('');
            }}
            error={!!newItemKeyError}
            helperText={newItemKeyError}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItemConfirm();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddItemDialogClose}>{t('cancel')}</Button>
          <Button onClick={handleAddItemConfirm} variant="contained">
            {t('editor.drag_drop_text.add_item_insert')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addGroupDialogOpen} onClose={handleAddGroupClose} maxWidth="xs" fullWidth>
        <DialogTitle>{t('editor.drag_drop_text.add_group_dialog_title')}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-4">
          <TextField
            autoFocus
            label={t('editor.drag_drop_text.group_name_label')}
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGroupConfirm();
              }
            }}
          />
          <Box>
            <Typography
              variant="caption"
              className="mb-2 block"
              sx={{ color: 'text.secondary' }}
            >
              {t('editor.drag_drop_text.group_color_label')}
            </Typography>
            <Box className="flex gap-2 flex-wrap">
              {DRAG_DROP_GROUP_COLORS.map((colorKey) => (
                <Box
                  key={colorKey}
                  role="radio"
                  aria-checked={newGroupColor === colorKey}
                  tabIndex={0}
                  onClick={() => setNewGroupColor(colorKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setNewGroupColor(colorKey);
                  }}
                  className="w-8 h-8 rounded-full cursor-pointer"
                  sx={{
                    backgroundColor: theme.palette[colorKey].main,
                    border: newGroupColor === colorKey
                      ? `3px solid ${theme.palette.text.primary}`
                      : `3px solid transparent`,
                    transition: 'border-color 0.15s ease',
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddGroupClose}>{t('cancel')}</Button>
          <Button
            onClick={handleAddGroupConfirm}
            variant="contained"
            disabled={!newGroupName.trim()}
          >
            {t('editor.drag_drop_text.add_group_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default memo(DragDropTextEditor);
