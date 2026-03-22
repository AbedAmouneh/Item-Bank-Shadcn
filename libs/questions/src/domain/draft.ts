import { QuestionType, DragDropTextDraggableItem, DragDropTextGroup, TextClassificationCategory, TextClassificationLayout, JustificationMode, JustificationFraction, ImageClassificationCategory, MatchingLeftItem, MatchingRightItem, MatchingItemMode, CrosswordWord } from './types';

export interface QuestionDraftBase {
  type: QuestionType;
  name?: string;
  text?: string;
  mark?: number;
  isDirty?: boolean;
}

export interface TrueFalseQuestionDraft extends QuestionDraftBase {
  type: 'true_false';
  correctAnswer?: boolean;
}

export interface MultipleChoiceQuestionDraft extends QuestionDraftBase {
  type: 'multiple_choice';
  options?: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  allowMultiple?: boolean;
}

export interface ShortAnswerQuestionDraft extends QuestionDraftBase {
  type: 'short_answer';
  acceptedAnswers?: string[];
}

export interface EssayQuestionDraft extends QuestionDraftBase {
  type: 'essay';
  responseFormat?: 'html' | 'html_with_file_picker' | 'plain_text';
  minLimit?: number | '';
  maxLimit?: number | '';
  allowAttachments?: boolean;
  numberOfAttachments?: number;
  requiredAttachments?: boolean;
  maxFileSize?: string;
  attachmentsFormat?: string[];
}

export interface DragDropImageQuestionDraft extends QuestionDraftBase {
  type: 'drag_drop_image';
  imageUrl?: string;
  localMediaUrl?: string;
  draggableItems?: Array<{ id: string; label: string }>;
  dropZones?: Array<{ id: string; x: number; y: number; correctItemIds: string[] }>;
}

export interface DragDropTextQuestionDraft extends QuestionDraftBase {
  type: 'drag_drop_text';
  dragDropItems?: DragDropTextDraggableItem[];
  groups?: DragDropTextGroup[];
}

export interface FreeHandDrawingQuestionDraft extends QuestionDraftBase {
  type: 'free_hand_drawing';
  canvasWidth?: number;
  canvasHeight?: number;
  background_image: string | null
}

export interface ImageSequencingQuestionDraft extends QuestionDraftBase {
  type: 'image_sequencing';
  items?: Array<{ id: string; imageUrl: string; localMediaUrl?: string; correctOrder: number }>;
}

export interface MultipleHotspotsQuestionDraft extends QuestionDraftBase {
  type: 'multiple_hotspots';
  imageUrl?: string;
  localMediaUrl?: string;
  hotspots?: Array<{ id: string; x: number; y: number; width: number; height: number }>;
}

export interface NumericalQuestionDraft extends QuestionDraftBase {
  type: 'numerical';
  correctAnswer?: number;
  tolerance?: number;
  unit?: string;
}

export interface FillInBlanksQuestionDraft extends QuestionDraftBase {
  type: 'fill_in_blanks';
  textWithBlanks?: string;
  blanks?: Array<{ id: string; acceptedAnswers: string[] }>;
}

export interface SelectCorrectWordQuestionDraft extends QuestionDraftBase {
  type: 'select_correct_word';
  words?: Array<{ id: string; text: string; isCorrect: boolean }>;
}

export interface TextSequencingQuestionDraft extends QuestionDraftBase {
  type: 'text_sequencing';
  items?: Array<{ id: string; text: string; correctOrder: number }>;
}

export interface FillInBlanksImageQuestionDraft extends QuestionDraftBase {
  type: 'fill_in_blanks_image';
  imageUrl?: string;
  localMediaUrl?: string;
  blanks?: Array<{ id: string; x: number; y: number; acceptedAnswers: string[] }>;
}

export interface HighlightCorrectWordQuestionDraft extends QuestionDraftBase {
  type: 'highlight_correct_word';
  text?: string;
  correctRanges?: Array<{ start: number; end: number }>;
}

export interface RecordAudioQuestionDraft extends QuestionDraftBase {
  type: 'record_audio';
  maxDurationSeconds?: number;
}

export interface TextClassificationQuestionDraft extends QuestionDraftBase {
  type: 'text_classification';
  categories?: TextClassificationCategory[];
  layout?: TextClassificationLayout;
  autoDistribute?: boolean;
  justification?: JustificationMode;
  justificationFraction?: JustificationFraction;
}

export interface ImageClassificationQuestionDraft extends QuestionDraftBase {
  type: 'image_classification';
  categories?: ImageClassificationCategory[];
  layout?: TextClassificationLayout;
  autoDistribute?: boolean;
  justification?: JustificationMode;
  justificationFraction?: JustificationFraction;
}

export interface MatchingQuestionDraft extends QuestionDraftBase {
  type: 'matching';
  leftItems?: MatchingLeftItem[];
  rightItems?: MatchingRightItem[];
  leftMode?: MatchingItemMode;
  rightMode?: MatchingItemMode;
  allowRightItemReuse?: boolean;
  autoDistribute?: boolean;
  penaltyPerWrongPair?: number;
  justification?: JustificationMode;
  justificationFraction?: JustificationFraction;
}

export interface CrosswordQuestionDraft extends QuestionDraftBase {
  type: 'crossword';
  words?: CrosswordWord[];
  gridLayout?: 'ltr' | 'rtl';
  hintMode?: 'none' | 'count' | 'percentage';
  hintValue?: number;
}

export type QuestionDraft =
  | TrueFalseQuestionDraft
  | MultipleChoiceQuestionDraft
  | ShortAnswerQuestionDraft
  | EssayQuestionDraft
  | DragDropImageQuestionDraft
  | DragDropTextQuestionDraft
  | FreeHandDrawingQuestionDraft
  | ImageSequencingQuestionDraft
  | MultipleHotspotsQuestionDraft
  | NumericalQuestionDraft
  | FillInBlanksQuestionDraft
  | SelectCorrectWordQuestionDraft
  | TextSequencingQuestionDraft
  | FillInBlanksImageQuestionDraft
  | HighlightCorrectWordQuestionDraft
  | RecordAudioQuestionDraft
  | TextClassificationQuestionDraft
  | ImageClassificationQuestionDraft
  | MatchingQuestionDraft
  | CrosswordQuestionDraft;
