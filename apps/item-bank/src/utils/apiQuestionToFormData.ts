import type { QuestionFormData } from '@item-bank/questions';
import type { Question } from '@item-bank/api';

type Content = Record<string, unknown>;

/** Safely read a string from an untyped content object. */
function s(c: Content, key: string, fallback = ''): string {
  const v = c[key];
  return typeof v === 'string' ? v : fallback;
}

/** Safely read a number from an untyped content object. */
function n(c: Content, key: string, fallback = 0): number {
  const v = c[key];
  return typeof v === 'number' ? v : fallback;
}

/** Safely read a boolean from an untyped content object. */
function b(c: Content, key: string, fallback = false): boolean {
  const v = c[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** Safely read an array from an untyped content object. */
function a<T>(c: Content, key: string): T[] {
  const v = c[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Fields shared by every question type. */
function baseFields(q: Question): Pick<QuestionFormData, 'id' | 'name' | 'mark' | 'text'> {
  return {
    id: String(q.id),
    name: q.name,
    mark: q.mark ?? 0,
    text: q.text ?? '',
  };
}

function trueFalseFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'true_false',
    correctAnswer: b(q.content, 'correct_answer') ? 'True' : 'False',
  };
}

function shortAnswerFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'short_answer',
    answers: a<Content>(q.content, 'answers').map((ans) => ({
      id: s(ans, 'id', crypto.randomUUID()),
      text: s(ans, 'text'),
      mark: n(ans, 'mark', 100),
      ignoreCasing: b(ans, 'ignore_casing', true),
      feedback: b(ans, 'feedback'),
    })),
  };
}

function multipleChoiceFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'multiple_choice',
    choices: a<Content>(q.content, 'choices').map((c) => ({
      id: s(c, 'id', crypto.randomUUID()),
      text: s(c, 'text'),
      isCorrect: b(c, 'isCorrect'),
      feedbackEnabled: b(c, 'feedbackEnabled'),
      feedbackText: s(c, 'feedbackText'),
    })),
    choiceNumbering: s(q.content, 'choiceNumbering', 'none') as QuestionFormData['choiceNumbering'],
    minSelections: n(q.content, 'minSelections', 1),
    maxSelections: n(q.content, 'maxSelections', 1),
    allowPartialCredit: b(q.content, 'allowPartialCredit'),
    allowShuffle: b(q.content, 'allowShuffle'),
  };
}

function essayFromApi(q: Question): QuestionFormData {
  const rawMin = q.content['minLimit'];
  const rawMax = q.content['maxLimit'];
  return {
    ...baseFields(q),
    type: 'essay',
    responseFormat: s(q.content, 'responseFormat', 'html') as QuestionFormData['responseFormat'],
    minLimit: rawMin === '' ? '' : rawMin !== undefined ? String(rawMin) : '',
    maxLimit: rawMax === '' ? '' : rawMax !== undefined ? String(rawMax) : '',
    allowAttachments: b(q.content, 'allowAttachments'),
    numberOfAttachments: n(q.content, 'numberOfAttachments', 1),
    requiredAttachments: b(q.content, 'requiredAttachments'),
    maxFileSize: s(q.content, 'maxFileSize', '2MB'),
    attachmentsFormat: a<string>(q.content, 'attachmentsFormat'),
  };
}

function numericalFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'numerical',
    numericalAnswers: a<Content>(q.content, 'answers').map((ans) => ({
      id: s(ans, 'id', crypto.randomUUID()),
      answer: String(n(ans, 'answer')),
      error: String(n(ans, 'error')),
      mark: n(ans, 'mark', 100),
      feedback: b(ans, 'feedback'),
    })),
    numericalUnitHandling: s(
      q.content,
      'unitHandling',
      'disabled'
    ) as QuestionFormData['numericalUnitHandling'],
    numericalUnitInputMethod: s(
      q.content,
      'unitInputMethod',
      'text_input'
    ) as QuestionFormData['numericalUnitInputMethod'],
    numericalUnitPenalty: String(n(q.content, 'unitPenalty', 0)),
    numericalUnits: a<Content>(q.content, 'units').map((u) => ({
      id: s(u, 'id', crypto.randomUUID()),
      unit: s(u, 'unit'),
      multiplier: String(n(u, 'multiplier', 1)),
    })),
  };
}

function highlightCorrectWordFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'highlight_correct_word',
    highlightCorrectPhrases: a<string>(q.content, 'correctPhrases'),
    highlightPenaltyPercent: n(q.content, 'penaltyPercent', 25),
  };
}

function selectCorrectWordFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'select_correct_word',
    selectWordGroups: a<Content>(q.content, 'groups').map((g) => ({
      key: s(g, 'key'),
      options: a<Content>(g, 'options').map((o) => ({
        id: s(o, 'id', crypto.randomUUID()),
        text: s(o, 'text'),
        isCorrect: b(o, 'isCorrect'),
      })),
    })),
    allowPartialCreditScoring: b(q.content, 'allowPartialCredit'),
  };
}

function textSequencingFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'text_sequencing',
    sequencingItems: a<Content>(q.content, 'items')
      .slice()
      .sort((x, y) => n(x, 'canonicalOrder') - n(y, 'canonicalOrder'))
      .map((item) => ({
        id: s(item, 'id', crypto.randomUUID()),
        text: s(item, 'text'),
        markPercent: n(item, 'markPercent'),
      })),
    autoDistributeMarks: b(q.content, 'autoDistributeMarks', true),
    allowPartialCreditScoring: b(q.content, 'allowPartialCredit'),
  };
}

function textClassificationFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'text_classification',
    textClassificationCategories: a<Content>(q.content, 'categories').map((cat) => ({
      id: s(cat, 'id', crypto.randomUUID()),
      name: s(cat, 'name'),
      color: s(cat, 'color') as QuestionFormData['textClassificationCategories'] extends Array<infer C> ? C['color'] : string,
      answers: a<Content>(cat, 'answers').map((ans) => ({
        id: s(ans, 'id', crypto.randomUUID()),
        text: s(ans, 'text'),
        feedback: s(ans, 'feedback'),
        markPercent: n(ans, 'markPercent'),
      })),
    })),
    textClassificationLayout: s(
      q.content,
      'layout',
      'columns'
    ) as QuestionFormData['textClassificationLayout'],
    textClassificationAutoDistribute: b(q.content, 'autoDistribute', true),
    textClassificationJustification: s(
      q.content,
      'justification',
      'disabled'
    ) as QuestionFormData['textClassificationJustification'],
    textClassificationJustificationFraction: n(q.content, 'justificationFraction', 30),
  };
}

function matchingFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'matching',
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
    matchingLeftMode: s(q.content, 'leftMode', 'text') as QuestionFormData['matchingLeftMode'],
    matchingRightMode: s(q.content, 'rightMode', 'text') as QuestionFormData['matchingRightMode'],
    matchingAllowRightReuse: b(q.content, 'allowRightItemReuse'),
    matchingAutoDistribute: b(q.content, 'autoDistribute', true),
    matchingPenalty: n(q.content, 'penaltyPerWrongPair'),
    matchingJustification: s(
      q.content,
      'justification',
      'disabled'
    ) as QuestionFormData['matchingJustification'],
    matchingJustificationFraction: n(q.content, 'justificationFraction', 30),
  };
}

function recordAudioFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'record_audio',
    informationForGraders: s(q.content, 'informationForGraders'),
    numberOfRecordingsMin: n(q.content, 'numberOfRecordingsMin', 1),
    numberOfRecordingsMax: n(q.content, 'numberOfRecordingsMax', 1),
    recordingDurationMinSeconds: n(q.content, 'recordingDurationMinSeconds', 10),
    recordingDurationMaxSeconds: n(q.content, 'recordingDurationMaxSeconds', 30),
  };
}

function dragDropImageFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'drag_drop_image',
    background_image: s(q.content, 'background_image'),
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
    autoDistributeMarks: b(q.content, 'autoDistributeMarks', true),
    justificationMode: s(q.content, 'justificationMode', 'disabled') as QuestionFormData['justificationMode'],
    justificationFraction: n(q.content, 'justificationFraction', 20),
  };
}

function multipleHotspotsFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'multiple_hotspots',
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
      opacity: n(h, 'opacity') || undefined,
      isCorrect: b(h, 'isCorrect'),
      mark: n(h, 'mark') || undefined,
    })),
    allowPartialCredit: b(q.content, 'allowPartialCredit'),
    minSelections: n(q.content, 'minSelections', 1),
    maxSelections: n(q.content, 'maxSelections', 1),
  };
}

function freeHandDrawingFromApi(q: Question): QuestionFormData {
  const backgroundImage = s(q.content, 'background_image') || null;
  return {
    ...baseFields(q),
    type: 'free_hand_drawing',
    enableBackgroundImage: backgroundImage !== null,
    canvasWidth: n(q.content, 'canvas_width', 800),
    canvasHeight: n(q.content, 'canvas_height', 600),
    background_image: backgroundImage,
  };
}

function imageSequencingFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'image_sequencing',
    sequencingItems: a<Content>(q.content, 'items')
      .slice()
      .sort((x, y) => n(x, 'canonicalOrder') - n(y, 'canonicalOrder'))
      .map((item) => ({
        id: s(item, 'id', crypto.randomUUID()),
        image: s(item, 'image'),
        markPercent: n(item, 'markPercent'),
      })),
    autoDistributeMarks: b(q.content, 'autoDistributeMarks', true),
  };
}

function fillInBlanksImageFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'fill_in_blanks_image',
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
        feedback: false,
      })),
    })),
  };
}

function dragDropTextFromApi(q: Question): QuestionFormData {
  return {
    ...baseFields(q),
    type: 'drag_drop_text',
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
    autoDistributeMarks: b(q.content, 'autoDistributeMarks', true),
  };
}

/**
 * Convert an API Question to the QuestionFormData shape expected by the editors.
 *
 * Only handles the 12 types that have been migrated to the REST API.
 * Returns null for types not yet migrated (image-bearing types still use IndexedDB).
 */
export function apiQuestionToFormData(q: Question): QuestionFormData | null {
  switch (q.type) {
    case 'true_false':
      return trueFalseFromApi(q);
    case 'short_answer':
      return shortAnswerFromApi(q);
    case 'multiple_choice':
      return multipleChoiceFromApi(q);
    case 'essay':
      return essayFromApi(q);
    case 'numerical':
      return numericalFromApi(q);
    case 'highlight_correct_word':
      return highlightCorrectWordFromApi(q);
    case 'select_correct_word':
      return selectCorrectWordFromApi(q);
    case 'text_sequencing':
      return textSequencingFromApi(q);
    case 'text_classification':
      return textClassificationFromApi(q);
    case 'matching':
      return matchingFromApi(q);
    case 'record_audio':
      return recordAudioFromApi(q);
    case 'drag_drop_text':
      return dragDropTextFromApi(q);
    case 'fill_in_blanks_image':
      return fillInBlanksImageFromApi(q);
    case 'image_sequencing':
      return imageSequencingFromApi(q);
    case 'free_hand_drawing':
      return freeHandDrawingFromApi(q);
    case 'multiple_hotspots':
      return multipleHotspotsFromApi(q);
    case 'drag_drop_image':
      return dragDropImageFromApi(q);
    default:
      return null;
  }
}
