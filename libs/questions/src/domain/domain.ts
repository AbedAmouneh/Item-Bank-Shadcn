import {
  QuestionBase,
  DragDropTextDraggableItem,
  DragDropTextGroup,
  TextClassificationCategory,
  TextClassificationLayout,
  JustificationMode,
  JustificationFraction,
  ImageClassificationCategory,
  MatchingLeftItem,
  MatchingRightItem,
  MatchingItemMode,
  CrosswordWord,
} from './types';

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
  correctAnswer: boolean;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  allowMultiple: boolean;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'short_answer';
  acceptedAnswers: string[];
}

export interface EssayQuestion extends QuestionBase {
  type: 'essay';
}

export interface DragDropImageQuestion extends QuestionBase {
  type: 'drag_drop_image';
  imageUrl: string;
  draggableItems: Array<{ id: string; label: string }>;
  dropZones: Array<{ id: string; x: number; y: number; correctItemIds: string[] }>;
}

export interface DragDropTextQuestion extends QuestionBase {
  type: 'drag_drop_text';
  dragDropItems: DragDropTextDraggableItem[];
  groups: DragDropTextGroup[];
}

export interface FreeHandDrawingQuestion extends QuestionBase {
  type: 'free_hand_drawing';
  canvasWidth: number;
  canvasHeight: number;
  background_image: string | null
}

export interface ImageSequencingQuestion extends QuestionBase {
  type: 'image_sequencing';
  items: Array<{ id: string; imageUrl: string; correctOrder: number }>;
}

export interface MultipleHotspotsQuestion extends QuestionBase {
  type: 'multiple_hotspots';
  imageUrl: string;
  hotspots: Array<{ id: string; x: number; y: number; width: number; height: number }>;
}

export interface NumericalAnswerEntry {
  id: string;
  answer: number;
  error: number;
  mark: number;
  feedback: boolean;
}

export interface NumericalQuestion extends QuestionBase {
  type: 'numerical';
  answers: NumericalAnswerEntry[];
}

export interface FillInBlanksQuestion extends QuestionBase {
  type: 'fill_in_blanks';
  textWithBlanks: string;
  blanks: Array<{ id: string; acceptedAnswers: string[] }>;
}

export interface SelectCorrectWordQuestion extends QuestionBase {
  type: 'select_correct_word';
  words: Array<{ id: string; text: string; isCorrect: boolean }>;
}

export interface TextSequencingQuestion extends QuestionBase {
  type: 'text_sequencing';
  items: Array<{ id: string; text: string; correctOrder: number }>;
}

export interface FillInBlanksImageQuestion extends QuestionBase {
  type: 'fill_in_blanks_image';
  imageUrl: string;
  blanks: Array<{ id: string; x: number; y: number; acceptedAnswers: string[] }>;
}

export interface HighlightCorrectWordQuestion extends QuestionBase {
  type: 'highlight_correct_word';
  text: string;
  correctRanges: Array<{ start: number; end: number }>;
}

export interface RecordAudioQuestion extends QuestionBase {
  type: 'record_audio';
  maxDurationSeconds: number;
}

export interface TextClassificationQuestion extends QuestionBase {
  type: 'text_classification';
  categories: TextClassificationCategory[];
  layout: TextClassificationLayout;
  autoDistribute: boolean;
  justification: JustificationMode;
  justificationFraction: JustificationFraction;
  correctFeedback?: string;
  partialFeedback?: string;
  incorrectFeedback?: string;
}

export interface ImageClassificationQuestion extends QuestionBase {
  type: 'image_classification';
  categories: ImageClassificationCategory[];
  layout: TextClassificationLayout;
  autoDistribute: boolean;
  justification: JustificationMode;
  justificationFraction: JustificationFraction;
  feedbackSettings: {
    correctFeedback?: string;
    incorrectFeedback?: string;
    partialFeedback?: string;
  };
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  leftItems: MatchingLeftItem[];
  rightItems: MatchingRightItem[];
  leftMode: MatchingItemMode;
  rightMode: MatchingItemMode;
  allowRightItemReuse: boolean;
  autoDistribute: boolean;
  penaltyPerWrongPair: number;
  justification: JustificationMode;
  justificationFraction: JustificationFraction;
  correctFeedback?: string;
  partialFeedback?: string;
  incorrectFeedback?: string;
}

export interface CrosswordQuestion extends QuestionBase {
  type: 'crossword';
  words: CrosswordWord[];
  gridLayout: 'ltr' | 'rtl';
  hintMode: 'none' | 'count' | 'percentage';
  hintValue: number;
}

export type QuestionDomain =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | DragDropImageQuestion
  | DragDropTextQuestion
  | FreeHandDrawingQuestion
  | ImageSequencingQuestion
  | MultipleHotspotsQuestion
  | NumericalQuestion
  | FillInBlanksQuestion
  | SelectCorrectWordQuestion
  | TextSequencingQuestion
  | FillInBlanksImageQuestion
  | HighlightCorrectWordQuestion
  | RecordAudioQuestion
  | TextClassificationQuestion
  | ImageClassificationQuestion
  | MatchingQuestion
  | CrosswordQuestion;
