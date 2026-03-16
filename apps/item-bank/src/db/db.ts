import { DB_NAME, DB_VERSION, STORE_NAMES } from './constants';

// Add QuestionStatus type for new question types
export type QuestionStatus = 'Draft' | 'Published' | 'In Review';

/** Answer feedback (correct / partially correct / incorrect) – optional on all stored questions */
export interface StoredQuestionFeedback {
  correctAnswerFeedback?: string;
  partiallyCorrectAnswerFeedback?: string;
  incorrectAnswerFeedback?: string;
}

export interface StoredTrueFalseQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'true_false';
  name: string;
  text: string;
  mark: number;
  correct_answer: boolean;
  status: string;
  lastModified: string;
}

export interface StoredShortAnswerEntry {
  id: string;
  text: string;
  mark: number;
  ignore_casing: boolean;
  feedback: boolean;
}

export interface StoredShortAnswerQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'short_answer';
  name: string;
  text: string;
  mark: number;
  answers: StoredShortAnswerEntry[];
  status: string;
  lastModified: string;
}

// Multiple-Choice Question Types
export interface StoredChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
}

export interface StoredMultipleChoiceQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'multiple_choice';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;

  choices: StoredChoice[];
  choiceNumbering: 'none' | 'numeric' | 'upper_alpha' | 'lower_alpha' | 'roman';
  minSelections: number;
  maxSelections: number;
  allowPartialCredit: boolean;
  allowShuffle: boolean;
}

// Essay Question Type
export interface StoredEssayQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'essay';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;

  responseFormat: 'html' | 'html_with_file_picker' | 'plain_text';
  minLimit: number | '';
  maxLimit: number | '';
  allowAttachments: boolean;
  numberOfAttachments: number;
  requiredAttachments: boolean;
  maxFileSize: string;
  attachmentsFormat: string[];
}

// Fill-in-Blanks Question Types
export interface StoredAnswerEntry {
  id: string;
  text: string;
  mark: number;
  ignoreCasing: boolean;
}

export interface StoredAnswerGroup {
  key: string;
  answers: StoredAnswerEntry[];
}

export interface StoredFillInBlanksQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'fill_in_blanks';
  name: string;
  text: string;
  content?: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;

  answerGroups: StoredAnswerGroup[];
  manualMarking: boolean;
  requireUniqueKeyAnswers?: boolean;
}

export interface StoredFillInBlanksImageAnswerEntry {
  id: string;
  text: string;
  mark: number;
  ignoreCasing: boolean;
}

export interface StoredFillInBlanksImageZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answers: StoredFillInBlanksImageAnswerEntry[];
}

export interface StoredFillInBlanksImageQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'fill_in_blanks_image';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  background_image: string | null;
  inputAreas: StoredFillInBlanksImageZone[];
}

// Text Sequencing Question Types
export interface StoredTextSequencingItem {
  id: string;
  text: string;
  markPercent: number;
  canonicalOrder: number;
}

export interface StoredImageSequencingItem {
  id: string;
  image: string;
  markPercent: number;
  canonicalOrder: number;
}

export interface StoredTextSequencingQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'text_sequencing';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  items: StoredTextSequencingItem[];
  autoDistributeMarks: boolean;
  allowPartialCredit: boolean;
}

export interface StoredImageSequencingQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'image_sequencing';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  items: StoredImageSequencingItem[];
  autoDistributeMarks: boolean;
  allowPartialCredit: boolean;
}

export interface StoredDragDropTextItem {
  id: string;
  key: string;
  answer: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
}

export interface StoredDragDropTextGroup {
  id: string;
  name: string;
  color: string;
}

export interface StoredDragDropTextQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'drag_drop_text';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  dragDropItems: StoredDragDropTextItem[];
  dragDropGroups: StoredDragDropTextGroup[];
  autoDistributeMarks: boolean;
}


export interface StoredDragDropImageZone {
  id: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
}

export interface StoredDragDropImageItem {
  id: string;
  itemType: 'text' | 'image';
  answer: string;
  image?: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
  zones: StoredDragDropImageZone[];
}

export interface StoredDragDropImageGroup {
  id: string;
  name: string;
  color: string;
}

export interface StoredDragDropImageQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'drag_drop_image';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  background_image: string | null;
  dragDropImageItems: StoredDragDropImageItem[];
  dragDropImageGroups: StoredDragDropImageGroup[];
  autoDistributeMarks: boolean;
  justificationMode: 'required' | 'optional' | 'disabled';
  justificationFraction: number;
}

export interface StoredFreeHandDrawingQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'free_hand_drawing';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  canvas_width: number;
  canvas_height: number;
  background_image: string | null;
}

export interface StoredSelectCorrectWordOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface StoredSelectCorrectWordGroup {
  key: string;
  options: StoredSelectCorrectWordOption[];
}

export interface StoredSelectCorrectWordQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'select_correct_word';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  groups: StoredSelectCorrectWordGroup[];
  allowPartialCredit: boolean;
}

export interface StoredRecordAudioQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'record_audio';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  informationForGraders?: string;
  numberOfRecordingsMin: number;
  numberOfRecordingsMax: number;
  recordingDurationMinSeconds: number;
  recordingDurationMaxSeconds: number;
}

export interface StoredNumericalAnswerEntry {
  id: string;
  answer: number;
  error: number;
  mark: number;
  feedback: boolean;
}

export interface StoredNumericalUnitEntry {
  id: string;
  unit: string;
  multiplier: number;
}

export interface StoredNumericalQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'numerical';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  answers: StoredNumericalAnswerEntry[];
  unitHandling: 'required' | 'optional' | 'disabled';
  unitInputMethod: 'multiple_choice_selection' | 'drop_down' | 'text_input';
  unitPenalty: number;
  units: StoredNumericalUnitEntry[];
}

export interface StoredHighlightCorrectWordQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'highlight_correct_word';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  correctPhrases: string[];
  penaltyPercent: number;
}

export interface StoredHotspot {
  type: 'rectangle' | 'circle' | 'polygon';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  color: string;
  strokeWidth: number;
  isCorrect: boolean;
  mark?: number;
}

export interface StoredMultipleHotspotsQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'multiple_hotspots';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  background_image: string | null;
  hotspots: StoredHotspot[];
  allowPartialCredit: boolean;
  minSelections: number;
  maxSelections: number;
}

export interface StoredTextClassificationAnswer {
  id: string;
  text: string;
  feedback?: string;
  markPercent: number;
}

export interface StoredTextClassificationCategory {
  id: string;
  name: string;
  color: string;
  answers: StoredTextClassificationAnswer[];
}

export interface StoredTextClassificationQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'text_classification';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  categories: StoredTextClassificationCategory[];
  layout: 'columns' | 'rows';
  autoDistribute: boolean;
  justification: 'disabled' | 'optional' | 'required';
  justificationFraction: number;
}

export interface StoredImageClassificationAnswer {
  id: string;
  imageUrl: string;
  feedback?: string;
  markPercent: number;
}

export interface StoredImageClassificationCategory {
  id: string;
  name: string;
  color: string;
  answers: StoredImageClassificationAnswer[];
}

export interface StoredImageClassificationQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'image_classification';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  categories: StoredImageClassificationCategory[];
  layout: 'columns' | 'rows';
  autoDistribute: boolean;
  justification: 'disabled' | 'optional' | 'required';
  justificationFraction: number;
}

export interface StoredMatchingLeftItem {
  id: string;
  text: string;
  imageUrl: string;
  multipleAnswers: boolean;
  linkedRightIds: string[];
  markPercent: number;
}

export interface StoredMatchingRightItem {
  id: string;
  text: string;
  imageUrl: string;
}

export interface StoredMatchingQuestion extends StoredQuestionFeedback {
  id: string;
  type: 'matching';
  name: string;
  text: string;
  mark: number;
  status: QuestionStatus;
  lastModified: string;
  leftItems: StoredMatchingLeftItem[];
  rightItems: StoredMatchingRightItem[];
  leftMode: 'text' | 'image';
  rightMode: 'text' | 'image';
  allowRightItemReuse: boolean;
  autoDistribute: boolean;
  penaltyPerWrongPair: number;
  justification: 'disabled' | 'optional' | 'required';
  justificationFraction: number;
}

export type StoredQuestion =
  | StoredTrueFalseQuestion
  | StoredShortAnswerQuestion
  | StoredMultipleChoiceQuestion
  | StoredEssayQuestion
  | StoredFillInBlanksQuestion
  | StoredFillInBlanksImageQuestion
  | StoredTextSequencingQuestion
  | StoredImageSequencingQuestion
  | StoredDragDropTextQuestion
  | StoredDragDropImageQuestion
  | StoredFreeHandDrawingQuestion
  | StoredSelectCorrectWordQuestion
  | StoredRecordAudioQuestion
  | StoredNumericalQuestion
  | StoredHighlightCorrectWordQuestion
  | StoredMultipleHotspotsQuestion
  | StoredTextClassificationQuestion
  | StoredImageClassificationQuestion
  | StoredMatchingQuestion;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create questions store with indexes for all question types
      if (!db.objectStoreNames.contains(STORE_NAMES.questions)) {
        const store = db.createObjectStore(STORE_NAMES.questions, { keyPath: 'id' });

        // Add indexes for efficient querying
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

export function putQuestion(question: StoredQuestion): Promise<void> {
  return getDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.questions, 'readwrite');
      const store = tx.objectStore(STORE_NAMES.questions);
      const request = store.put(question);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  });
}

export function getQuestions(): Promise<StoredQuestion[]> {
  return getDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.questions, 'readonly');
      const store = tx.objectStore(STORE_NAMES.questions);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  });
}

export function deleteQuestion(id: string): Promise<void> {
  return getDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.questions, 'readwrite');
      const store = tx.objectStore(STORE_NAMES.questions);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  });
}

export function getQuestionById(id: string): Promise<StoredQuestion | undefined> {
  return getDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.questions, 'readonly');
      const store = tx.objectStore(STORE_NAMES.questions);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}

export function getQuestionsByType(type: string): Promise<StoredQuestion[]> {
  return getDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.questions, 'readonly');
      const store = tx.objectStore(STORE_NAMES.questions);
      const index = store.index('type');
      const request = index.getAll(type);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  });
}
