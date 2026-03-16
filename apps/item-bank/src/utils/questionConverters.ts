import type { QuestionRow, QuestionChoice } from '@item-bank/questions';
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
} from '../db/db';
import { normalizeStatus, formatLastModified } from './questionUtils';

type BaseRowData = Pick<QuestionRow, 'id' | 'questionName' | 'mark' | 'status' | 'lastModified'>;

function createBaseRowData(stored: StoredQuestion): BaseRowData {
  return {
    id: stored.id,
    questionName: stored.name,
    mark: stored.mark,
    status: normalizeStatus(stored.status),
    lastModified: formatLastModified(stored.lastModified),
  };
}

function convertTrueFalse(stored: StoredTrueFalseQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'true_false',
    question_text: stored.text,
    correct_choice: stored.correct_answer,
  };
}

function convertShortAnswer(stored: StoredShortAnswerQuestion): QuestionRow {
  const choices: QuestionChoice[] = (stored.answers ?? []).map((a, i) => ({
    id: i,
    answer: a.text,
    fraction: String(a.mark / 100),
    feedback: null,
    ignore_casing: a.ignore_casing,
  }));

  return {
    ...createBaseRowData(stored),
    type: 'short_answer',
    question_text: stored.text,
    choices,
  };
}

function convertMultipleChoice(stored: StoredMultipleChoiceQuestion): QuestionRow {
  const choices: QuestionChoice[] = stored.choices.map((c, i) => ({
    id: i,
    answer: c.text,
    fraction: c.isCorrect ? '1' : '0',
    feedback: c.feedbackEnabled ? c.feedbackText : null,
    ignore_casing: false,
  }));

  return {
    ...createBaseRowData(stored),
    type: 'multiple_choice',
    question_text: stored.text,
    choices,
    minSelections: stored.minSelections,
    maxSelections: stored.maxSelections,
    multipleChoiceAllowPartialCredit: stored.allowPartialCredit,
  };
}

function convertEssay(stored: StoredEssayQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'essay',
    question_text: stored.text,
    choices: [],
    essayResponseFormat: stored.responseFormat,
  };
}

function convertFillInBlanks(stored: StoredFillInBlanksQuestion): QuestionRow {
  let idCounter = 0;
  const choices: QuestionChoice[] = stored.answerGroups.flatMap((group) =>
    group.answers
      .filter((a) => a.text && a.text.trim()) // Skip empty answers
      .map((a) => ({
        id: idCounter++,
        answer: `[${group.key}] ${a.text}`,
        fraction: String(a.mark / 100),
        feedback: null,
        ignore_casing: a.ignoreCasing,
      }))
  );

  return {
    ...createBaseRowData(stored),
    type: 'fill_in_blanks',
    question_text: stored.text,
    choices,
    fillInBlanksContent: stored.content ?? stored.text,
    fillInBlanksRequireUniqueKeyAnswers: stored.requireUniqueKeyAnswers ?? false,
  };
}

function convertFillInBlanksImage(stored: StoredFillInBlanksImageQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'fill_in_blanks_image',
    question_text: stored.text,
    choices: [],
    background_image: stored.background_image,
    inputAreas: stored.inputAreas.map((area) => ({
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

function convertTextSequencing(stored: StoredTextSequencingQuestion): QuestionRow {
  // Items are stored in canonical order; id = canonicalOrder index
  // fraction encodes markPercent (as string), so the view can compute partial-credit scores
  const choices: QuestionChoice[] = stored.items
    .slice()
    .sort((a, b) => a.canonicalOrder - b.canonicalOrder)
    .map((item) => ({
      id: item.canonicalOrder,
      answer: item.text,
      fraction: String(item.markPercent),
      feedback: null,
      ignore_casing: false,
    }));

  return {
    ...createBaseRowData(stored),
    type: 'text_sequencing',
    question_text: stored.text,
    choices,
    sequencingAllowPartialCredit: stored.allowPartialCredit
  }
}

function convertImageSequencing(stored: StoredImageSequencingQuestion): QuestionRow {
  // Items are stored in canonical order; id = canonicalOrder index
  // fraction encodes markPercent (as string), so the view can compute partial-credit scores
  const choices: QuestionChoice[] = stored.items
    .slice()
    .sort((a, b) => a.canonicalOrder - b.canonicalOrder)
    .map((item) => ({
      id: item.canonicalOrder,
      answer: item.image,
      fraction: String(item.markPercent),
      feedback: null,
      ignore_casing: false,
    }));

  return {
    ...createBaseRowData(stored),
    type: 'image_sequencing',
    question_text: stored.text,
    choices,
    sequencingAllowPartialCredit: stored.allowPartialCredit
  }
}

function convertFreeHandDrawing(stored: StoredFreeHandDrawingQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'free_hand_drawing',
    question_text: stored.text,
    choices: [],
    canvas_width: stored.canvas_width,
    canvas_height: stored.canvas_height,
    background_image: stored.background_image,
  };
}

function convertSelectCorrectWord(stored: StoredSelectCorrectWordQuestion): QuestionRow {
  let idCounter = 0;
  const choices: QuestionChoice[] = stored.groups.flatMap((group) =>
    group.options.map((opt) => ({
      id: idCounter++,
      answer: `[${group.key}] ${opt.text}`,
      fraction: opt.isCorrect ? '1' : '0',
      feedback: null,
      ignore_casing: false,
    }))
  );
  return {
    ...createBaseRowData(stored),
    type: 'select_correct_word',
    question_text: stored.text,
    choices,
    selectWordAllowPartialCredit: stored.allowPartialCredit,
  };
}

function convertRecordAudio(stored: StoredRecordAudioQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'record_audio',
    question_text: stored.text,
    choices: [],
    numberOfRecordingsMin: stored.numberOfRecordingsMin,
    numberOfRecordingsMax: stored.numberOfRecordingsMax,
    recordingDurationMinSeconds: stored.recordingDurationMinSeconds,
    recordingDurationMaxSeconds: stored.recordingDurationMaxSeconds,
  };
}

function convertHighlightCorrectWord(stored: StoredHighlightCorrectWordQuestion): QuestionRow {
  const choices: QuestionChoice[] = stored.correctPhrases.map((phrase, i) => ({
    id: i,
    answer: phrase,
    fraction: '1',
    feedback: null,
    ignore_casing: false,
  }));
  return {
    ...createBaseRowData(stored),
    type: 'highlight_correct_word',
    question_text: stored.text,
    choices,
    highlightPenaltyPercent: stored.penaltyPercent,
  };
}

function convertNumerical(stored: StoredNumericalQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'numerical',
    question_text: stored.text,
    choices: [],
    numericalAnswers: stored.answers,
    numericalUnitHandling: stored.unitHandling,
    numericalUnitInputMethod: stored.unitInputMethod,
    numericalUnitPenalty: stored.unitPenalty,
    numericalUnits: stored.units,
  };
}

function convertMultipleHotspots(stored: StoredMultipleHotspotsQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'multiple_hotspots',
    question_text: stored.text,
    choices: [],
    background_image: stored.background_image,
    hotspots: stored.hotspots,
    minSelections: stored.minSelections,
    maxSelections: stored.maxSelections,
    hotspotsAllowPartialCredit: stored.allowPartialCredit,
  };
}

function convertDragDropImage(stored: StoredDragDropImageQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'drag_drop_image',
    question_text: stored.text,
    choices: [],
    background_image: stored.background_image,
    dragDropImageItems: stored.dragDropImageItems.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      answer: item.answer,
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
    dragDropImageGroups: stored.dragDropImageGroups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
    })),
    justificationMode: stored.justificationMode,
    justificationFraction: stored.justificationFraction,
  };
}

function convertTextClassification(stored: StoredTextClassificationQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'text_classification',
    question_text: stored.text,
    choices: [],
    textClassificationCategories: stored.categories.map((cat) => ({
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
    textClassificationLayout: stored.layout,
    textClassificationJustification: stored.justification,
    textClassificationJustificationFraction: stored.justificationFraction,
  };
}

function convertImageClassification(stored: StoredImageClassificationQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'image_classification',
    question_text: stored.text,
    choices: [],
    imageClassificationCategories: stored.categories.map((cat) => ({
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
    textClassificationLayout: stored.layout,
    textClassificationJustification: stored.justification,
    textClassificationJustificationFraction: stored.justificationFraction,
  };
}

function convertDragDropText(stored: StoredDragDropTextQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'drag_drop_text',
    question_text: stored.text,
    choices: [],
    dragDropItems: stored.dragDropItems.map((item) => ({
      id: item.id,
      key: item.key,
      answer: item.answer,
      groupId: item.groupId,
      markPercent: item.markPercent,
      unlimitedReuse: item.unlimitedReuse,
    })),
    dragDropGroups: stored.dragDropGroups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
    })),
  };
}

/**
 * Converts a stored question from IndexedDB to a QuestionRow for display in the table
 */
export function storedToRow(stored: StoredQuestion): QuestionRow {
  switch (stored.type) {
    case 'true_false':
      return convertTrueFalse(stored);
    case 'short_answer':
      return convertShortAnswer(stored);
    case 'multiple_choice':
      return convertMultipleChoice(stored);
    case 'essay':
      return convertEssay(stored);
    case 'fill_in_blanks':
      return convertFillInBlanks(stored);
    case 'fill_in_blanks_image':
      return convertFillInBlanksImage(stored);
    case 'text_sequencing':
      return convertTextSequencing(stored);
    case 'image_sequencing':
      return convertImageSequencing(stored);
    case 'free_hand_drawing':
      return convertFreeHandDrawing(stored);
    case 'select_correct_word':
      return convertSelectCorrectWord(stored);
    case 'record_audio':
      return convertRecordAudio(stored);
    case 'numerical':
      return convertNumerical(stored);
    case 'highlight_correct_word':
      return convertHighlightCorrectWord(stored);
    case 'multiple_hotspots':
      return convertMultipleHotspots(stored);
    case 'drag_drop_text':
      return convertDragDropText(stored);
    case 'drag_drop_image':
      return convertDragDropImage(stored);
    case 'text_classification':
      return convertTextClassification(stored);
    case 'image_classification':
      return convertImageClassification(stored);
    case 'matching':
      return convertMatching(stored);
    default: {
      const _exhaust: never = stored;
      void _exhaust;
      throw new Error('Unhandled stored question type');
    }
  }
}

function convertMatching(stored: StoredMatchingQuestion): QuestionRow {
  return {
    ...createBaseRowData(stored),
    type: 'matching',
    question_text: stored.text,
    choices: [],
    matchingLeftItems: stored.leftItems.map((item) => ({
      id: item.id,
      text: item.text,
      imageUrl: item.imageUrl,
      multipleAnswers: item.multipleAnswers,
      linkedRightIds: item.linkedRightIds,
      markPercent: item.markPercent,
    })),
    matchingRightItems: stored.rightItems.map((item) => ({
      id: item.id,
      text: item.text,
      imageUrl: item.imageUrl,
    })),
    matchingLeftMode: stored.leftMode,
    matchingRightMode: stored.rightMode,
    matchingJustification: stored.justification,
  };
}
