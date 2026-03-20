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
} from '../db/db';

function getFeedbackFromStored(stored: StoredQuestion): Pick<
  QuestionFormData,
  'correctAnswerFeedback' | 'partiallyCorrectAnswerFeedback' | 'incorrectAnswerFeedback'
> {
  return {
    correctAnswerFeedback: stored.correctAnswerFeedback ?? '',
    partiallyCorrectAnswerFeedback: stored.partiallyCorrectAnswerFeedback ?? '',
    incorrectAnswerFeedback: stored.incorrectAnswerFeedback ?? '',
  };
}

function convertTrueFalseToForm(stored: StoredTrueFalseQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'true_false',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    correctAnswer: stored.correct_answer ? 'True' : 'False',
  };
}

function convertShortAnswerToForm(stored: StoredShortAnswerQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'short_answer',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    answers: stored.answers.map((a) => ({
      id: a.id,
      text: a.text,
      mark: a.mark,
      ignoreCasing: a.ignore_casing,
      feedback: a.feedback,
    })),
  };
}

function convertMultipleChoiceToForm(stored: StoredMultipleChoiceQuestion): QuestionFormData {
  return {
    type: 'multiple_choice',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    choices: stored.choices.map((c) => ({
      id: c.id,
      text: c.text,
      isCorrect: c.isCorrect,
      feedbackEnabled: c.feedbackEnabled,
      feedbackText: c.feedbackText,
    })),
    choiceNumbering: stored.choiceNumbering,
    minSelections: stored.minSelections,
    maxSelections: stored.maxSelections,
    allowPartialCredit: stored.allowPartialCredit,
    allowShuffle: stored.allowShuffle,
  };
}

function convertEssayToForm(stored: StoredEssayQuestion): QuestionFormData {
  return {
    type: 'essay',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    responseFormat: stored.responseFormat,
    minLimit: stored.minLimit === '' ? '' : String(stored.minLimit),
    maxLimit: stored.maxLimit === '' ? '' : String(stored.maxLimit),
    allowAttachments: stored.allowAttachments,
    numberOfAttachments: stored.numberOfAttachments,
    requiredAttachments: stored.requiredAttachments,
    maxFileSize: stored.maxFileSize,
    attachmentsFormat: stored.attachmentsFormat,
  };
}

function convertFillInBlanksToForm(stored: StoredFillInBlanksQuestion): QuestionFormData {
  return {
    type: 'fill_in_blanks',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    content: stored.content ?? stored.text,
    answerGroups: stored.answerGroups.map((group) => ({
      key: group.key,
      answers: group.answers.map((a) => ({
        id: a.id,
        text: a.text,
        mark: a.mark,
        ignoreCasing: a.ignoreCasing,
        feedback: false,
      })),
    })),
    manualMarking: stored.manualMarking,
    requireUniqueKeyAnswers: stored.requireUniqueKeyAnswers ?? false,
  };
}

function convertFillInBlanksImageToForm(stored: StoredFillInBlanksImageQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'fill_in_blanks_image',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    background_image: stored.background_image,
    inputAreas: stored.inputAreas.map((area) => ({
      id: area.id,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      manualMarking: false,
      answers: area.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        mark: answer.mark,
        ignoreCasing: answer.ignoreCasing,
        feedback: false,
      })),
    })),
  };
}

function convertTextSequencingToForm(stored: StoredTextSequencingQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'text_sequencing',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    sequencingItems: stored.items
      .slice()
      .sort((a, b) => a.canonicalOrder - b.canonicalOrder)
      .map((item) => ({
        id: item.id,
        text: item.text,
        markPercent: item.markPercent,
      })),
    autoDistributeMarks: stored.autoDistributeMarks,
    allowPartialCreditScoring: stored.allowPartialCredit,
  }
}

function convertImageSequencingToForm(stored: StoredImageSequencingQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'image_sequencing',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    sequencingItems: stored.items
      .slice()
      .sort((a, b) => a.canonicalOrder - b.canonicalOrder)
      .map((item) => ({
        id: item.id,
        image: item.image,
        markPercent: item.markPercent,
      })),
    autoDistributeMarks: stored.autoDistributeMarks,
    allowPartialCreditScoring: stored.allowPartialCredit,
  }
}

function convertFreeHandDrawingToForm(stored: StoredFreeHandDrawingQuestion): QuestionFormData {
  return {
    type: 'free_hand_drawing',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    enableBackgroundImage: stored.background_image != null,
    canvasWidth: stored.canvas_width,
    canvasHeight: stored.canvas_height,
    background_image: stored.background_image,
  };
}

function convertSelectCorrectWordToForm(stored: StoredSelectCorrectWordQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'select_correct_word',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    selectWordGroups: stored.groups.map((group) => ({
      key: group.key,
      options: group.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    })),
    allowPartialCreditScoring: stored.allowPartialCredit,
  }
}

function convertRecordAudioToForm(stored: StoredRecordAudioQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'record_audio',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    informationForGraders: stored.informationForGraders ?? '',
    numberOfRecordingsMin: stored.numberOfRecordingsMin,
    numberOfRecordingsMax: stored.numberOfRecordingsMax,
    recordingDurationMinSeconds: stored.recordingDurationMinSeconds,
    recordingDurationMaxSeconds: stored.recordingDurationMaxSeconds,
  };
}

function convertHighlightCorrectWordToForm(
  stored: StoredHighlightCorrectWordQuestion
): QuestionFormData {
  return {
    id: stored.id,
    type: 'highlight_correct_word',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    highlightCorrectPhrases: stored.correctPhrases,
    highlightPenaltyPercent: stored.penaltyPercent,
  }
}

function convertMultipleHotspotsToForm(stored: StoredMultipleHotspotsQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'multiple_hotspots',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    background_image: stored.background_image,
    hotspots: stored.hotspots.map((h) => ({
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
    allowPartialCredit: stored.allowPartialCredit,
    minSelections: stored.minSelections,
    maxSelections: stored.maxSelections,
  };
}

function convertNumericalToForm(stored: StoredNumericalQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'numerical',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    numericalAnswers: stored.answers.map((a) => ({
      id: a.id,
      answer: String(a.answer),
      error: String(a.error),
      mark: a.mark,
      feedback: a.feedback,
    })),
    numericalUnitHandling: stored.unitHandling ?? 'disabled',
    numericalUnitInputMethod: stored.unitInputMethod ?? 'text_input',
    numericalUnitPenalty: String(stored.unitPenalty ?? 0),
    numericalUnits: (stored.units ?? []).map((u) => ({
      id: u.id,
      unit: u.unit,
      multiplier: String(u.multiplier),
    })),
  };
}

function convertDragDropImageToForm(stored: StoredDragDropImageQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'drag_drop_image',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    background_image: stored.background_image,
    justificationMode: stored.justificationMode,
    justificationFraction: stored.justificationFraction,
    autoDistributeMarks: stored.autoDistributeMarks,
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
  };
}

function convertTextClassificationToForm(stored: StoredTextClassificationQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'text_classification',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
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
    textClassificationAutoDistribute: stored.autoDistribute,
    textClassificationJustification: stored.justification,
    textClassificationJustificationFraction: stored.justificationFraction,
  };
}

function convertImageClassificationToForm(stored: StoredImageClassificationQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'image_classification',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
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
    textClassificationAutoDistribute: stored.autoDistribute,
    textClassificationJustification: stored.justification,
    textClassificationJustificationFraction: stored.justificationFraction,
  };
}

function convertDragDropTextToForm(stored: StoredDragDropTextQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'drag_drop_text',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
    autoDistributeMarks: stored.autoDistributeMarks,
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

export function storedToFormData(stored: StoredQuestion): QuestionFormData {
  const feedback = getFeedbackFromStored(stored);
  switch (stored.type) {
    case 'true_false':
      return { ...convertTrueFalseToForm(stored), ...feedback };
    case 'short_answer':
      return { ...convertShortAnswerToForm(stored), ...feedback };
    case 'multiple_choice':
      return { ...convertMultipleChoiceToForm(stored), ...feedback };
    case 'essay':
      return { ...convertEssayToForm(stored), ...feedback };
    case 'fill_in_blanks':
      return { ...convertFillInBlanksToForm(stored), ...feedback };
    case 'fill_in_blanks_image':
      return { ...convertFillInBlanksImageToForm(stored), ...feedback };
    case 'text_sequencing':
      return { ...convertTextSequencingToForm(stored), ...feedback };
    case 'image_sequencing':
      return { ...convertImageSequencingToForm(stored), ...feedback };
    case 'free_hand_drawing':
      return { ...convertFreeHandDrawingToForm(stored), ...feedback };
    case 'select_correct_word':
      return { ...convertSelectCorrectWordToForm(stored), ...feedback };
    case 'record_audio':
      return { ...convertRecordAudioToForm(stored), ...feedback };
    case 'numerical':
      return { ...convertNumericalToForm(stored), ...feedback };
    case 'highlight_correct_word':
      return { ...convertHighlightCorrectWordToForm(stored), ...feedback };
    case 'multiple_hotspots':
      return { ...convertMultipleHotspotsToForm(stored), ...feedback };
    case 'drag_drop_text':
      return { ...convertDragDropTextToForm(stored), ...feedback };
    case 'drag_drop_image':
      return { ...convertDragDropImageToForm(stored), ...feedback };
    case 'text_classification':
      return { ...convertTextClassificationToForm(stored), ...feedback };
    case 'image_classification':
      return { ...convertImageClassificationToForm(stored), ...feedback };
    case 'matching':
      return { ...convertMatchingToForm(stored), ...feedback };
    default: {
      const _exhaust: never = stored;
      void _exhaust;
      throw new Error('Conversion not implemented for stored question type');
    }
  }
}

function convertMatchingToForm(stored: StoredMatchingQuestion): QuestionFormData {
  return {
    id: stored.id,
    type: 'matching',
    name: stored.name,
    mark: stored.mark,
    text: stored.text,
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
    matchingAllowRightReuse: stored.allowRightItemReuse,
    matchingAutoDistribute: stored.autoDistribute,
    matchingPenalty: stored.penaltyPerWrongPair,
    matchingJustification: stored.justification,
    matchingJustificationFraction: stored.justificationFraction,
  };
}
