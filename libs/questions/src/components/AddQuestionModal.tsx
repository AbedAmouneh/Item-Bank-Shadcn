import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import QuestionTypeTile from './QuestionTypeTile';
import { PICKER_QUESTION_TYPES } from './questionTypePickerData';
import type { QuestionType } from '../domain/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  CheckCheck, ListChecks, AlignLeft, FileText, GripHorizontal, Image,
  Pen, GalleryHorizontal, MapPin, Calculator, PenLine, SpellCheck,
  List, ScanSearch, Highlighter, Mic, Tags, Images, GitMerge, X, Search
} from 'lucide-react';
import { cn } from '@item-bank/ui';

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: QuestionType) => void;
}

const TILE_ICONS: Record<QuestionType, React.ReactElement> = {
  true_false: <CheckCheck />,
  multiple_choice: <ListChecks />,
  short_answer: <AlignLeft />,
  essay: <FileText />,
  drag_drop_text: <GripHorizontal />,
  drag_drop_image: <Image />,
  free_hand_drawing: <Pen />,
  image_sequencing: <GalleryHorizontal />,
  multiple_hotspots: <MapPin />,
  numerical: <Calculator />,
  fill_in_blanks: <PenLine />,
  select_correct_word: <SpellCheck />,
  text_sequencing: <List />,
  fill_in_blanks_image: <ScanSearch />,
  highlight_correct_word: <Highlighter />,
  record_audio: <Mic />,
  text_classification: <Tags />,
  image_classification: <Images />,
  matching: <GitMerge />,
};

export default function AddQuestionModal({
  open,
  onClose,
  onSelectType,
}: AddQuestionModalProps) {
  const { t } = useTranslation('questions');
  const [search, setSearch] = useState('');

  // Reset search whenever modal is opened
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = useCallback(
    (type: QuestionType) => {
      onSelectType(type);
      onClose();
    },
    [onSelectType, onClose],
  );

  const filteredTypes = search.trim()
    ? PICKER_QUESTION_TYPES.filter((type) =>
        t(`types.${type}`).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : PICKER_QUESTION_TYPES;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-xl",
          "flex flex-col animate-in fade-in-0 zoom-in-95 focus:outline-none"
        )}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {t('add_questions_title')}
            </DialogPrimitive.Title>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  className="ps-8 pe-3 py-1.5 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-52 placeholder:text-muted-foreground text-foreground"
                  placeholder={t('search_question_types')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Tile grid */}
          <div className="p-6 overflow-y-auto">
            {filteredTypes.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {filteredTypes.map((type) => (
                  <QuestionTypeTile
                    key={type}
                    label={t(`types.${type}`)}
                    icon={TILE_ICONS[type]}
                    onClick={() => handleSelect(type)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('no_types_found')}
              </div>
            )}
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
