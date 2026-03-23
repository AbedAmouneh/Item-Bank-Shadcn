import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import { type QuestionType } from '../domain/types';
import { memo, useMemo, useState, useRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { createEmptyAnswer } from '../domain/factory';
import { type AnswerEntry } from '../domain/types';
import DragDropTextEditor from '../pages/drag-drop-text/DragDropTextEditor';
import DragDropImageWizard from '../pages/drag-drop-image/DragDropImageWizard';
import { MatchingWizard } from '../pages/matching';
import { CrosswordWizard } from '../pages/crossword';
import FillInBlanksEditor from '../pages/fill-in-blanks/FillInBlanksEditor';
import FillInBlanksImageEditor from '../pages/fill-in-blanks-image/FillInBlanksImageEditor';
import MultipleChoiceEditor from '../pages/multiple-choice/MultipleChoiceEditor';
import EssayEditor from '../pages/essay/EssayEditor';
import TrueFalseEditor from '../pages/true-false/Add';
import ShortAnswerEditor from '../pages/short-answer/Add';
import TextSequencingEditor from '../pages/text-sequencing/TextSequencingEditor';
import ImageSequencingEditor from '../pages/image-sequencing/ImageSequencingEditor';
import SelectCorrectWordEditor from '../pages/select-correct-word/SelectCorrectWordEditor';
import BackgroundImageSettings from './BackgroundImageSettings';
import MultipleHotspotsEditor from '../pages/multiple-hotspots/MultipleHotspotsEditor';
import RecordAudioEditor from '../pages/record-audio/RecordAudioEditor';
import NumericalEditor from '../pages/numerical/NumericalEditor';
import HighlightCorrectWordEditor from '../pages/highlight-correct-word/HighlightCorrectWordEditor';
import JustificationInput from './JustificationInput';
import TextClassificationEditor from '../pages/text-classification/TextClassificationEditor';
import ImageClassificationEditor from '../pages/image-classification/ImageClassificationEditor';
import {
  Input,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@item-bank/ui';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Megaphone } from 'lucide-react';

type AnswerGroup = { key: string; answers: AnswerEntry[] };

export type SequencingItem = {
  id: string;
  text?: string;
  image?: string;
  markPercent: number;
};

type ChoiceNumbering =
  | 'none'
  | 'numeric'
  | 'upper_alpha'
  | 'lower_alpha'
  | 'roman';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

type QuestionEditorShellProps = {
  questionType: QuestionType;
  onSave: (questionData: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
  showJustification?: boolean;
  questionId?: number;
};

export type QuestionFormData = {
  id?: string;
  type: QuestionType;
  name: string;
  mark: number;
  text: string;
  // Fill-in-blanks
  content?: string;
  answerGroups?: AnswerGroup[];
  manualMarking?: boolean;
  requireUniqueKeyAnswers?: boolean;
  // Fill-in-blanks-image
  inputAreas?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    answers: AnswerEntry[];
    manualMarking: boolean;
  }>;
  // Multiple-choice
  choices?: Choice[];
  choiceNumbering?: ChoiceNumbering;
  minSelections?: number;
  maxSelections?: number;
  allowPartialCredit?: boolean;
  allowShuffle?: boolean;
  // Essay
  responseFormat?: 'html' | 'html_with_file_picker' | 'plain_text';
  minLimit?: string;
  maxLimit?: string;
  allowAttachments?: boolean;
  numberOfAttachments?: number;
  requiredAttachments?: boolean;
  maxFileSize?: string;
  attachmentsFormat?: string[];
  // True/False
  correctAnswer?: 'True' | 'False';
  // Short Answer
  answers?: AnswerEntry[];
  // Text Sequencing
  sequencingItems?: SequencingItem[];
  autoDistributeMarks?: boolean;
  allowPartialCreditScoring?: boolean;
  // Free-hand drawing
  enableBackgroundImage?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  background_image?: string | null;
  // Select correct word
  selectWordGroups?: Array<{
    key: string;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
  // Record audio
  informationForGraders?: string;
  numberOfRecordingsMin?: number;
  numberOfRecordingsMax?: number;
  recordingDurationMinSeconds?: number;
  recordingDurationMaxSeconds?: number;
  // Multiple hotspots
  hotspots?: Array<{
    type: 'rectangle' | 'circle' | 'polygon';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: number[];
    color: string;
    strokeWidth: number;
    opacity?: number;
    isCorrect: boolean;
    mark?: number;
  }>;
  // Numerical
  numericalAnswers?: Array<{
    id: string;
    answer: string;
    error: string;
    mark: number;
    feedback: boolean;
  }>;
  numericalUnitHandling?: 'required' | 'optional' | 'disabled';
  numericalUnitInputMethod?:
    | 'multiple_choice_selection'
    | 'drop_down'
    | 'text_input';
  numericalUnitPenalty?: string;
  numericalUnits?: Array<{
    id: string;
    unit: string;
    multiplier: string;
  }>;
  // Highlight correct word
  highlightCorrectPhrases?: string[];
  highlightPenaltyPercent?: number;
  // Drag-drop-text
  dragDropItems?: Array<{
    id: string;
    key: string;
    answer: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
  }>;
  dragDropGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  // Drag-drop-image
  justificationMode?: 'required' | 'optional' | 'disabled';
  justificationFraction?: number;
  dragDropImageItems?: Array<{
    id: string;
    itemType: 'text' | 'image';
    answer: string;
    image?: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
    zones: Array<{
      id: string;
      left: number;
      top: number;
      width?: number;
      height?: number;
    }>;
  }>;
  dragDropImageGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  // Text classification
  textClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      text: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>;
  textClassificationLayout?: 'columns' | 'rows';
  textClassificationAutoDistribute?: boolean;
  textClassificationJustification?: 'disabled' | 'optional' | 'required';
  textClassificationJustificationFraction?: number;
  // Image classification
  imageClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      imageUrl: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>;
  // Matching
  matchingLeftItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
    multipleAnswers: boolean;
    linkedRightIds: string[];
    markPercent: number;
  }>;
  matchingRightItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
  }>;
  matchingLeftMode?: 'text' | 'image';
  matchingRightMode?: 'text' | 'image';
  matchingAllowRightReuse?: boolean;
  matchingAutoDistribute?: boolean;
  matchingPenalty?: number;
  matchingJustification?: 'disabled' | 'optional' | 'required';
  matchingJustificationFraction?: number;
  // Crossword
  crosswordWords?: Array<{
    word: string;
    clue: string;
    direction: 'across' | 'down';
    row: number;
    col: number;
    clueNumber: number;
  }>;
  crosswordGridLayout?: 'ltr' | 'rtl';
  crosswordHintMode?: 'none' | 'count' | 'percentage';
  crosswordHintValue?: number;
  // Spelling Dictation
  spellingAudioUrl?: string | null;
  spellingAudioName?: string | null;
  spellingCorrectAnswers?: string[];
  spellingHint?: string;
  // Answer feedback (correct / partially correct / incorrect)
  correctAnswerFeedback?: string;
  partiallyCorrectAnswerFeedback?: string;
  incorrectAnswerFeedback?: string;
};

const defaultToolbar =
  'styles | fontfamily | fontsize | forecolor backcolor | bold italic underline strikethrough | superscript subscript | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image | removeformat';

const QUESTION_TYPES_WITH_JUSTIFICATION: QuestionType[] = [
  'drag_drop_image',
  'true_false',
  'short_answer',
  'image_sequencing',
  'multiple_hotspots',
  'numerical',
  'drag_drop_text',
  'fill_in_blanks',
  'select_correct_word',
  'text_sequencing',
  'multiple_choice',
  'highlight_correct_word',
];

function getInitialValues(questionType: QuestionType): QuestionFormData {
  const base = {
    type: questionType,
    name: '',
    mark: 10,
    text: '',
    justificationMode: 'disabled' as const,
    justificationFraction: 20,
    correctAnswerFeedback: '',
    partiallyCorrectAnswerFeedback: '',
    incorrectAnswerFeedback: '',
  };

  switch (questionType) {
    case 'fill_in_blanks':
      return {
        ...base,
        content: '',
        answerGroups: [],
        manualMarking: false,
        requireUniqueKeyAnswers: false,
      };

    case 'fill_in_blanks_image':
      return {
        ...base,
        background_image: null,
        inputAreas: [],
      };

    case 'multiple_choice':
      return {
        ...base,
        choiceNumbering: 'none' as const,
        minSelections: 1,
        maxSelections: 1,
        allowPartialCredit: false,
        allowShuffle: false,
        choices: [
          {
            id: crypto.randomUUID(),
            text: '',
            isCorrect: false,
            feedbackEnabled: false,
            feedbackText: '',
          },
          {
            id: crypto.randomUUID(),
            text: '',
            isCorrect: false,
            feedbackEnabled: false,
            feedbackText: '',
          },
        ],
      };

    case 'essay':
      return {
        ...base,
        responseFormat: 'html' as const,
        minLimit: '',
        maxLimit: '',
        allowAttachments: false,
        numberOfAttachments: 1,
        requiredAttachments: false,
        maxFileSize: '2MB',
        attachmentsFormat: ['.pdf', '.doc', '.docx'],
      };

    case 'true_false':
      return { ...base, correctAnswer: 'True' as const };

    case 'short_answer':
      return { ...base, answers: [createEmptyAnswer()] };

    case 'text_sequencing':
      return {
        ...base,
        sequencingItems: [
          { id: crypto.randomUUID(), text: '', markPercent: 50 },
          { id: crypto.randomUUID(), text: '', markPercent: 50 },
        ],
        autoDistributeMarks: true,
        allowPartialCreditScoring: false,
      };
    case 'image_sequencing':
      return {
        ...base,
        sequencingItems: [
          { id: crypto.randomUUID(), image: '', markPercent: 50 },
          { id: crypto.randomUUID(), image: '', markPercent: 50 },
        ],
        autoDistributeMarks: true,
      };
    case 'free_hand_drawing':
      return {
        ...base,
        enableBackgroundImage: true,
        canvasWidth: 600,
        canvasHeight: 600,
        background_image: null,
      };

    case 'select_correct_word':
      return {
        ...base,
        selectWordGroups: [],
        allowPartialCreditScoring: false,
      };
    case 'record_audio':
      return {
        ...base,
        informationForGraders: '',
        numberOfRecordingsMin: 1,
        numberOfRecordingsMax: 1,
        recordingDurationMinSeconds: 10,
        recordingDurationMaxSeconds: 30,
      };

    case 'numerical':
      return {
        ...base,
        numericalAnswers: [
          {
            id: crypto.randomUUID(),
            answer: '',
            error: '0',
            mark: 100,
            feedback: false,
          },
        ],
        numericalUnitHandling: 'disabled' as const,
        numericalUnitInputMethod: 'text_input' as const,
        numericalUnitPenalty: '0',
        numericalUnits: [
          { id: crypto.randomUUID(), unit: '', multiplier: '1.0' },
        ],
      };

    case 'highlight_correct_word':
      return {
        ...base,
        highlightCorrectPhrases: [],
        highlightPenaltyPercent: 25,
      };

    case 'drag_drop_text':
      return {
        ...base,
        dragDropItems: [],
        dragDropGroups: [],
        autoDistributeMarks: true,
      };

    case 'drag_drop_image':
      return {
        ...base,
        background_image: null,
        justificationMode: 'disabled' as const,
        justificationFraction: 20,
        autoDistributeMarks: true,
        dragDropImageItems: [],
        dragDropImageGroups: [],
      };

    case 'text_classification':
      return {
        ...base,
        mark: 10,
        textClassificationCategories: [
          {
            id: crypto.randomUUID(),
            name: '',
            color: 'blue',
            answers: [
              { id: crypto.randomUUID(), text: '', feedback: '', markPercent: 0 },
              { id: crypto.randomUUID(), text: '', feedback: '', markPercent: 0 },
            ],
          },
          {
            id: crypto.randomUUID(),
            name: '',
            color: 'blue',
            answers: [
              { id: crypto.randomUUID(), text: '', feedback: '', markPercent: 0 },
              { id: crypto.randomUUID(), text: '', feedback: '', markPercent: 0 },
            ],
          },
        ],
        textClassificationLayout: 'columns' as const,
        textClassificationAutoDistribute: true,
        textClassificationJustification: 'disabled' as const,
        textClassificationJustificationFraction: 30,
      };

    case 'image_classification':
      return {
        ...base,
        mark: 10,
        imageClassificationCategories: [
          {
            id: crypto.randomUUID(),
            name: '',
            color: 'blue',
            answers: [
              { id: crypto.randomUUID(), imageUrl: '', feedback: '', markPercent: 0 },
              { id: crypto.randomUUID(), imageUrl: '', feedback: '', markPercent: 0 },
            ],
          },
          {
            id: crypto.randomUUID(),
            name: '',
            color: 'blue',
            answers: [
              { id: crypto.randomUUID(), imageUrl: '', feedback: '', markPercent: 0 },
              { id: crypto.randomUUID(), imageUrl: '', feedback: '', markPercent: 0 },
            ],
          },
        ],
        textClassificationLayout: 'columns' as const,
        textClassificationAutoDistribute: true,
        textClassificationJustification: 'disabled' as const,
        textClassificationJustificationFraction: 30,
      };

    default:
      return base;
  }
}

function QuestionEditorShellForm({
  questionType,
  onSave,
  onCancel,
  initialData,
  showJustification,
}: QuestionEditorShellProps) {
  const { t, i18n } = useTranslation(['questions', 'common']);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const defaultValues = initialData ?? getInitialValues(questionType);
  const methods = useForm<QuestionFormData>({
    defaultValues,
    mode: 'onChange',
    resolver: (values) => {
      const errors: Record<string, { message: string }> = {};

      if (!values.name?.trim()) {
        errors.name = { message: t('common:validation.required') };
      }

      if (!values.text?.trim()) {
        errors.text = { message: t('common:validation.required') };
      }

      if (questionType === 'fill_in_blanks' && !values.content?.trim()) {
        errors.content = { message: t('common:validation.required') };
      }

      if (!values.mark || values.mark < 1) {
        errors.mark = { message: t('common:validation.min', { min: 1 }) };
      }

      if (questionType === 'multiple_hotspots') {
        const hotspots = (values.hotspots ?? []) as QuestionFormData['hotspots'] | undefined;
        const hotspotCount = hotspots?.length ?? 0;
        const minSelections = values.minSelections ?? 1;
        const maxSelections = values.maxSelections ?? 1;

        if (!values.background_image) {
          errors.background_image = {
            message: t('common:validation.required'),
          };
        }

        if (hotspotCount === 0) {
          errors.hotspots = {
            message: t('editor.multiple_hotspots.error_no_hotspots'),
          };
        }

        if (minSelections < 1) {
          errors.minSelections = {
            message: t('editor.error_min_gte_one'),
          };
        }

        if (maxSelections < 1) {
          errors.maxSelections = {
            message: t('editor.error_max_gte_one'),
          };
        }

        if (minSelections > maxSelections) {
          errors.minSelections = {
            message: t('editor.error_min_lte_max'),
          };
        }

        if (hotspotCount > 0) {
          if (minSelections > hotspotCount) {
            errors.minSelections = {
              message: t(
                'editor.multiple_hotspots.error_min_lte_hotspots',
                {
                  defaultValue:
                    'Minimum selections cannot exceed the number of hotspots.',
                },
              ),
            };
          }

          if (maxSelections > hotspotCount) {
            errors.maxSelections = {
              message: t(
                'editor.multiple_hotspots.error_max_lte_hotspots',
                {
                  defaultValue:
                    'Maximum selections cannot exceed the number of hotspots.',
                },
              ),
            };
          }
        }
      }

      if (questionType === 'short_answer') {
        const answers = (values.answers ?? []) as AnswerEntry[];
        if (!answers.length) {
          errors.answers = { message: t('common:validation.required') };
        } else {
          const hasEmptyText = answers.some(
            (a) => !(a.text && String(a.text).trim()),
          );
          if (hasEmptyText) {
            errors.answers = {
              message: t('editor.answer_text_required'),
            };
          }
        }
      }

      if (
        questionType === 'free_hand_drawing' &&
        values.enableBackgroundImage === false
      ) {
        if (!values.canvasWidth || values.canvasWidth <= 0) {
          errors.canvasWidth = {
            message: t('common:validation.min', { min: 1 }),
          };
        }

        if (!values.canvasHeight || values.canvasHeight <= 0) {
          errors.canvasHeight = {
            message: t('common:validation.min', { min: 1 }),
          };
        }
      }

      return {
        values: Object.keys(errors).length === 0 ? values : {},
        errors,
      };
    },
  });

  const {
    handleSubmit,
    watch,
    register,
    setValue,
    formState: { errors },
  } = methods;
  const questionText = watch('text');
  const questionContent = watch('content');
  const justificationMode = watch('justificationMode') ?? 'disabled';
  const justificationFraction = watch('justificationFraction') ?? 20;
  const correctAnswerFeedback = watch('correctAnswerFeedback') ?? '';
  const partiallyCorrectAnswerFeedback =
    watch('partiallyCorrectAnswerFeedback') ?? '';
  const incorrectAnswerFeedback = watch('incorrectAnswerFeedback') ?? '';
  const shouldShowJustification =
    showJustification ??
    QUESTION_TYPES_WITH_JUSTIFICATION.includes(questionType);
  const initialEditorContent = defaultValues.text ?? '';

  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState('');
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverAnchorRef = useRef<HTMLSpanElement | null>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [keyNameError, setKeyNameError] = useState<string>('');

  const escapeHtml = useCallback(
    (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    [],
  );

  const escapeAttr = useCallback(
    (value: string) => escapeHtml(value).replace(/"/g, '&quot;'),
    [escapeHtml],
  );

  const buildKeyTokenHtml = useCallback(
    (rawKey: string) => {
      const textKey = escapeHtml(rawKey);
      const attrKey = escapeAttr(rawKey);
      return `<span class="key-wrapper"><span class="fill-in-blank-key" contenteditable="false" draggable="true" data-key="${attrKey}">[[${textKey}]]</span><span class="key-actions"><button class="key-action-btn edit-icon" type="button" data-action="edit" data-key="${attrKey}"></button><button class="key-action-btn delete-icon" type="button" data-action="delete" data-key="${attrKey}"></button></span></span>&nbsp;`;
    },
    [escapeAttr, escapeHtml],
  );

  const syncEditorText = useCallback(() => {
    const latest = editorRef.current?.getContent();
    if (latest === undefined) return;
    setValue('text', latest, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  const onSubmit = (formData: QuestionFormData) => {
    const latest = editorRef.current?.getContent();
    onSave({
      ...formData,
      text: latest ?? formData.text,
    });
  };

  const getKeyToolbarButton = useCallback(() => {
    const editorContainer = editorRef.current?.getContainer();
    if (!editorContainer) {
      return null;
    }
    const expectedLabel = t('editor.fill_in_blanks.toolbar_key').trim();
    const toolbarButtons = Array.from(
      editorContainer.querySelectorAll<HTMLElement>('.tox .tox-tbtn'),
    );
    return (
      toolbarButtons.find((button) => {
        const textLabel = button.textContent?.trim() ?? '';
        const ariaLabel = button.getAttribute('aria-label')?.trim() ?? '';
        const titleLabel = button.getAttribute('title')?.trim() ?? '';
        const mceName = button.getAttribute('data-mce-name')?.trim() ?? '';
        return (
          textLabel === expectedLabel ||
          ariaLabel === expectedLabel ||
          titleLabel === expectedLabel ||
          mceName === 'key'
        );
      }) ?? null
    );
  }, [t]);

  const handleKeyDialogOpen = useCallback(() => {
    setIsKeyDialogOpen(true);
  }, []);

  const handleKeyDialogClose = useCallback(() => {
    setIsKeyDialogOpen(false);
    setKeyInputValue('');
    // Return keyboard focus to the editor body so space/enter work immediately after
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const handleKeyInsert = useCallback(() => {
    const key = keyInputValue.trim() || t('editor.fill_in_blanks.key_default');

    // highlight_correct_word: Key inserts text already marked as correct.
    if (questionType === 'highlight_correct_word') {
      const hid = crypto.randomUUID();
      const escaped = key
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const html = `<span class="highlight-wrapper" data-hid="${hid}"><span class="correct-highlight" contenteditable="false" data-phrase="${escaped}" data-hid="${hid}">${escaped}</span><button class="highlight-remove-btn" type="button" data-hid="${hid}">×</button></span>`;
      editorRef.current?.insertContent(html);
      syncEditorText();
      handleKeyDialogClose();
      return;
    }

    // Auto-populate the answer with the key value BEFORE inserting the key
    if (questionType === 'fill_in_blanks' && keyInputValue.trim()) {
      const currentGroups = watch('answerGroups') || [];
      const existingGroupIndex = currentGroups.findIndex((g) => g.key === key);

      if (existingGroupIndex >= 0) {
        const updatedGroups = [...currentGroups];
        if (updatedGroups[existingGroupIndex].answers[0]) {
          updatedGroups[existingGroupIndex].answers[0].text = key;
          setValue('answerGroups', updatedGroups);
        }
      } else {
        const newGroup = {
          key,
          answers: [
            {
              id: crypto.randomUUID(),
              text: key,
              mark: 100,
              ignoreCasing: true,
              feedback: false,
            },
          ],
        };
        setValue('answerGroups', [...currentGroups, newGroup]);
      }
    }

    const keyElement = buildKeyTokenHtml(key);
    editorRef.current?.insertContent(keyElement);
    syncEditorText();
    handleKeyDialogClose();
  }, [
    keyInputValue,
    t,
    handleKeyDialogClose,
    questionType,
    watch,
    setValue,
    syncEditorText,
    buildKeyTokenHtml,
  ]);

  const handleOpenRenameDialog = useCallback((keyName: string) => {
    setSelectedKey(keyName);
    setNewKeyName(keyName);
    setKeyNameError('');
    setRenameDialogOpen(true);
  }, []);

  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
    setSelectedKey('');
    setNewKeyName('');
    setKeyNameError('');
  }, []);

  const handleOpenDeleteDialog = useCallback((keyName: string) => {
    setSelectedKey(keyName);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedKey('');
  }, []);

  const renameKeyInEditor = useCallback(
    (currentKey: string, nextKey: string) => {
      if (!editorRef.current || !currentKey || !nextKey) return;
      const content = editorRef.current.getContent();
      const oldPattern = `[[${currentKey}]]`;
      const newPattern = `[[${nextKey}]]`;
      const updatedContent = content
        .replaceAll(`data-key="${currentKey}"`, `data-key="${nextKey}"`)
        .replaceAll(oldPattern, newPattern);
      editorRef.current.setContent(updatedContent);
      syncEditorText();
    },
    [syncEditorText],
  );

  const deleteKeyFromEditor = useCallback(
    (keyToDelete: string) => {
      if (!editorRef.current || !keyToDelete) return;
      const content = editorRef.current.getContent();
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      doc.querySelectorAll('.key-wrapper').forEach((wrapper) => {
        const keyNode = wrapper.querySelector('.fill-in-blank-key');
        const tokenText = keyNode?.textContent?.trim() ?? '';
        const tokenDataKey = keyNode?.getAttribute('data-key')?.trim() ?? '';
        const actionDataKey =
          wrapper
            .querySelector('.key-action-btn[data-key]')
            ?.getAttribute('data-key')
            ?.trim() ?? '';
        if (
          tokenText === `[[${keyToDelete}]]` ||
          tokenDataKey === keyToDelete ||
          actionDataKey === keyToDelete
        ) {
          wrapper.remove();
        }
      });

      const updatedContent = doc.body.innerHTML.replaceAll(
        `[[${keyToDelete}]]`,
        '',
      );
      editorRef.current.setContent(updatedContent);
      syncEditorText();
    },
    [syncEditorText],
  );

  const handleConfirmRename = useCallback(() => {
    if (!selectedKey || !newKeyName.trim()) return;

    const fieldName =
      questionType === 'select_correct_word'
        ? 'selectWordGroups'
        : questionType === 'drag_drop_text'
          ? 'dragDropItems'
          : 'answerGroups';
    const currentGroups = watch(fieldName) || [];
    const keyExists =
      questionType === 'drag_drop_text'
        ? currentGroups.some(
            (g) =>
              g.key.toLowerCase() === newKeyName.trim().toLowerCase() &&
              g.key !== selectedKey,
          )
        : currentGroups.some(
            (g) => g.key === newKeyName.trim() && g.key !== selectedKey,
          );

    if (keyExists) {
      setKeyNameError(t('key_exists_error'));
      return;
    }

    const trimmedKey = newKeyName.trim();
    renameKeyInEditor(selectedKey, trimmedKey);

    setValue(
      fieldName,
      currentGroups.map((g) =>
        questionType === 'drag_drop_text'
          ? g.key.toLowerCase() === selectedKey.toLowerCase()
            ? { ...g, key: trimmedKey }
            : g
          : g.key === selectedKey
            ? { ...g, key: trimmedKey }
            : g,
      ) as typeof currentGroups,
    );

    handleCloseRenameDialog();
  }, [
    selectedKey,
    newKeyName,
    watch,
    setValue,
    t,
    handleCloseRenameDialog,
    questionType,
    renameKeyInEditor,
  ]);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedKey) return;
    deleteKeyFromEditor(selectedKey);

    const fieldName =
      questionType === 'select_correct_word'
        ? 'selectWordGroups'
        : questionType === 'drag_drop_text'
          ? 'dragDropItems'
          : 'answerGroups';
    const currentGroups = watch(fieldName) || [];
    setValue(
      fieldName,
      currentGroups.filter((g) =>
        questionType === 'drag_drop_text'
          ? g.key.toLowerCase() !== selectedKey.toLowerCase()
          : g.key !== selectedKey,
      ) as typeof currentGroups,
    );

    handleCloseDeleteDialog();
  }, [
    selectedKey,
    watch,
    setValue,
    handleCloseDeleteDialog,
    questionType,
    deleteKeyFromEditor,
  ]);

  const handleKeyActionClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.key-action-btn') as HTMLElement;

      if (!button) return;

      const action = button.getAttribute('data-action');
      const keyName = button.getAttribute('data-key');

      if (!action || !keyName) return;

      event.preventDefault();
      event.stopPropagation();

      if (action === 'edit') {
        handleOpenRenameDialog(keyName);
      } else if (action === 'delete') {
        handleOpenDeleteDialog(keyName);
      }
    },
    [handleOpenRenameDialog, handleOpenDeleteDialog],
  );

  const handleHighlightActionClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.highlight-remove-btn') as HTMLElement;
      if (!button || !editorRef.current) return;

      const hid = button.getAttribute('data-hid');
      if (!hid) return;

      event.preventDefault();
      event.stopPropagation();

      const content = editorRef.current.getContent();
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const wrapper = doc.querySelector<HTMLElement>(
        `.highlight-wrapper[data-hid="${CSS.escape(hid)}"]`,
      );
      if (wrapper) {
        const text =
          wrapper.querySelector('.correct-highlight')?.textContent ?? '';
        wrapper.parentNode?.replaceChild(doc.createTextNode(text), wrapper);
        editorRef.current.setContent(doc.body.innerHTML);
        syncEditorText();
      }
    },
    [syncEditorText],
  );

  const addDragDropKey = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      const keyElement = buildKeyTokenHtml(trimmed);
      editorRef.current?.insertContent(keyElement);
      syncEditorText();
    },
    [syncEditorText, buildKeyTokenHtml],
  );

  const editorInit = useMemo(() => {
    const isKeyBased =
      questionType === 'select_correct_word' ||
      questionType === 'drag_drop_text' ||
      questionType === 'fill_in_blanks_image';
    const isHighlightBased = questionType === 'highlight_correct_word';
    const toolbar = isKeyBased
      ? `${defaultToolbar} | key`
      : isHighlightBased
        ? `${defaultToolbar} | key highlight`
        : defaultToolbar;
    const setup = isKeyBased
      ? (editor: TinyMCEEditor) => {
          editor.ui.registry.addButton('key', {
            text: t('editor.fill_in_blanks.toolbar_key'),
            onAction: handleKeyDialogOpen,
          });

          editor.on('init', () => {
            const editorBody = editor.getBody();
            editorBody.addEventListener(
              'click',
              handleKeyActionClick as EventListener,
            );
          });

          editor.on('remove', () => {
            const editorBody = editor.getBody();
            if (editorBody) {
              editorBody.removeEventListener(
                'click',
                handleKeyActionClick as EventListener,
              );
            }
          });
        }
      : isHighlightBased
        ? (editor: TinyMCEEditor) => {
            editor.ui.registry.addButton('key', {
              text: t('editor.highlight_correct_word.toolbar_key', {
                defaultValue: 'Key',
              }),
              onAction: handleKeyDialogOpen,
            });

            editor.ui.registry.addButton('highlight', {
              text: t('editor.highlight_correct_word.toolbar_highlight', {
                defaultValue: 'Highlight',
              }),
              onAction: () => {
                const selectedText = editor.selection
                  .getContent({ format: 'text' })
                  .trim();
                if (!selectedText) {
                  editor.focus();
                  return;
                }
                const hid = crypto.randomUUID();
                const escaped = selectedText
                  .replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                const html = `<span class="highlight-wrapper" data-hid="${hid}"><span class="correct-highlight" contenteditable="false" data-phrase="${escaped}" data-hid="${hid}">${escaped}</span><button class="highlight-remove-btn" type="button" data-hid="${hid}">×</button></span>`;
                editor.selection.setContent(html);
                syncEditorText();
                editor.focus();
              },
            });

            editor.on('init', () => {
              const editorBody = editor.getBody();
              editorBody.addEventListener(
                'click',
                handleHighlightActionClick as EventListener,
              );
              // Move focus into the editor iframe so toolbar buttons don't intercept Space
              editor.focus();
            });

            editor.on('remove', () => {
              const editorBody = editor.getBody();
              if (editorBody) {
                editorBody.removeEventListener(
                  'click',
                  handleHighlightActionClick as EventListener,
                );
              }
            });
          }
        : undefined;

    // Styling for draggable keys — using fixed CSS values for TinyMCE iframe
    const primaryLight = '#a5b4fc'; // indigo-300
    const primaryDark = '#4f46e5'; // indigo-600
    const primaryMain = '#6366f1'; // indigo-500
    const successMain = '#22c55e';
    const successLight = '#86efac';
    const successDark = '#15803d';
    const errorMain = '#f43f5e';
    const bgPaper = isDarkMode ? '#1e293b' : '#ffffff';
    const bgDefault = isDarkMode ? '#0f172a' : '#f8fafc';
    const textPrimary = isDarkMode ? 'rgba(248,250,252,0.95)' : 'rgba(15,23,42,0.87)';
    const textSecondary = isDarkMode ? '#94a3b8' : '#64748b';
    const divider = isDarkMode ? 'rgba(51,65,85,1)' : 'rgba(226,232,240,1)';
    const primaryAlpha02 = isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)';
    const primaryAlpha04 = isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)';
    const primaryBorder = isDarkMode ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)';
    const hoverBg = isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,0.8)';

    const keyStyles = `
      .fill-in-blank-key {
        display: inline-block;
        background-color: ${primaryAlpha02};
        color: ${isDarkMode ? primaryLight : primaryDark};
        border: 1px solid ${primaryBorder};
        border-radius: 6px;
        padding: 2px 8px;
        margin: 0 2px;
        font-weight: 500;
        font-size: 0.9em;
        cursor: move;
        user-select: none;
        transition: all 0.2s ease;
      }
      .fill-in-blank-key:hover {
        background-color: ${primaryAlpha04};
        border-color: ${primaryMain};
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(99,102,241,0.2);
      }
      .key-wrapper {
        position: relative;
        display: inline-block;
        vertical-align: middle;
      }
      .key-actions {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
        background-color: ${bgPaper};
        padding: 2px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0s linear 0.2s;
      }
      .key-wrapper:hover .key-actions,
      .key-actions:hover {
        opacity: 1;
        visibility: visible;
        transition: opacity 0.1s ease, visibility 0s linear 0s;
      }
      .key-action-btn {
        padding: 6px 10px;
        margin: 0;
        background-color: ${bgPaper};
        border: 1px solid ${divider};
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        color: ${textPrimary};
        font-family: inherit;
        -webkit-appearance: none;
        appearance: none;
      }
      .key-action-btn:hover {
        background-color: ${hoverBg};
        transform: scale(1.05);
        box-shadow: 0 2px 6px rgba(0,0,0,0.16);
      }
      .edit-icon::before {
        content: "${t('editor.fill_in_blanks.key_edit_btn')}";
      }
      .delete-icon::before {
        content: "${t('editor.fill_in_blanks.key_delete_btn')}";
      }
      .delete-icon {
        color: ${textSecondary};
      }
      .delete-icon:hover {
        color: ${errorMain};
        background-color: rgba(244,63,94,0.1);
      }
    `;

    const highlightStyles = isHighlightBased
      ? `
      .highlight-wrapper {
        position: relative;
        display: inline-block;
        vertical-align: middle;
      }
      .correct-highlight {
        display: inline-block;
        background-color: ${isDarkMode ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.12)'};
        color: ${isDarkMode ? successLight : successDark};
        border: 1px solid rgba(34,197,94,0.4);
        border-radius: 4px;
        padding: 1px 6px;
        cursor: default;
        user-select: none;
        font-weight: 500;
      }
      .highlight-remove-btn {
        position: absolute;
        top: -10px;
        right: -8px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${successMain};
        color: #ffffff;
        border: none;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 10;
        font-family: inherit;
        -webkit-appearance: none;
        appearance: none;
        font-weight: bold;
      }
      .highlight-wrapper:hover .highlight-remove-btn {
        display: flex;
      }
    `
      : '';

    const baseContentStyle = isDarkMode
      ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: ${bgDefault}; color: ${textPrimary}; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: rgba(255, 255, 255, 0.7) !important; top: 16px !important; left: 16px !important; right: 16px !important; }`
      : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { top: 16px !important; left: 16px !important; right: 16px !important; }';
    const overflowVisibleForKeys =
      isKeyBased || isHighlightBased
        ? ' body, .mce-content-body { overflow: visible !important; }'
        : '';

    const content_style = isKeyBased
      ? `${baseContentStyle}${overflowVisibleForKeys} ${keyStyles}`
      : isHighlightBased
        ? `${baseContentStyle}${overflowVisibleForKeys} ${highlightStyles}`
        : baseContentStyle;

    return {
      height: 250,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link', 'image'],
      toolbar,
      toolbar_mode: 'wrap' as const,
      statusbar: false,
      placeholder: t('question_text_placeholder'),
      content_style,
      ...(isKeyBased || isHighlightBased
        ? {
            extended_valid_elements:
              'span[class|contenteditable|draggable|data-*|title],button[class|type|data-*]',
          }
        : {}),
      ...(setup ? { setup } : {}),
    };
  }, [
    questionType,
    isDarkMode,
    i18n.language,
    t,
    handleKeyDialogOpen,
    handleKeyActionClick,
    handleHighlightActionClick,
    syncEditorText,
  ]);

  const feedbackEditorInit = useMemo(
    () => ({
      height: 200,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link'],
      toolbar: defaultToolbar,
      toolbar_mode: 'floating' as const,
      statusbar: false,
    }),
    [isDarkMode, i18n.language],
  );

  return (
    <FormProvider {...methods}>
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 relative">
          {questionType && (
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] mb-4 text-muted-foreground">
              {t(`types.${questionType}`, { defaultValue: questionType })}
            </p>
          )}
          <div className="flex flex-col gap-[28px]">
            <div className="flex gap-4 items-start flex-wrap">
              <div className="flex-1 min-w-full sm:min-w-0 flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground/75">
                  {t('question_name')}
                  <span className="ml-1 font-bold text-destructive">*</span>
                </label>
                <Input
                  {...register('name')}
                  placeholder={t('question_name')}
                  className={cn('text-base', errors.name && 'border-destructive')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>
                )}
              </div>
              <div className="w-full sm:w-36 flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground/75">
                  {t('mark')}
                  <span className="ml-1 font-bold text-destructive">*</span>
                </label>
                <Input
                  {...register('mark')}
                  type="number"
                  placeholder={t('mark')}
                  min={1}
                  step={1}
                  className={cn('text-sm', errors.mark && 'border-destructive')}
                />
                {errors.mark && (
                  <p className="text-xs text-destructive mt-0.5">{errors.mark.message}</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm mb-3 font-medium text-foreground/75">
                {questionType === 'fill_in_blanks' || questionType === 'text_classification'
                  ? t('question_instructions', {
                      defaultValue: t('question_text'),
                    })
                  : t('question_text')}
                <span className="ml-1 font-bold text-destructive">*</span>
              </p>
              <div
                ref={editorWrapperRef}
                className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))] relative"
              >
                {/* Popover anchor — positioned at top of editor wrapper */}
                <Popover open={isKeyDialogOpen} onOpenChange={(open) => { if (!open) handleKeyDialogClose(); }}>
                  <PopoverTrigger asChild>
                    <span ref={popoverAnchorRef} className="absolute top-10 left-1/2 -translate-x-1/2 w-0 h-0 overflow-hidden" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4 flex flex-col gap-3" side="bottom" align="center">
                    <Input
                      autoFocus
                      placeholder={
                        questionType === 'highlight_correct_word'
                          ? t('editor.highlight_correct_word.dialog_placeholder')
                          : questionType === 'drag_drop_text'
                            ? t('editor.drag_drop_text.dialog_placeholder')
                            : t('editor.fill_in_blanks.dialog_placeholder')
                      }
                      value={keyInputValue}
                      onChange={(e) => setKeyInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleKeyInsert();
                        }
                      }}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleKeyDialogClose}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {questionType === 'highlight_correct_word'
                          ? t('editor.highlight_correct_word.dialog_cancel_btn')
                          : t('editor.fill_in_blanks.dialog_cancel_btn')}
                      </button>
                      <button
                        type="button"
                        onClick={handleKeyInsert}
                        className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {questionType === 'highlight_correct_word'
                          ? t('editor.highlight_correct_word.dialog_insert_btn')
                          : t('editor.fill_in_blanks.dialog_insert_btn')}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js"
                  licenseKey="gpl"
                  initialValue={initialEditorContent}
                  onEditorChange={(newValue) =>
                    setValue('text', newValue, { shouldValidate: true })
                  }
                  onInit={(_evt, editor) => {
                    editorRef.current = editor;
                    if (
                      initialEditorContent &&
                      editor.getContent() !== initialEditorContent
                    ) {
                      editor.setContent(initialEditorContent);
                    }
                  }}
                  init={editorInit}
                />
              </div>
              {errors.text && (
                <p className="text-xs text-destructive mt-1">{errors.text.message}</p>
              )}
            </div>

            {questionType === 'fill_in_blanks' && (
              <FillInBlanksEditor
                layout="content"
                questionContent={questionContent}
                contentError={errors.content?.message}
              />
            )}

            {shouldShowJustification && (
              <JustificationInput
                mode={justificationMode as 'disabled' | 'optional' | 'required'}
                fraction={justificationFraction}
                onModeChange={(mode) =>
                  setValue('justificationMode', mode, { shouldValidate: true })
                }
                onFractionChange={(fraction) =>
                  setValue('justificationFraction', fraction, {
                    shouldValidate: true,
                  })
                }
              />
            )}

            <Accordion type="single" collapsible className="rounded-xl border border-border overflow-hidden">
              <AccordionItem value="feedback" className="border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Megaphone size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {t('editor.feedback_settings', {
                        defaultValue: t('editor.feedback'),
                      })}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 flex flex-col gap-4">
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground mb-2">
                      {t('editor.correct_answer_feedback')}
                    </span>
                    <div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))]">
                      <Editor
                        tinymceScriptSrc="/tinymce/tinymce.min.js"
                        licenseKey="gpl"
                        value={correctAnswerFeedback}
                        onEditorChange={(value) =>
                          setValue('correctAnswerFeedback', value, {
                            shouldValidate: true,
                          })
                        }
                        init={feedbackEditorInit}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground mb-2">
                      {t('editor.partially_correct_answer_feedback')}
                    </span>
                    <div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))]">
                      <Editor
                        tinymceScriptSrc="/tinymce/tinymce.min.js"
                        licenseKey="gpl"
                        value={partiallyCorrectAnswerFeedback}
                        onEditorChange={(value) =>
                          setValue('partiallyCorrectAnswerFeedback', value, {
                            shouldValidate: true,
                          })
                        }
                        init={feedbackEditorInit}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground mb-2">
                      {t('editor.incorrect_answer_feedback')}
                    </span>
                    <div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))]">
                      <Editor
                        tinymceScriptSrc="/tinymce/tinymce.min.js"
                        licenseKey="gpl"
                        value={incorrectAnswerFeedback}
                        onEditorChange={(value) =>
                          setValue('incorrectAnswerFeedback', value, {
                            shouldValidate: true,
                          })
                        }
                        init={feedbackEditorInit}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Question-specific components */}
            <div className="mt-6">
              {questionType === 'fill_in_blanks' && (
                <FillInBlanksEditor
                  layout="answers"
                  questionContent={questionContent}
                />
              )}
              {questionType === 'fill_in_blanks_image' && (
                <FillInBlanksImageEditor />
              )}
              {questionType === 'select_correct_word' && (
                <SelectCorrectWordEditor questionText={questionText} />
              )}
              {questionType === 'multiple_choice' && <MultipleChoiceEditor />}
              {questionType === 'essay' && <EssayEditor />}
              {questionType === 'true_false' && <TrueFalseEditor />}
              {questionType === 'short_answer' && <ShortAnswerEditor />}
              {questionType === 'text_sequencing' && <TextSequencingEditor />}
              {questionType === 'image_sequencing' && <ImageSequencingEditor />}
              {questionType === 'free_hand_drawing' && (
                <BackgroundImageSettings />
              )}
              {questionType === 'multiple_hotspots' && (
                <MultipleHotspotsEditor />
              )}
              {questionType === 'record_audio' && <RecordAudioEditor />}
              {questionType === 'numerical' && <NumericalEditor />}
              {questionType === 'highlight_correct_word' && (
                <HighlightCorrectWordEditor questionText={questionText} />
              )}
              {questionType === 'drag_drop_text' && (
                <DragDropTextEditor
                  questionText={questionText}
                  onAddKey={addDragDropKey}
                  onRenameKey={renameKeyInEditor}
                  onDeleteKey={deleteKeyFromEditor}
                />
              )}
              {questionType === 'text_classification' && (
                <TextClassificationEditor />
              )}
              {questionType === 'image_classification' && (
                <ImageClassificationEditor />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('common:profile.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('common:profile.save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Rename key dialog */}
      <DialogPrimitive.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-xl focus:outline-none">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground mb-4">
              {t('rename_key')}
            </DialogPrimitive.Title>
            <Input
              autoFocus
              value={newKeyName}
              onChange={(e) => {
                setNewKeyName(e.target.value);
                setKeyNameError('');
              }}
              className={cn('text-sm', keyNameError && 'border-destructive')}
              placeholder={t('new_key_name')}
            />
            {keyNameError && <p className="text-xs text-destructive mt-1">{keyNameError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleCloseRenameDialog}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('rename_key')}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Delete key dialog */}
      <DialogPrimitive.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-xl focus:outline-none">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground mb-4">
              {t('delete_key_title')}
            </DialogPrimitive.Title>
            <p className="text-sm text-muted-foreground">
              {t('delete_key_confirm', { key: selectedKey })}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleCloseDeleteDialog}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('delete')}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

    </FormProvider>
  );
}

function QuestionEditorShell(props: QuestionEditorShellProps) {
  if (props.questionType === 'drag_drop_image') {
    return (
      <DragDropImageWizard
        onSave={props.onSave}
        onCancel={props.onCancel}
        initialData={props.initialData}
      />
    );
  }
  if (props.questionType === 'matching') {
    return (
      <MatchingWizard
        onSave={props.onSave}
        onCancel={props.onCancel}
        initialData={props.initialData}
      />
    );
  }
  if (props.questionType === 'crossword') {
    return (
      <CrosswordWizard
        onSave={props.onSave}
        onCancel={props.onCancel}
        initialData={props.initialData}
      />
    );
  }
  return <QuestionEditorShellForm {...props} />;
}

export default memo(QuestionEditorShell);
