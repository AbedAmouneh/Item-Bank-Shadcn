export type QuestionType =
  | 'true_false'
  | 'multiple_choice'
  | 'short_answer'
  | 'essay'
  | 'drag_drop_image'
  | 'drag_drop_text'
  | 'free_hand_drawing'
  | 'image_sequencing'
  | 'multiple_hotspots'
  | 'numerical'
  | 'fill_in_blanks'
  | 'select_correct_word'
  | 'text_sequencing'
  | 'fill_in_blanks_image'
  | 'highlight_correct_word'
  | 'record_audio'
  | 'text_classification'
  | 'image_classification'
  | 'matching'
  | 'crossword';

export interface QuestionBase {
  type: QuestionType;
  name: string;
  text: string;
}

export type AnswerEntry = {
  id: string;
  text: string;
  mark: number;
  ignoreCasing: boolean;
  feedback: boolean;
};

export interface DragDropTextDraggableItem {
  id: string;
  key: string;
  answer: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
}

export interface DragDropTextGroup {
  id: string;
  name: string;
  color: string;
}

export type DragDropImageItemType = 'text' | 'image';

export interface DragDropImageZone {
  id: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
}

export interface DragDropImageItem {
  id: string;
  itemType: DragDropImageItemType;
  answer: string;
  image?: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
  zones: DragDropImageZone[];
}

export interface DragDropImageGroup {
  id: string;
  name: string;
  color: string;
}

// Text Classification types
export interface TextClassificationAnswer {
  id: string;
  text: string;
  feedback?: string;
  markPercent: number;
}

export interface TextClassificationCategory {
  id: string;
  name: string;
  color: TextClassificationColor;
  answers: TextClassificationAnswer[];
}

export type TextClassificationColor =
  | 'blue' | 'orange' | 'green' | 'red'
  | 'purple' | 'pink' | 'dark-orange' | 'cyan';

export type TextClassificationLayout = 'columns' | 'rows';

export type JustificationMode = 'disabled' | 'optional' | 'required';

export type JustificationFraction =
  | 100 | 90 | 80 | 75 | 70 | 60 | 50 | 40 | 33.3 | 30 | 25 | 20 | 15 | 10 | 5 | 0;

// Image Classification types
export interface ImageClassificationAnswer {
  id: string;
  imageUrl: string;
  feedback?: string;
  markPercent: number;
}

export interface ImageClassificationCategory {
  id: string;
  name: string;
  color: TextClassificationColor;
  answers: ImageClassificationAnswer[];
}

// Matching types
export type MatchingItemMode = 'text' | 'image';

export interface MatchingLeftItem {
  id: string;
  text: string;           // used when leftMode = 'text'
  imageUrl: string;       // base64 dataURL, used when leftMode = 'image'
  multipleAnswers: boolean; // per-item toggle: this left item can link to >1 right item
  linkedRightIds: string[]; // correct right item id(s)
  markPercent: number;    // used when autoDistribute = false; sum across all left items must = 100
}

export interface MatchingRightItem {
  id: string;
  text: string;           // used when rightMode = 'text'
  imageUrl: string;       // base64 dataURL, used when rightMode = 'image'
}

// Crossword types
export interface CrosswordWord {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
  clueNumber: number;
}

export interface CrosswordQuestionContent {
  words: CrosswordWord[];
  gridLayout: 'ltr' | 'rtl';
  hintMode: 'none' | 'count' | 'percentage';
  hintValue: number;
}

/**
 * Flat content bag grouping all settings for a matching question.
 * Useful as a portable shape for API payloads and storage layers.
 */
export interface MatchingQuestionContent {
  leftMode: MatchingItemMode;
  rightMode: MatchingItemMode;
  leftItems: MatchingLeftItem[];
  rightItems: MatchingRightItem[];
  reuseRightItems: boolean;
  penaltyPercent: number;
  autoDistributeMarks: boolean;
  justificationMode: JustificationMode;
  justificationFraction: number;
}
