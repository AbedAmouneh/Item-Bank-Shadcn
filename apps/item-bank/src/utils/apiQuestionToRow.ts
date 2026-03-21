/**
 * apiQuestionToRow.ts
 *
 * Converts an API Question (returned by GET /questions/:id) to a QuestionRow
 * suitable for rendering with QuestionViewShell.
 *
 * This mirrors storedToRow in questionConverters.ts but reads from the
 * content: Record<string, unknown> field that the REST API stores instead
 * of the flat IndexedDB shape.
 */

import type { QuestionRow, QuestionChoice } from '@item-bank/questions';
import type { Question } from '@item-bank/api';
import { normalizeStatus, formatLastModified } from './questionUtils';

type Content = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Safe content-field readers
// ---------------------------------------------------------------------------

function s(c: Content, key: string, fallback = ''): string {
  const v = c[key];
  return typeof v === 'string' ? v : fallback;
}

function n(c: Content, key: string, fallback = 0): number {
  const v = c[key];
  return typeof v === 'number' ? v : fallback;
}

function b(c: Content, key: string, fallback = false): boolean {
  const v = c[key];
  return typeof v === 'boolean' ? v : fallback;
}

function a<T>(c: Content, key: string): T[] {
  const v = c[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

// ---------------------------------------------------------------------------
// Base fields shared by every question type
// ---------------------------------------------------------------------------

function base(q: Question): Pick<QuestionRow, 'id' | 'questionName' | 'mark' | 'status' | 'lastModified'> {
  return {
    id: q.id,
    questionName: q.name,
    mark: Number(q.mark ?? 0),
    status: normalizeStatus(q.status),
    lastModified: q.updated_at ? formatLastModified(q.updated_at) : '',
  };
}

// ---------------------------------------------------------------------------
// Per-type converters
// ---------------------------------------------------------------------------

function trueFalseToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'true_false',
    question_text: q.text ?? '',
    correct_choice: b(q.content, 'correct_answer'),
  };
}

function shortAnswerToRow(q: Question): QuestionRow {
  const choices: QuestionChoice[] = a<Content>(q.content, 'answers').map((ans, i) => ({
    id: i,
    answer: s(ans, 'text'),
    fraction: String(n(ans, 'mark', 100) / 100),
    feedback: null,
    ignore_casing: b(ans, 'ignore_casing', true),
  }));
  return {
    ...base(q),
    type: 'short_answer',
    question_text: q.text ?? '',
    choices,
  };
}

function multipleChoiceToRow(q: Question): QuestionRow {
  const choices: QuestionChoice[] = a<Content>(q.content, 'choices').map((c, i) => ({
    id: i,
    answer: s(c, 'text'),
    fraction: b(c, 'isCorrect') ? '1' : '0',
    feedback: b(c, 'feedbackEnabled') ? s(c, 'feedbackText') : null,
    ignore_casing: false,
  }));
  return {
    ...base(q),
    type: 'multiple_choice',
    question_text: q.text ?? '',
    choices,
    minSelections: n(q.content, 'minSelections', 1),
    maxSelections: n(q.content, 'maxSelections', 1),
    multipleChoiceAllowPartialCredit: b(q.content, 'allowPartialCredit'),
  };
}

function essayToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'essay',
    question_text: q.text ?? '',
    choices: [],
    essayResponseFormat: s(q.content, 'responseFormat', 'html') as QuestionRow['essayResponseFormat'],
  };
}

function numericalToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'numerical',
    question_text: q.text ?? '',
    choices: [],
    numericalAnswers: a<Content>(q.content, 'answers').map((ans) => ({
      id: s(ans, 'id', crypto.randomUUID()),
      answer: n(ans, 'answer'),
      error: n(ans, 'error'),
      mark: n(ans, 'mark', 100),
      feedback: b(ans, 'feedback'),
    })),
    numericalUnitHandling: s(q.content, 'unitHandling', 'disabled') as QuestionRow['numericalUnitHandling'],
    numericalUnitInputMethod: s(q.content, 'unitInputMethod', 'text_input') as QuestionRow['numericalUnitInputMethod'],
    numericalUnitPenalty: n(q.content, 'unitPenalty', 0),
    numericalUnits: a<Content>(q.content, 'units').map((u) => ({
      id: s(u, 'id', crypto.randomUUID()),
      unit: s(u, 'unit'),
      multiplier: n(u, 'multiplier', 1),
    })),
  };
}

function highlightCorrectWordToRow(q: Question): QuestionRow {
  const phrases = a<string>(q.content, 'correctPhrases');
  const choices: QuestionChoice[] = phrases.map((phrase, i) => ({
    id: i,
    answer: phrase,
    fraction: '1',
    feedback: null,
    ignore_casing: false,
  }));
  return {
    ...base(q),
    type: 'highlight_correct_word',
    question_text: q.text ?? '',
    choices,
    highlightPenaltyPercent: n(q.content, 'penaltyPercent', 25),
  };
}

function selectCorrectWordToRow(q: Question): QuestionRow {
  let idCounter = 0;
  const choices: QuestionChoice[] = a<Content>(q.content, 'groups').flatMap((group) =>
    a<Content>(group, 'options').map((opt) => ({
      id: idCounter++,
      answer: `[${s(group, 'key')}] ${s(opt, 'text')}`,
      fraction: b(opt, 'isCorrect') ? '1' : '0',
      feedback: null,
      ignore_casing: false,
    }))
  );
  return {
    ...base(q),
    type: 'select_correct_word',
    question_text: q.text ?? '',
    choices,
    selectWordAllowPartialCredit: b(q.content, 'allowPartialCredit'),
  };
}

function textSequencingToRow(q: Question): QuestionRow {
  const choices: QuestionChoice[] = a<Content>(q.content, 'items')
    .slice()
    .sort((x, y) => n(x, 'canonicalOrder') - n(y, 'canonicalOrder'))
    .map((item) => ({
      id: n(item, 'canonicalOrder'),
      answer: s(item, 'text'),
      fraction: String(n(item, 'markPercent')),
      feedback: null,
      ignore_casing: false,
    }));
  return {
    ...base(q),
    type: 'text_sequencing',
    question_text: q.text ?? '',
    choices,
    sequencingAllowPartialCredit: b(q.content, 'allowPartialCredit'),
  };
}

function imageSequencingToRow(q: Question): QuestionRow {
  const choices: QuestionChoice[] = a<Content>(q.content, 'items')
    .slice()
    .sort((x, y) => n(x, 'canonicalOrder') - n(y, 'canonicalOrder'))
    .map((item) => ({
      id: n(item, 'canonicalOrder'),
      answer: s(item, 'image'),
      fraction: String(n(item, 'markPercent')),
      feedback: null,
      ignore_casing: false,
    }));
  return {
    ...base(q),
    type: 'image_sequencing',
    question_text: q.text ?? '',
    choices,
  };
}

function freeHandDrawingToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'free_hand_drawing',
    question_text: q.text ?? '',
    choices: [],
    canvas_width: n(q.content, 'canvas_width', 800),
    canvas_height: n(q.content, 'canvas_height', 600),
    background_image: s(q.content, 'background_image') || null,
  };
}

function recordAudioToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'record_audio',
    question_text: q.text ?? '',
    choices: [],
    numberOfRecordingsMin: n(q.content, 'numberOfRecordingsMin', 1),
    numberOfRecordingsMax: n(q.content, 'numberOfRecordingsMax', 1),
    recordingDurationMinSeconds: n(q.content, 'recordingDurationMinSeconds', 10),
    recordingDurationMaxSeconds: n(q.content, 'recordingDurationMaxSeconds', 30),
  };
}

function multipleHotspotsToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'multiple_hotspots',
    question_text: q.text ?? '',
    choices: [],
    background_image: s(q.content, 'background_image') || null,
    hotspots: a<Content>(q.content, 'hotspots').map((h) => ({
      type: s(h, 'type') as 'rectangle' | 'circle' | 'polygon',
      x: n(h, 'x'),
      y: n(h, 'y'),
      width: n(h, 'width') || undefined,
      height: n(h, 'height') || undefined,
      radius: n(h, 'radius') || undefined,
      points: a<number>(h, 'points'),
      color: s(h, 'color', '#6366F1'),
      strokeWidth: n(h, 'strokeWidth', 2),
      isCorrect: b(h, 'isCorrect'),
      mark: n(h, 'mark') || undefined,
    })),
    minSelections: n(q.content, 'minSelections', 1),
    maxSelections: n(q.content, 'maxSelections', 1),
    hotspotsAllowPartialCredit: b(q.content, 'allowPartialCredit'),
  };
}

function dragDropTextToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'drag_drop_text',
    question_text: q.text ?? '',
    choices: [],
    dragDropItems: a<Content>(q.content, 'dragDropItems').map((item) => ({
      id: s(item, 'id', crypto.randomUUID()),
      key: s(item, 'key'),
      answer: s(item, 'answer'),
      groupId: s(item, 'groupId'),
      markPercent: n(item, 'markPercent'),
      unlimitedReuse: b(item, 'unlimitedReuse'),
    })),
    dragDropGroups: a<Content>(q.content, 'dragDropGroups').map((g) => ({
      id: s(g, 'id', crypto.randomUUID()),
      name: s(g, 'name'),
      color: s(g, 'color'),
    })),
  };
}

function dragDropImageToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'drag_drop_image',
    question_text: q.text ?? '',
    choices: [],
    background_image: s(q.content, 'background_image') || null,
    dragDropImageItems: a<Content>(q.content, 'dragDropImageItems').map((item) => ({
      id: s(item, 'id', crypto.randomUUID()),
      itemType: s(item, 'itemType', 'text') as 'text' | 'image',
      answer: s(item, 'answer'),
      image: s(item, 'image') || undefined,
      groupId: s(item, 'groupId'),
      markPercent: n(item, 'markPercent'),
      unlimitedReuse: b(item, 'unlimitedReuse'),
      zones: a<Content>(item, 'zones').map((z) => ({
        id: s(z, 'id', crypto.randomUUID()),
        left: n(z, 'left'),
        top: n(z, 'top'),
        width: n(z, 'width', 80),
        height: n(z, 'height', 36),
      })),
    })),
    dragDropImageGroups: a<Content>(q.content, 'dragDropImageGroups').map((g) => ({
      id: s(g, 'id', crypto.randomUUID()),
      name: s(g, 'name'),
      color: s(g, 'color'),
    })),
    justificationMode: s(q.content, 'justificationMode', 'disabled') as QuestionRow['justificationMode'],
    justificationFraction: n(q.content, 'justificationFraction', 20),
  };
}

function fillInBlanksImageToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'fill_in_blanks_image',
    question_text: q.text ?? '',
    choices: [],
    background_image: s(q.content, 'background_image') || null,
    inputAreas: a<Content>(q.content, 'inputAreas').map((area) => ({
      id: s(area, 'id', crypto.randomUUID()),
      x: n(area, 'x'),
      y: n(area, 'y'),
      width: n(area, 'width', 140),
      height: n(area, 'height', 36),
      answers: a<Content>(area, 'answers').map((ans) => ({
        id: s(ans, 'id', crypto.randomUUID()),
        text: s(ans, 'text'),
        mark: n(ans, 'mark', 100),
        ignoreCasing: b(ans, 'ignoreCasing', true),
      })),
    })),
  };
}

function textClassificationToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'text_classification',
    question_text: q.text ?? '',
    choices: [],
    textClassificationCategories: a<Content>(q.content, 'categories').map((cat) => ({
      id: s(cat, 'id', crypto.randomUUID()),
      name: s(cat, 'name'),
      color: s(cat, 'color'),
      answers: a<Content>(cat, 'answers').map((ans) => ({
        id: s(ans, 'id', crypto.randomUUID()),
        text: s(ans, 'text'),
        feedback: s(ans, 'feedback') || undefined,
        markPercent: n(ans, 'markPercent'),
      })),
    })),
    textClassificationLayout: s(q.content, 'layout', 'columns') as QuestionRow['textClassificationLayout'],
    textClassificationJustification: s(q.content, 'justification', 'disabled') as QuestionRow['textClassificationJustification'],
    textClassificationJustificationFraction: n(q.content, 'justificationFraction', 30),
  };
}

function imageClassificationToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'image_classification',
    question_text: q.text ?? '',
    choices: [],
    imageClassificationCategories: a<Content>(q.content, 'categories').map((cat) => ({
      id: s(cat, 'id', crypto.randomUUID()),
      name: s(cat, 'name'),
      color: s(cat, 'color', 'blue'),
      answers: a<Content>(cat, 'answers').map((ans) => ({
        id: s(ans, 'id', crypto.randomUUID()),
        imageUrl: s(ans, 'imageUrl'),
        feedback: s(ans, 'feedback') || undefined,
        markPercent: n(ans, 'markPercent'),
      })),
    })),
    textClassificationLayout: s(q.content, 'layout', 'columns') as QuestionRow['textClassificationLayout'],
    textClassificationJustification: s(q.content, 'justification', 'disabled') as QuestionRow['textClassificationJustification'],
    textClassificationJustificationFraction: n(q.content, 'justificationFraction', 30),
  };
}

function matchingToRow(q: Question): QuestionRow {
  return {
    ...base(q),
    type: 'matching',
    question_text: q.text ?? '',
    choices: [],
    matchingLeftItems: a<Content>(q.content, 'leftItems').map((item) => ({
      id: s(item, 'id', crypto.randomUUID()),
      text: s(item, 'text'),
      imageUrl: s(item, 'imageUrl'),
      multipleAnswers: b(item, 'multipleAnswers'),
      linkedRightIds: a<string>(item, 'linkedRightIds'),
      markPercent: n(item, 'markPercent'),
    })),
    matchingRightItems: a<Content>(q.content, 'rightItems').map((item) => ({
      id: s(item, 'id', crypto.randomUUID()),
      text: s(item, 'text'),
      imageUrl: s(item, 'imageUrl'),
    })),
    matchingLeftMode: s(q.content, 'leftMode', 'text') as QuestionRow['matchingLeftMode'],
    matchingRightMode: s(q.content, 'rightMode', 'text') as QuestionRow['matchingRightMode'],
    matchingJustification: s(q.content, 'justification', 'disabled') as QuestionRow['matchingJustification'],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an API Question to the QuestionRow shape expected by QuestionViewShell.
 *
 * Returns null for unrecognised types so the caller can render a graceful
 * "unsupported" fallback rather than crashing.
 */
export function apiQuestionToRow(q: Question): QuestionRow | null {
  switch (q.type) {
    case 'true_false':            return trueFalseToRow(q);
    case 'short_answer':          return shortAnswerToRow(q);
    case 'multiple_choice':       return multipleChoiceToRow(q);
    case 'essay':                 return essayToRow(q);
    case 'numerical':             return numericalToRow(q);
    case 'highlight_correct_word': return highlightCorrectWordToRow(q);
    case 'select_correct_word':   return selectCorrectWordToRow(q);
    case 'text_sequencing':       return textSequencingToRow(q);
    case 'image_sequencing':      return imageSequencingToRow(q);
    case 'free_hand_drawing':     return freeHandDrawingToRow(q);
    case 'record_audio':          return recordAudioToRow(q);
    case 'multiple_hotspots':     return multipleHotspotsToRow(q);
    case 'drag_drop_text':        return dragDropTextToRow(q);
    case 'drag_drop_image':       return dragDropImageToRow(q);
    case 'fill_in_blanks_image':  return fillInBlanksImageToRow(q);
    case 'text_classification':   return textClassificationToRow(q);
    case 'image_classification':  return imageClassificationToRow(q);
    case 'matching':              return matchingToRow(q);
    default:                      return null;
  }
}
