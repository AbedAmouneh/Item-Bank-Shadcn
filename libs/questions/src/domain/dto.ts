export interface QuestionDTOBase {
  id?: string;
  type: string;
  name: string;
  text: string;
  mark: number;
}

export interface TrueFalseQuestionDTO extends QuestionDTOBase {
  type: 'true_false';
  correct_answer: boolean;
}

export interface MultipleChoiceQuestionDTO extends QuestionDTOBase {
  type: 'multiple_choice';
  options: Array<{ id: string; text: string }>;
  correct_option_ids: string[];
  allow_multiple: boolean;
}

export interface ShortAnswerQuestionDTO extends QuestionDTOBase {
  type: 'short_answer';
  accepted_answers: string[];
}

export interface EssayQuestionDTO extends QuestionDTOBase {
  type: 'essay';
}

export interface DragDropImageQuestionDTO extends QuestionDTOBase {
  type: 'drag_drop_image';
  image_url: string;
  draggable_items: Array<{ id: string; label: string }>;
  drop_zones: Array<{ id: string; x: number; y: number; correct_item_ids: string[] }>;
}

export interface DragDropTextDraggableItemDTO {
  id: string;
  key: string;
  answer: string;
  group_id: string;
  mark_percent: number;
  unlimited_reuse: boolean;
}

export interface DragDropTextGroupDTO {
  id: string;
  name: string;
  color: string;
}

export interface DragDropTextQuestionDTO extends QuestionDTOBase {
  type: 'drag_drop_text';
  drag_drop_items: DragDropTextDraggableItemDTO[];
  groups: DragDropTextGroupDTO[];
}

export interface FreeHandDrawingQuestionDTO extends QuestionDTOBase {
  type: 'free_hand_drawing';
  canvas_width: number;
  canvas_height: number;
  background_image: string | null
}

export interface ImageSequencingQuestionDTO extends QuestionDTOBase {
  type: 'image_sequencing';
  items: Array<{ id: string; image_url: string; correct_order: number }>;
}

export interface MultipleHotspotsQuestionDTO extends QuestionDTOBase {
  type: 'multiple_hotspots';
  image_url: string;
  hotspots: Array<{ id: string; x: number; y: number; width: number; height: number }>;
}

export interface NumericalAnswerEntryDTO {
  id: string;
  answer: number;
  error: number;
  mark: number;
  feedback: boolean;
}

export interface NumericalQuestionDTO extends QuestionDTOBase {
  type: 'numerical';
  answers: NumericalAnswerEntryDTO[];
}

export interface FillInBlanksQuestionDTO extends QuestionDTOBase {
  type: 'fill_in_blanks';
  text_with_blanks: string;
  blanks: Array<{ id: string; accepted_answers: string[] }>;
}

export interface SelectCorrectWordQuestionDTO extends QuestionDTOBase {
  type: 'select_correct_word';
  words: Array<{ id: string; text: string; is_correct: boolean }>;
}

export interface TextSequencingQuestionDTO extends QuestionDTOBase {
  type: 'text_sequencing';
  items: Array<{ id: string; text: string; correct_order: number }>;
}

export interface FillInBlanksImageQuestionDTO extends QuestionDTOBase {
  type: 'fill_in_blanks_image';
  image_url: string;
  blanks: Array<{ id: string; x: number; y: number; accepted_answers: string[] }>;
}

export interface HighlightCorrectWordQuestionDTO extends QuestionDTOBase {
  type: 'highlight_correct_word';
  text: string;
  correct_ranges: Array<{ start: number; end: number }>;
}

export interface RecordAudioQuestionDTO extends QuestionDTOBase {
  type: 'record_audio';
  max_duration_seconds: number;
}

export interface MatchingLeftItemDTO {
  id: string;
  text: string;
  image_url: string;
  multiple_answers: boolean;
  linked_right_ids: string[];
  mark_percent: number;
}

export interface MatchingRightItemDTO {
  id: string;
  text: string;
  image_url: string;
}

export interface MatchingQuestionDTO extends QuestionDTOBase {
  type: 'matching';
  left_items: MatchingLeftItemDTO[];
  right_items: MatchingRightItemDTO[];
  left_mode: 'text' | 'image';
  right_mode: 'text' | 'image';
  allow_right_item_reuse: boolean;
  auto_distribute: boolean;
  penalty_per_wrong_pair: number;
  justification: 'disabled' | 'optional' | 'required';
  justification_fraction: number;
  correct_feedback?: string;
  partial_feedback?: string;
  incorrect_feedback?: string;
}

export interface CrosswordWordDTO {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
  clue_number: number;
}

export interface CrosswordQuestionDTO extends QuestionDTOBase {
  type: 'crossword';
  words: CrosswordWordDTO[];
  grid_layout: 'ltr' | 'rtl';
  hint_mode: 'none' | 'count' | 'percentage';
  hint_value: number;
}

export type QuestionDTO =
  | TrueFalseQuestionDTO
  | MultipleChoiceQuestionDTO
  | ShortAnswerQuestionDTO
  | EssayQuestionDTO
  | DragDropImageQuestionDTO
  | DragDropTextQuestionDTO
  | FreeHandDrawingQuestionDTO
  | ImageSequencingQuestionDTO
  | MultipleHotspotsQuestionDTO
  | NumericalQuestionDTO
  | FillInBlanksQuestionDTO
  | SelectCorrectWordQuestionDTO
  | TextSequencingQuestionDTO
  | FillInBlanksImageQuestionDTO
  | HighlightCorrectWordQuestionDTO
  | RecordAudioQuestionDTO
  | MatchingQuestionDTO
  | CrosswordQuestionDTO;
