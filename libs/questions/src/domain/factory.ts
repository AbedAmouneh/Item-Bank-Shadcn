import { AnswerEntry, QuestionType } from './types';
import { QuestionDraft } from './draft';

export function createDefaultQuestion(type: QuestionType): QuestionDraft {
  const baseDefaults = {
    type,
    name: '',
    text: '',
    isDirty: false,
  };

  switch (type) {
    case 'true_false':
      return {
        ...baseDefaults,
        type: 'true_false',
        correctAnswer: false,
      };

    case 'multiple_choice':
      return {
        ...baseDefaults,
        type: 'multiple_choice',
        options: [],
        correctOptionIds: [],
        allowMultiple: false,
      };

    case 'short_answer':
      return {
        ...baseDefaults,
        type: 'short_answer',
        acceptedAnswers: [],
      };

    case 'essay':
      return {
        ...baseDefaults,
        type: 'essay',
        responseFormat: 'html',
        minLimit: '',
        maxLimit: '',
        allowAttachments: false,
        numberOfAttachments: 1,
        requiredAttachments: false,
        maxFileSize: '2MB',
        attachmentsFormat: ['.pdf', '.doc', '.docx'],
      };

    case 'drag_drop_image':
      return {
        ...baseDefaults,
        type: 'drag_drop_image',
        imageUrl: '',
        draggableItems: [],
        dropZones: [],
      };

    case 'drag_drop_text':
      return {
        ...baseDefaults,
        type: 'drag_drop_text',
        dragDropItems: [],
        groups: [],
      };

    case 'free_hand_drawing':
      return {
        ...baseDefaults,
        type: 'free_hand_drawing',
        canvasWidth: 800,
        canvasHeight: 600,
        background_image: null,
      };

    case 'image_sequencing':
      return {
        ...baseDefaults,
        type: 'image_sequencing',
        items: [],
      };

    case 'multiple_hotspots':
      return {
        ...baseDefaults,
        type: 'multiple_hotspots',
        imageUrl: '',
        hotspots: [],
      };

    case 'numerical':
      return {
        ...baseDefaults,
        type: 'numerical',
        correctAnswer: 0,
        tolerance: undefined,
        unit: undefined,
      };

    case 'fill_in_blanks':
      return {
        ...baseDefaults,
        type: 'fill_in_blanks',
        textWithBlanks: '',
        blanks: [],
      };

    case 'select_correct_word':
      return {
        ...baseDefaults,
        type: 'select_correct_word',
        words: [],
      };

    case 'text_sequencing':
      return {
        ...baseDefaults,
        type: 'text_sequencing',
        items: [],
      };

    case 'fill_in_blanks_image':
      return {
        ...baseDefaults,
        type: 'fill_in_blanks_image',
        imageUrl: '',
        blanks: [],
      };

    case 'highlight_correct_word':
      return {
        ...baseDefaults,
        type: 'highlight_correct_word',
        text: '',
        correctRanges: [],
      };

    case 'record_audio':
      return {
        ...baseDefaults,
        type: 'record_audio',
        maxDurationSeconds: 60,
      };

    case 'text_classification':
      return {
        ...baseDefaults,
        type: 'text_classification',
        categories: [],
        layout: 'columns',
        autoDistribute: true,
        justification: 'disabled',
        justificationFraction: 30,
      };

    case 'image_classification':
      return {
        ...baseDefaults,
        type: 'image_classification',
        categories: [],
        layout: 'columns',
        autoDistribute: true,
        justification: 'disabled',
        justificationFraction: 30,
      };

    case 'crossword':
      return {
        ...baseDefaults,
        type: 'crossword',
        words: [],
        gridLayout: 'ltr',
        hintMode: 'none',
        hintValue: 0,
      };

    case 'spelling_dictation':
      return {
        ...baseDefaults,
        type: 'spelling_dictation',
        audioUrl: null,
        audioName: null,
        correctAnswers: [],
        hint: '',
      };

    case 'matching':
      return {
        ...baseDefaults,
        type: 'matching',
        leftItems: [
          { id: crypto.randomUUID(), text: '', imageUrl: '', multipleAnswers: false, linkedRightIds: [], markPercent: 0 },
          { id: crypto.randomUUID(), text: '', imageUrl: '', multipleAnswers: false, linkedRightIds: [], markPercent: 0 },
          { id: crypto.randomUUID(), text: '', imageUrl: '', multipleAnswers: false, linkedRightIds: [], markPercent: 0 },
        ],
        rightItems: [
          { id: crypto.randomUUID(), text: '', imageUrl: '' },
          { id: crypto.randomUUID(), text: '', imageUrl: '' },
          { id: crypto.randomUUID(), text: '', imageUrl: '' },
        ],
        leftMode: 'text',
        rightMode: 'text',
        allowRightItemReuse: false,
        autoDistribute: true,
        penaltyPerWrongPair: 0,
        justification: 'disabled',
        justificationFraction: 30,
      };

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unhandled question type: ${exhaustiveCheck}`);
    }
  }
}


export function createEmptyAnswer(id?: string): AnswerEntry {
  return {
    id: id ?? crypto.randomUUID(),
    text: '',
    mark: 100,
    ignoreCasing: true,
    feedback: false,
  };
}