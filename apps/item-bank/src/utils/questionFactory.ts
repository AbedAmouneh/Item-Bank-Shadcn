import type { QuestionFormData } from '@item-bank/questions';
import type {
  StoredQuestion,
  StoredTrueFalseQuestion,
  StoredShortAnswerQuestion,
  StoredMultipleChoiceQuestion,
  StoredEssayQuestion,
  StoredFillInBlanksQuestion,
  StoredFillInBlanksImageQuestion,
  StoredTextSequencingQuestion,
  StoredImageSequencingQuestion,
  StoredFreeHandDrawingQuestion,
  StoredSelectCorrectWordQuestion,
  StoredRecordAudioQuestion,
  StoredNumericalQuestion,
  StoredHighlightCorrectWordQuestion,
  StoredMultipleHotspotsQuestion,
  StoredDragDropTextQuestion,
  StoredDragDropImageQuestion,
  StoredTextClassificationQuestion,
  StoredImageClassificationQuestion,
  StoredMatchingQuestion,
  QuestionStatus,
} from '../db/db';

const DRAG_DROP_KEY_REGEX = /\[\[([^\]]+)\]\]/g;

function unwrapBracketToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const wrapped = trimmed.match(/^\[\[([\s\S]+)\]\]$/);
  return (wrapped?.[1] ?? trimmed).trim();
}

function isBogusEditorNode(node: Element | null): boolean {
  if (!node) return false;
  if (node.getAttribute('data-mce-bogus') === '1') return true;
  return node.closest('[data-mce-bogus="1"]') !== null;
}

function getKeyFromWrapper(wrapper: Element): string {
  const keyNode = wrapper.querySelector('.fill-in-blank-key');
  const candidates = [
    keyNode?.textContent ?? '',
    keyNode?.getAttribute('data-key') ?? '',
    wrapper.querySelector('.key-action-btn[data-key]')?.getAttribute('data-key') ?? '',
  ];

  for (const candidate of candidates) {
    const key = unwrapBracketToken(candidate);
    if (key) return key;
  }
  return '';
}

type BaseQuestionData = {
  id: string;
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  correctAnswerFeedback?: string;
  partiallyCorrectAnswerFeedback?: string;
  incorrectAnswerFeedback?: string;
};

function createBaseQuestionData(questionData: QuestionFormData): BaseQuestionData {
  return {
    id: questionData.id ?? crypto.randomUUID(),
    name: questionData.name,
    text: questionData.text,
    mark: questionData.mark,
    status: 'Draft' as QuestionStatus,
    lastModified: new Date().toISOString(),
    correctAnswerFeedback: questionData.correctAnswerFeedback ?? '',
    partiallyCorrectAnswerFeedback: questionData.partiallyCorrectAnswerFeedback ?? '',
    incorrectAnswerFeedback: questionData.incorrectAnswerFeedback ?? '',
  };
}

function parseDragDropKeysFromText(text: string): string[] {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text ?? '', 'text/html');

    doc.querySelectorAll('.key-actions, .key-action-btn, .edit-icon, .delete-icon').forEach((node) => {
      node.remove();
    });

    doc.querySelectorAll('.key-wrapper').forEach((wrapper) => {
      if (isBogusEditorNode(wrapper)) {
        wrapper.remove();
        return;
      }
      const key = getKeyFromWrapper(wrapper);
      if (!key) {
        wrapper.remove();
        return;
      }
      wrapper.replaceWith(doc.createTextNode(`[[${key}]]`));
    });

    doc.querySelectorAll('.fill-in-blank-key').forEach((node) => {
      if (isBogusEditorNode(node)) {
        node.remove();
        return;
      }
      const key = unwrapBracketToken(
        (node.textContent ?? '').trim() || node.getAttribute('data-key') || ''
      );
      if (!key) {
        node.remove();
        return;
      }
      node.replaceWith(doc.createTextNode(`[[${key}]]`));
    });

    const content = doc.body.textContent ?? '';
    const keys: string[] = [];
    const regex = new RegExp(DRAG_DROP_KEY_REGEX);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const key = match[1].trim();
      if (key) keys.push(key);
    }
    return keys;
  }

  const keys: string[] = [];
  const regex = new RegExp(DRAG_DROP_KEY_REGEX);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1].trim();
    if (key) keys.push(key);
  }
  return keys;
}

function uniqueKeysCaseInsensitive(keys: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(key);
  }
  return unique;
}

function hasDuplicateKeysCaseInsensitive(keys: string[]): boolean {
  const seen = new Set<string>();
  for (const key of keys) {
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

function createTrueFalseQuestion(questionData: QuestionFormData): StoredTrueFalseQuestion | null {
  if (!questionData.text?.trim()) return null;

  return {
    ...createBaseQuestionData(questionData),
    type: 'true_false',
    correct_answer: questionData.correctAnswer === 'True',
  };
}

function createShortAnswerQuestion(questionData: QuestionFormData): StoredShortAnswerQuestion {
  const answers = questionData.answers ?? [];
  return {
    ...createBaseQuestionData(questionData),
    type: 'short_answer',
    answers: answers.map((a) => ({
      id: a.id,
      text: a.text,
      mark: a.mark,
      ignore_casing: a.ignoreCasing,
      feedback: a.feedback,
    })),
  };
}

function createMultipleChoiceQuestion(questionData: QuestionFormData): StoredMultipleChoiceQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'multiple_choice',
    choices: (questionData.choices ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      isCorrect: c.isCorrect,
      feedbackEnabled: c.feedbackEnabled,
      feedbackText: c.feedbackText,
    })),
    choiceNumbering: questionData.choiceNumbering ?? 'none',
    minSelections: questionData.minSelections ?? 1,
    maxSelections: questionData.maxSelections ?? 1,
    allowPartialCredit: questionData.allowPartialCredit ?? false,
    allowShuffle: questionData.allowShuffle ?? false,
  };
}

function createEssayQuestion(questionData: QuestionFormData): StoredEssayQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'essay',
    responseFormat: questionData.responseFormat ?? 'html',
    minLimit: questionData.minLimit === '' || questionData.minLimit === undefined ? '' : Number(questionData.minLimit),
    maxLimit: questionData.maxLimit === '' || questionData.maxLimit === undefined ? '' : Number(questionData.maxLimit),
    allowAttachments: questionData.allowAttachments ?? false,
    numberOfAttachments: questionData.numberOfAttachments ?? 1,
    requiredAttachments: questionData.requiredAttachments ?? false,
    maxFileSize: questionData.maxFileSize ?? '2MB',
    attachmentsFormat: questionData.attachmentsFormat ?? ['.pdf', '.doc', '.docx'],
  };
}

function createFillInBlanksQuestion(questionData: QuestionFormData): StoredFillInBlanksQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'fill_in_blanks',
    content: questionData.content ?? '',
    answerGroups: (questionData.answerGroups ?? []).map((group) => ({
      key: group.key,
      answers: group.answers.map((a) => ({
        id: a.id,
        text: a.text,
        mark: a.mark,
        ignoreCasing: a.ignoreCasing,
      })),
    })),
    manualMarking: questionData.manualMarking ?? false,
    requireUniqueKeyAnswers: questionData.requireUniqueKeyAnswers ?? false,
  };
}

function createFillInBlanksImageQuestion(questionData: QuestionFormData): StoredFillInBlanksImageQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'fill_in_blanks_image',
    background_image: questionData.background_image ?? null,
    inputAreas: (questionData.inputAreas ?? []).map((area) => ({
      id: area.id,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      answers: area.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        mark: answer.mark,
        ignoreCasing: answer.ignoreCasing,
      })),
    })),
  };
}

function createTextSequencingQuestion(
  questionData: QuestionFormData
): StoredTextSequencingQuestion | null {
  const rawItems = questionData.sequencingItems ?? [];

  // Defensive guard: enforce data integrity even if the UI validation is bypassed
  if (rawItems.length < 2) return null;
  if (rawItems.some((item) => !item.text?.trim())) return null;
  if (!(questionData.autoDistributeMarks ?? true)) {
    const total = Math.round(rawItems.reduce((s, it) => s + it.markPercent, 0) * 100) / 100;
    if (total !== 100) return null;
  }

  const items = rawItems.map((item, index) => ({
    id: item.id,
    text: item.text?.trim() ?? '',
    markPercent: item.markPercent,
    canonicalOrder: index,
  }));
  return {
    ...createBaseQuestionData(questionData),
    type: 'text_sequencing',
    items,
    autoDistributeMarks: questionData.autoDistributeMarks ?? true,
    allowPartialCredit: questionData.allowPartialCreditScoring ?? false,
  }
}

function createImageSequencingQuestion(
  questionData: QuestionFormData
): StoredImageSequencingQuestion | null {
  const rawItems = questionData.sequencingItems ?? [];

  // Defensive guard: enforce data integrity even if the UI validation is bypassed
  if (rawItems.length < 2) return null;
  if (rawItems.some((item) => !item.image?.trim())) return null;
  if (!(questionData.autoDistributeMarks ?? true)) {
    const total = Math.round(rawItems.reduce((s, it) => s + it.markPercent, 0) * 100) / 100;
    if (total !== 100) return null;
  }

  const items = rawItems.map((item, index) => ({
    id: item.id,
    image: item.image?.trim() ?? '',
    markPercent: item.markPercent,
    canonicalOrder: index,
  }));
  return {
    ...createBaseQuestionData(questionData),
    type: 'image_sequencing',
    items,
    autoDistributeMarks: questionData.autoDistributeMarks ?? true,
    allowPartialCredit: false, // Image sequencing uses binary scoring
  }
}

function createFreeHandDrawingQuestion(questionData: QuestionFormData): StoredFreeHandDrawingQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'free_hand_drawing',
    canvas_width: questionData.canvasWidth ?? 800,
    canvas_height: questionData.canvasHeight ?? 600,
    background_image: questionData.background_image ?? null,
  };
}

function createSelectCorrectWordQuestion(
  questionData: QuestionFormData
): StoredSelectCorrectWordQuestion | null {
  const rawGroups = questionData.selectWordGroups ?? [];
  if (rawGroups.length === 0) return null;
  if (rawGroups.some((g) => g.options.length < 2)) return null;
  if (rawGroups.some((g) => g.options.filter((o) => o.isCorrect).length !== 1)) return null;
  if (rawGroups.some((g) => g.options.some((o) => !o.text.trim()))) return null;

  return {
    ...createBaseQuestionData(questionData),
    type: 'select_correct_word',
    groups: rawGroups.map((group) => ({
      key: group.key,
      options: group.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    })),
    allowPartialCredit: questionData.allowPartialCreditScoring ?? false,
  };
}

function createRecordAudioQuestion(questionData: QuestionFormData): StoredRecordAudioQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'record_audio',
    informationForGraders: questionData.informationForGraders ?? '',
    numberOfRecordingsMin: questionData.numberOfRecordingsMin ?? 1,
    numberOfRecordingsMax: questionData.numberOfRecordingsMax ?? 1,
    recordingDurationMinSeconds: questionData.recordingDurationMinSeconds ?? 10,
    recordingDurationMaxSeconds: questionData.recordingDurationMaxSeconds ?? 30,
  };
}

function createHighlightCorrectWordQuestion(
  questionData: QuestionFormData
): StoredHighlightCorrectWordQuestion | null {
  const phrases = questionData.highlightCorrectPhrases ?? [];
  if (phrases.length === 0) return null;
  if (!questionData.text?.trim()) return null;

  return {
    ...createBaseQuestionData(questionData),
    type: 'highlight_correct_word',
    correctPhrases: phrases,
    penaltyPercent: questionData.highlightPenaltyPercent ?? 25,
  }
}

function createMultipleHotspotsQuestion(
  questionData: QuestionFormData
): StoredMultipleHotspotsQuestion {
  return {
    ...createBaseQuestionData(questionData),
    type: 'multiple_hotspots',
    background_image: questionData.background_image ?? null,
    hotspots: (questionData.hotspots ?? []).map((h) => ({
      type: h.type,
      x: h.x,
      y: h.y,
      width: h.width,
      height: h.height,
      radius: h.radius,
      points: h.points,
      color: h.color,
      strokeWidth: h.strokeWidth,
      isCorrect: h.isCorrect,
      mark: h.mark,
    })),
    allowPartialCredit: questionData.allowPartialCredit ?? false,
    minSelections: questionData.minSelections ?? 1,
    maxSelections: questionData.maxSelections ?? 1,
  };
}

function createNumericalQuestion(questionData: QuestionFormData): StoredNumericalQuestion {
  const answers = questionData.numericalAnswers ?? [];
  const unitHandling = questionData.numericalUnitHandling ?? 'disabled';
  const units =
    unitHandling === 'disabled' ? [] : (questionData.numericalUnits ?? []);
  return {
    ...createBaseQuestionData(questionData),
    type: 'numerical',
    answers: answers.map((a) => ({
      id: a.id,
      answer: parseFloat(a.answer) || 0,
      error: parseFloat(a.error) || 0,
      mark: a.mark,
      feedback: a.feedback,
    })),
    unitHandling,
    unitInputMethod: questionData.numericalUnitInputMethod ?? 'text_input',
    unitPenalty: parseFloat(questionData.numericalUnitPenalty ?? '0') || 0,
    units: units.map((u) => ({
      id: u.id,
      unit: u.unit,
      multiplier: parseFloat(u.multiplier) || 1,
    })),
  };
}

function createDragDropTextQuestion(
  questionData: QuestionFormData
): StoredDragDropTextQuestion | null {
  const parsedKeys = parseDragDropKeysFromText(questionData.text ?? '');
  const uniqueParsedKeys = uniqueKeysCaseInsensitive(parsedKeys);
  if (uniqueParsedKeys.length === 0) return null;
  if (hasDuplicateKeysCaseInsensitive(parsedKeys)) return null;

  const dragDropItems = questionData.dragDropItems ?? [];
  const dragDropGroups = questionData.dragDropGroups ?? [];

  if (dragDropItems.length !== uniqueParsedKeys.length) return null;
  if (dragDropItems.some((item) => !item.key.trim() || !item.answer.trim())) return null;
  if (hasDuplicateKeysCaseInsensitive(dragDropItems.map((item) => item.key))) return null;

  const itemKeySet = new Set(dragDropItems.map((item) => item.key.toLowerCase()));
  const parsedKeySet = new Set(uniqueParsedKeys.map((key) => key.toLowerCase()));
  if (itemKeySet.size !== parsedKeySet.size) return null;
  if (uniqueParsedKeys.some((key) => !itemKeySet.has(key.toLowerCase()))) return null;

  const totalMarks =
    Math.round(dragDropItems.reduce((sum, item) => sum + (item.markPercent ?? 0), 0) * 100) / 100;
  if (totalMarks !== 100) return null;

  return {
    ...createBaseQuestionData(questionData),
    type: 'drag_drop_text',
    dragDropItems: dragDropItems.map((item) => ({
      id: item.id,
      key: item.key.trim(),
      answer: item.answer.trim(),
      groupId: item.groupId,
      markPercent: item.markPercent,
      unlimitedReuse: item.unlimitedReuse,
    })),
    dragDropGroups: dragDropGroups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
    })),
    autoDistributeMarks: questionData.autoDistributeMarks ?? true,
  };
}

function createDragDropImageQuestion(
  questionData: QuestionFormData
): StoredDragDropImageQuestion | null {
  const items = questionData.dragDropImageItems ?? [];
  const groups = questionData.dragDropImageGroups ?? [];

  if (!questionData.background_image) return null;
  if (items.length === 0) return null;
  if (items.some((item) => !item.answer.trim())) return null;
  if (items.some((item) => item.itemType === 'image' && !item.image)) return null;
  if (items.some((item) => item.zones.length !== 1)) return null;

  const totalMarks =
    Math.round(items.reduce((sum, item) => sum + (item.markPercent ?? 0), 0) * 100) / 100;
  if (totalMarks !== 100) return null;

  return {
    ...createBaseQuestionData(questionData),
    type: 'drag_drop_image',
    background_image: questionData.background_image,
    dragDropImageItems: items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      answer: item.answer.trim(),
      image: item.image,
      groupId: item.groupId,
      markPercent: item.markPercent,
      unlimitedReuse: item.unlimitedReuse,
      zones: item.zones.slice(0, 1).map((z) => ({
        id: z.id,
        left: z.left,
        top: z.top,
        width: z.width,
        height: z.height,
      })),
    })),
    dragDropImageGroups: groups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
    autoDistributeMarks: questionData.autoDistributeMarks ?? true,
    justificationMode: questionData.justificationMode ?? 'disabled',
    justificationFraction: questionData.justificationFraction ?? 20,
  };
}

function createTextClassificationQuestion(
  questionData: QuestionFormData
): StoredTextClassificationQuestion {
  const categories = questionData.textClassificationCategories ?? [];
  return {
    ...createBaseQuestionData(questionData),
    type: 'text_classification',
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      answers: cat.answers.map((a) => ({
        id: a.id,
        text: a.text,
        feedback: a.feedback,
        markPercent: a.markPercent,
      })),
    })),
    layout: questionData.textClassificationLayout ?? 'columns',
    autoDistribute: questionData.textClassificationAutoDistribute ?? true,
    justification: questionData.textClassificationJustification ?? 'disabled',
    justificationFraction: questionData.textClassificationJustificationFraction ?? 30,
  };
}

function createImageClassificationQuestion(
  questionData: QuestionFormData
): StoredImageClassificationQuestion {
  const categories = questionData.imageClassificationCategories ?? [];
  return {
    ...createBaseQuestionData(questionData),
    type: 'image_classification',
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      answers: cat.answers.map((a) => ({
        id: a.id,
        imageUrl: a.imageUrl,
        feedback: a.feedback,
        markPercent: a.markPercent,
      })),
    })),
    layout: questionData.textClassificationLayout ?? 'columns',
    autoDistribute: questionData.textClassificationAutoDistribute ?? true,
    justification: questionData.textClassificationJustification ?? 'disabled',
    justificationFraction: questionData.textClassificationJustificationFraction ?? 30,
  };
}

/**
 * Creates a StoredQuestion from QuestionFormData
 * Returns null if the question type is not recognized
 */
export function createStoredQuestion(questionData: QuestionFormData): StoredQuestion | null {
  switch (questionData.type) {
    case 'true_false':
      return createTrueFalseQuestion(questionData);
    case 'short_answer':
      return createShortAnswerQuestion(questionData);
    case 'multiple_choice':
      return createMultipleChoiceQuestion(questionData);
    case 'essay':
      return createEssayQuestion(questionData);
    case 'fill_in_blanks':
      return createFillInBlanksQuestion(questionData);
    case 'fill_in_blanks_image':
      return createFillInBlanksImageQuestion(questionData);
    case 'text_sequencing':
      return createTextSequencingQuestion(questionData);
    case 'image_sequencing':
      return createImageSequencingQuestion(questionData);
    case 'drag_drop_text':
      return createDragDropTextQuestion(questionData);
    case 'drag_drop_image':
      return createDragDropImageQuestion(questionData);
    case 'free_hand_drawing':
      return createFreeHandDrawingQuestion(questionData);
    case 'select_correct_word':
      return createSelectCorrectWordQuestion(questionData);
    case 'record_audio':
      return createRecordAudioQuestion(questionData);
    case 'numerical':
      return createNumericalQuestion(questionData);
    case 'highlight_correct_word':
      return createHighlightCorrectWordQuestion(questionData);
    case 'multiple_hotspots':
      return createMultipleHotspotsQuestion(questionData);
    case 'text_classification':
      return createTextClassificationQuestion(questionData);
    case 'image_classification':
      return createImageClassificationQuestion(questionData);
    case 'matching':
      return createMatchingQuestion(questionData);
    default:
      return null;
  }
}

function createMatchingQuestion(
  questionData: QuestionFormData
): StoredMatchingQuestion {
  const leftItems = questionData.matchingLeftItems ?? [];
  const rightItems = questionData.matchingRightItems ?? [];
  return {
    ...createBaseQuestionData(questionData),
    type: 'matching',
    leftItems: leftItems.map((item) => ({
      id: item.id,
      text: item.text,
      imageUrl: item.imageUrl,
      multipleAnswers: item.multipleAnswers,
      linkedRightIds: item.linkedRightIds,
      markPercent: item.markPercent,
    })),
    rightItems: rightItems.map((item) => ({
      id: item.id,
      text: item.text,
      imageUrl: item.imageUrl,
    })),
    leftMode: questionData.matchingLeftMode ?? 'text',
    rightMode: questionData.matchingRightMode ?? 'text',
    allowRightItemReuse: questionData.matchingAllowRightReuse ?? false,
    autoDistribute: questionData.matchingAutoDistribute ?? true,
    penaltyPerWrongPair: questionData.matchingPenalty ?? 0,
    justification: questionData.matchingJustification ?? 'disabled',
    justificationFraction: questionData.matchingJustificationFraction ?? 30,
  };
}
