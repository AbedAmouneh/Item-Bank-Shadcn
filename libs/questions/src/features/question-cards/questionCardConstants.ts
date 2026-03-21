import type { QuestionType } from '../../domain/types';

export type QuestionStatus = 'Draft' | 'Published' | 'In Review';

/** Tailwind colour classes keyed by question type — shared by card and table views. */
export const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  short_answer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  essay: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  true_false: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  fill_in_blanks: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  record_audio: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  drag_drop_image: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  drag_drop_text: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  free_hand_drawing: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  image_sequencing: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  multiple_hotspots: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  numerical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  select_correct_word: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  text_sequencing: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  fill_in_blanks_image: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  highlight_correct_word: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  text_classification: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  image_classification: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  matching: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

/** Tailwind colour classes keyed by question status. */
export const STATUS_COLORS: Record<QuestionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};
