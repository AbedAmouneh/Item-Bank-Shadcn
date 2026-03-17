import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Plus, Trash2, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  cn,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@item-bank/ui';

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

/** Maps the semantic group color name to a concrete hex value used for inline styles. */
const GROUP_COLOR_HEX: Record<string, string> = {
  primary:   '#6366f1',
  secondary: '#8b5cf6',
  success:   '#22c55e',
  warning:   '#f59e0b',
  error:     '#ef4444',
  info:      '#3b82f6',
};

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

type DragDropTextEditorProps = {
  questionText?: string;
  onAddKey: (key: string) => void;
  onRenameKey: (oldKey: string, newKey: string) => void;
  onDeleteKey: (key: string) => void;
};

function DragDropTextEditor({ questionText, onAddKey, onRenameKey, onDeleteKey }: DragDropTextEditorProps) {
  const { t, i18n } = useTranslation('questions');
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
    <div className="flex flex-col gap-6">
      {hasNoKeys && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('editor.drag_drop_text.error_no_key')}
        </div>
      )}
      {duplicateParsedKeys.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('editor.drag_drop_text.error_duplicate_keys_in_text', {
            keys: duplicateParsedKeys.map((key) => `[[${key}]]`).join(', '),
          })}
        </div>
      )}
      {duplicateRowKeys.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('editor.drag_drop_text.error_key_duplicate')}
        </div>
      )}

      {/* Groups section header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <p className="text-sm font-semibold text-foreground">
          {t('editor.drag_drop_text.groups_label')}
        </p>
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          onClick={handleAddGroupOpen}
        >
          <Plus size={15} />
          {t('editor.drag_drop_text.add_group')}
        </button>
      </div>

      {/* Group chips */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const hex = GROUP_COLOR_HEX[group.color] ?? GROUP_COLOR_HEX['primary'];
            return (
              <div
                key={group.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl border border-border bg-card"
              >
                <Circle size={10} style={{ color: hex }} className="fill-current shrink-0" />
                <span className="text-xs font-medium text-foreground">
                  {group.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(group.id)}
                  className="ms-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t('editor.drag_drop_text.delete_group')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Items section header with auto-distribute toggle */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <p className="text-sm font-semibold text-foreground">
          {t('editor.drag_drop_text.items_label')} *
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            role="switch"
            className="h-4 w-4 rounded-sm border border-input accent-primary cursor-pointer"
            checked={autoDistribute}
            onChange={(e) => handleAutoDistributeChange(e.target.checked)}
          />
          <span className="text-sm text-foreground">
            {t('editor.drag_drop_text.auto_distribute')}
          </span>
        </label>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Column headers */}
          <div
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
              <span
                key={i}
                className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Item rows */}
          {items.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-2 p-2 rounded-xl border border-border bg-card/60 dark:bg-card/40"
              style={{ gridTemplateColumns: '1fr 1fr 140px 80px 80px 28px' }}
            >
              {/* Key field with inline error */}
              <div className="flex flex-col gap-1">
                <Input
                  className={cn('text-sm', keyErrorByItemId[item.id] && 'border-destructive')}
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
                  placeholder={t('editor.drag_drop_text.key_label')}
                  required
                  title={t('editor.drag_drop_text.key_edit_sync_hint')}
                />
                {keyErrorByItemId[item.id] && (
                  <span className="text-xs text-destructive">{keyErrorByItemId[item.id]}</span>
                )}
              </div>

              {/* Answer field */}
              <Input
                className={cn('text-sm', !item.answer.trim() && 'border-destructive')}
                value={item.answer}
                onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                placeholder={t('editor.drag_drop_text.answer_placeholder')}
                required
              />

              {/* Group selector — native select avoids introducing another shadcn dependency */}
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                value={item.groupId}
                onChange={(e) => handleGroupChange(item.id, e.target.value)}
                aria-label={t('editor.drag_drop_text.col_group')}
              >
                <option value="">{t('editor.drag_drop_text.no_group')}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Mark % field */}
              <div className="relative flex items-center">
                <Input
                  className="text-sm pe-5"
                  type="number"
                  value={item.markPercent}
                  onChange={(e) => handleMarkPercentChange(item.id, e.target.value)}
                  disabled={autoDistribute}
                  min={0}
                  max={100}
                  step={0.01}
                />
                <span className="absolute end-2 text-xs text-muted-foreground pointer-events-none">%</span>
              </div>

              {/* Unlimited reuse checkbox */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-sm border border-input accent-primary cursor-pointer"
                  checked={item.unlimitedReuse}
                  onChange={(e) => handleUnlimitedReuseChange(item.id, e.target.checked)}
                  aria-label={t('editor.drag_drop_text.col_unlimited')}
                />
              </div>

              {/* Delete item */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.key)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t('editor.drag_drop_text.delete_item')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add item button */}
      <button
        type="button"
        className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        onClick={handleAddItemDialogOpen}
      >
        <Plus size={15} />
        {t('editor.drag_drop_text.add_item')}
      </button>

      {/* Validation alerts */}
      {keyMismatch && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('editor.drag_drop_text.error_key_mismatch')}
        </div>
      )}
      {hasEmptyAnswers && (
        <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {t('editor.drag_drop_text.error_empty_answers')}
        </div>
      )}
      {!autoDistribute && !isTotalValid && items.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('editor.drag_drop_text.error_total_not_100', {
            total: new Intl.NumberFormat(i18n.language).format(totalMark),
          })}
        </div>
      )}

      {/* Add item dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={(open) => { if (!open) handleAddItemDialogClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('editor.drag_drop_text.add_item_dialog_title')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1 pt-2">
            <Input
              autoFocus
              placeholder={t('editor.drag_drop_text.key_label')}
              value={newItemKey}
              onChange={(e) => {
                setNewItemKey(e.target.value);
                setNewItemKeyError('');
              }}
              className={cn(newItemKeyError && 'border-destructive')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItemConfirm();
                }
              }}
            />
            {newItemKeyError && (
              <span className="text-xs text-destructive">{newItemKeyError}</span>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-row justify-end">
            <Button variant="outline" type="button" onClick={handleAddItemDialogClose}>
              {t('cancel')}
            </Button>
            <Button type="button" onClick={handleAddItemConfirm}>
              {t('editor.drag_drop_text.add_item_insert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add group dialog */}
      <Dialog open={addGroupDialogOpen} onOpenChange={(open) => { if (!open) handleAddGroupClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('editor.drag_drop_text.add_group_dialog_title')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            <Input
              autoFocus
              placeholder={t('editor.drag_drop_text.group_name_label')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddGroupConfirm();
                }
              }}
            />

            <div>
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                {t('editor.drag_drop_text.group_color_label')}
              </span>
              <div className="flex gap-2 flex-wrap">
                {DRAG_DROP_GROUP_COLORS.map((colorKey) => {
                  const hex = GROUP_COLOR_HEX[colorKey];
                  const isSelected = newGroupColor === colorKey;
                  return (
                    <div
                      key={colorKey}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => setNewGroupColor(colorKey)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setNewGroupColor(colorKey);
                      }}
                      className="w-8 h-8 rounded-full cursor-pointer transition-[border-color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      style={{
                        backgroundColor: hex,
                        border: isSelected ? '3px solid hsl(var(--foreground))' : '3px solid transparent',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-row justify-end">
            <Button variant="outline" type="button" onClick={handleAddGroupClose}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAddGroupConfirm}
              disabled={!newGroupName.trim()}
            >
              {t('editor.drag_drop_text.add_group_confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(DragDropTextEditor);
