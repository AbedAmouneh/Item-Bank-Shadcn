import type { QuestionFormData } from '@item-bank/questions';
import type { CreateQuestionData } from '@item-bank/api';

import { createStoredQuestion } from './questionFactory';

/**
 * Fields produced by createBaseQuestionData that belong to the API envelope,
 * not the type-specific content blob.
 */
const BASE_KEYS = new Set([
  'id',
  'name',
  'type',
  'text',
  'mark',
  'status',
  'lastModified',
  'correctAnswerFeedback',
  'partiallyCorrectAnswerFeedback',
  'incorrectAnswerFeedback',
]);

/**
 * Convert QuestionFormData to the CreateQuestionData payload expected by the API.
 *
 * Reuses the existing createStoredQuestion factory for per-type serialization,
 * then strips the base envelope fields so only type-specific data goes into content.
 *
 * Returns null when createStoredQuestion returns null (validation failure for the
 * given type), matching the existing behaviour of keeping the editor open.
 */
export function formDataToApiPayload(formData: QuestionFormData): CreateQuestionData | null {
  if (formData.type === 'spelling_dictation') {
    return {
      name: formData.name,
      type: 'spelling_dictation',
      text: '',
      mark: formData.mark ?? 10,
      content: {
        audioUrl: formData.spellingAudioUrl ?? null,
        audioName: formData.spellingAudioName ?? null,
        correctAnswers: formData.spellingCorrectAnswers ?? [],
        hint: formData.spellingHint ?? '',
      },
    };
  }

  // Crossword does not go through the StoredQuestion factory — build the
  // content blob directly from the flat wizard fields.
  if (formData.type === 'crossword') {
    return {
      name: formData.name,
      type: formData.type,
      text: formData.text,
      mark: Number(formData.mark),
      content: {
        words: formData.crosswordWords,
        gridLayout: formData.crosswordGridLayout,
        hintMode: formData.crosswordHintMode,
        hintValue: formData.crosswordHintValue,
      },
    };
  }

  const stored = createStoredQuestion(formData);
  if (!stored) return null;

  const content: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!BASE_KEYS.has(key)) {
      content[key] = value;
    }
  }

  return {
    name: formData.name,
    type: formData.type,
    text: formData.text,
    mark: Number(formData.mark),
    content,
  };
}
