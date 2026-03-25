import { type ReactNode } from 'react';

import { FileText, ClipboardList, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@item-bank/ui';

import type { ActivityType } from '@item-bank/api';

// ─── Type card data ──────────────────────────────────────────────────────────

interface TypeCard {
  type: ActivityType;
  labelKey: string;
  icon: ReactNode;
  colorClass: string;
}

const TYPE_CARDS: TypeCard[] = [
  {
    type: 'quiz',
    labelKey: 'courses.type_quiz',
    icon: <ClipboardList size={28} />,
    colorClass: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
  },
  {
    type: 'survey',
    labelKey: 'courses.type_survey',
    icon: <BarChart2 size={28} />,
    colorClass: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
  },
  {
    type: 'practice_quiz',
    labelKey: 'courses.type_practice_quiz',
    icon: <ClipboardList size={28} />,
    colorClass: 'text-orange-500 bg-orange-500/10 dark:bg-orange-500/20',
  },
  {
    type: 'pdf_book',
    labelKey: 'courses.type_pdf_book',
    icon: <FileText size={28} />,
    colorClass: 'text-red-500 bg-red-500/10 dark:bg-red-500/20',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export interface ActivityTypePickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: ActivityType) => void;
}

export function ActivityTypePicker({ open, onClose, onPick }: ActivityTypePickerProps) {
  const { t } = useTranslation('common');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('courses.pick_activity_type')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {TYPE_CARDS.map(({ type, labelKey, icon, colorClass }) => (
            <button
              key={type}
              type="button"
              className={cn(
                'flex flex-col items-center gap-3 rounded-xl border-2 border-transparent p-6 transition-all',
                'hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              onClick={() => { onPick(type); onClose(); }}
            >
              <span className={cn('rounded-xl p-3', colorClass)}>{icon}</span>
              <span className="text-sm font-medium">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
