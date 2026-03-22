import type { QuestionType } from '../domain/types';

/**
 * Ordered list of question types shown in the Add Question modal.
 * Add new types here as their editors become available.
 */
export const PICKER_QUESTION_TYPES: QuestionType[] = [
  'true_false',
  'multiple_choice',
  'short_answer',
  'essay',
  'drag_drop_text',
  'drag_drop_image',
  'free_hand_drawing',
  'image_sequencing',
  'multiple_hotspots',
  'numerical',
  'fill_in_blanks',
  'select_correct_word',
  'text_sequencing',
  'fill_in_blanks_image',
  'highlight_correct_word',
  'record_audio',
  'text_classification',
  'image_classification',
  'matching',
  'crossword',
];
