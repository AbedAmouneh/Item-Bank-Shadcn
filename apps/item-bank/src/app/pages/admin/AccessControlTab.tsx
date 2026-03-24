import { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { X, ChevronsUpDown, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
} from '@item-bank/ui';
import { getItemBanks } from '@item-bank/api';
import type { ItemBank } from '@item-bank/api';
import {
  getUserItemBanks,
  assignItemBankToUser,
  removeItemBankFromUser,
  updateUser,
} from '@item-bank/api';
import type { AdminUser } from '@item-bank/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type AccessMode = 'all_access' | 'assigned_only';

interface AccessControlTabProps {
  user: AdminUser;
  /** Called after the access mode is updated so the parent can refresh its data. */
  onModeChange: (updated: AdminUser) => void;
}

// ── Access mode radio ──────────────────────────────────────────────────────────

interface AccessModeRadioProps {
  value: AccessMode;
  onChange: (mode: AccessMode) => void;
  disabled?: boolean;
}

function AccessModeRadio({ value, onChange, disabled = false }: AccessModeRadioProps) {
  const { t } = useTranslation('common');
  const options: { value: AccessMode; label: string }[] = [
    { value: 'all_access', label: t('admin.users.all_access') },
    { value: 'assigned_only', label: t('admin.users.assigned_only') },
  ];

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
            value === opt.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border hover:bg-muted/50',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <input
            type="radio"
            name="access-mode"
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="accent-primary"
          />
          <span className="text-sm font-medium">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

// ── Item bank combobox ─────────────────────────────────────────────────────────

interface ItemBankComboboxProps {
  /** Item banks already assigned to the user — excluded from the dropdown. */
  assignedIds: Set<number>;
  onSelect: (itemBank: ItemBank) => void;
  disabled?: boolean;
}

function ItemBankCombobox({ assignedIds, onSelect, disabled = false }: ItemBankComboboxProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  const { data: page } = useQuery({
    queryKey: ['item-banks', 'all'],
    queryFn: () => getItemBanks({ limit: 100 }),
    enabled: open,
  });

  const available = (page?.items ?? []).filter((ib) => !assignedIds.has(ib.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {t('admin.users.assign_item_bank')}
          <ChevronsUpDown size={14} className="ms-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('admin.users.search_item_banks')} />
          <CommandList>
            <CommandEmpty>{t('admin.users.no_item_banks_found')}</CommandEmpty>
            <CommandGroup>
              {available.map((ib) => (
                <CommandItem
                  key={ib.id}
                  value={ib.name}
                  onSelect={() => {
                    onSelect(ib);
                    setOpen(false);
                  }}
                >
                  <Check
                    size={14}
                    className={cn('me-2 opacity-0')}
                  />
                  {ib.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Assigned item bank row ─────────────────────────────────────────────────────

interface AssignedBankRowProps {
  itemBank: ItemBank;
  onRemove: (id: number) => void;
  isRemoving: boolean;
}

function AssignedBankRow({ itemBank, onRemove, isRemoving }: AssignedBankRowProps) {
  const { t } = useTranslation('common');
  return (
    <li className="flex items-center gap-3 rounded-lg border px-4 py-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{itemBank.name}</span>
      <button
        type="button"
        aria-label={t('courses.remove')}
        disabled={isRemoving}
        onClick={() => onRemove(itemBank.id)}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <X size={14} />
      </button>
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Access Control tab inside the user side-sheet.
 *
 * Shows the access-mode radio (All Access / Assigned Only) and, when the mode
 * is "assigned_only", a list of the user's assigned item banks plus a combobox
 * to add more.
 */
export function AccessControlTab({ user, onModeChange }: AccessControlTabProps) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [modeError, setModeError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  const userId = Number(user.id);
  const currentMode: AccessMode = user.course_assignment_mode ?? 'all_access';
  const showBankList = currentMode === 'assigned_only';

  // Fetch item banks assigned to this user.
  const { data: assignedBanks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ['admin', 'user-item-banks', user.id],
    queryFn: () => getUserItemBanks(userId),
    enabled: showBankList,
  });

  const assignedIds = new Set(assignedBanks.map((ib) => ib.id));

  // Update access mode.
  const { mutate: saveMode, isPending: savingMode } = useMutation({
    mutationFn: (mode: AccessMode) =>
      updateUser(user.id, { course_assignment_mode: mode }),
    onSuccess: (updated) => {
      setModeError('');
      onModeChange(updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => setModeError(t('admin.users.access_mode_error')),
  });

  // Assign an item bank.
  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: (itemBankId: number) => assignItemBankToUser(userId, itemBankId),
    onSuccess: () => {
      setAssignError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-item-banks', user.id] });
    },
    onError: () => setAssignError(t('admin.users.assign_error')),
  });

  // Remove an assigned item bank.
  const { mutate: remove } = useMutation({
    mutationFn: (itemBankId: number) => removeItemBankFromUser(userId, itemBankId),
    onMutate: (id) => setRemovingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-item-banks', user.id] });
    },
    onSettled: () => setRemovingId(null),
  });

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Access mode */}
      <div className="flex flex-col gap-2">
        <Label>{t('admin.users.access_mode')}</Label>
        <AccessModeRadio
          value={currentMode}
          onChange={saveMode}
          disabled={savingMode}
        />
        {modeError && <p className="text-sm text-destructive">{modeError}</p>}
      </div>

      {/* Assigned item banks — only visible when mode is assigned_only */}
      {showBankList && (
        <div className="flex flex-col gap-3">
          <Label>{t('admin.users.assigned_item_banks')}</Label>

          {loadingBanks && (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="h-12 rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!loadingBanks && assignedBanks.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('admin.users.no_assigned_banks')}
            </p>
          )}

          {!loadingBanks && assignedBanks.length > 0 && (
            <ul className="flex flex-col gap-2">
              {assignedBanks.map((ib) => (
                <AssignedBankRow
                  key={ib.id}
                  itemBank={ib}
                  onRemove={(id) => remove(id)}
                  isRemoving={removingId === ib.id}
                />
              ))}
            </ul>
          )}

          <ItemBankCombobox
            assignedIds={assignedIds}
            onSelect={(ib) => assign(ib.id)}
            disabled={assigning}
          />
          {assignError && <p className="text-sm text-destructive">{assignError}</p>}
        </div>
      )}
    </div>
  );
}
