import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@item-bank/ui';
import {
  QuestionEditorShell,
  QuestionsTable,
  type QuestionType,
  type QuestionFormData,
  QuestionViewShell,
  type QuestionRow,
} from '@item-bank/questions';
import { putQuestion, getQuestions, deleteQuestion, getQuestionById } from '../../db/db';
import { storedToRow } from '../../utils/questionConverters';
import { createStoredQuestion } from '../../utils/questionFactory';
import { storedToFormData } from '../../utils/questionToFormData';

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

const severityClasses: Record<SnackbarSeverity, string> = {
  success: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
};

interface SnackbarNotificationProps {
  message: string;
  severity: SnackbarSeverity;
  onClose: () => void;
}

/** Fixed bottom-center notification that auto-dismisses after 4 seconds. */
function SnackbarNotification({ message, severity, onClose }: SnackbarNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 start-1/2 z-50 -translate-x-1/2">
      <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${severityClasses[severity]}`}>
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="ms-2 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function rowToFormData(row: QuestionRow): QuestionFormData | null {
  if (row.type === 'true_false') {
    return {
      id: String(row.id),
      type: 'true_false',
      name: row.questionName,
      mark: row.mark,
      text: row.question_text,
      correctAnswer: row.correct_choice ? 'True' : 'False',
    };
  }
  if (row.type === 'short_answer') {
    const choices = row.choices ?? [];
    const answers = choices.length > 0
      ? choices.map((c) => ({
          id: crypto.randomUUID(),
          text: c.answer,
          mark: Math.round(parseFloat(c.fraction ?? '0') * 100),
          ignoreCasing: c.ignore_casing,
          feedback: !!c.feedback,
        }))
      : [{ id: crypto.randomUUID(), text: '', mark: 100, ignoreCasing: true, feedback: false }];
    return {
      id: String(row.id),
      type: 'short_answer',
      name: row.questionName,
      mark: row.mark,
      text: row.question_text,
      answers,
    };
  }
  return null;
}

const Home = () => {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [questionViewOpen, setQuestionViewOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionRow | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [initialFormData, setInitialFormData] = useState<QuestionFormData | undefined>(undefined);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>('success');
  const selectedQuestionType = useRef<QuestionType | null>(null);
  const selectedQuestion = useRef<QuestionRow | null>(null);
  const questionToEditId = useRef<string | number | null>(null);

  const loadQuestions = useCallback(() => {
    getQuestions()
      .then((stored) => setQuestions(stored.map(storedToRow)))
      .catch((err) => {
        console.error('Failed to load questions from IndexedDB', err);
        setSnackbarSeverity('error');
        setSnackbarMessage('Failed to load questions.');
        setSnackbarOpen(true);
      });
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleQuestionTypeChange = useCallback((questionType: QuestionType) => {
    setQuestionToEdit(null);
    selectedQuestionType.current = questionType;
    setEditorMode('create');
    questionToEditId.current = null;
    setInitialFormData(undefined);
    setIsEditorOpen(true);
  }, []);

  const handleEditQuestion = useCallback((row: QuestionRow) => {
    getQuestionById(String(row.id))
      .then((storedQuestion) => {
        if (!storedQuestion) {
          console.error('Question not found:', row.id);
          return;
        }

        if (
          storedQuestion.type === 'multiple_choice' ||
          storedQuestion.type === 'essay' ||
          storedQuestion.type === 'fill_in_blanks' ||
          storedQuestion.type === 'fill_in_blanks_image' ||
          storedQuestion.type === 'true_false' ||
          storedQuestion.type === 'short_answer' ||
          storedQuestion.type === 'text_sequencing' ||
          storedQuestion.type === 'image_sequencing' ||
          storedQuestion.type === 'free_hand_drawing' ||
          storedQuestion.type === 'select_correct_word' ||
          storedQuestion.type === 'record_audio' ||
          storedQuestion.type === 'numerical' ||
          storedQuestion.type === 'highlight_correct_word' ||
          storedQuestion.type === 'multiple_hotspots' ||
          storedQuestion.type === 'drag_drop_text' ||
          storedQuestion.type === 'drag_drop_image' ||
          storedQuestion.type === 'text_classification' ||
          storedQuestion.type === 'image_classification' ||
          storedQuestion.type === 'matching'
        ) {
          // Use storedToFormData for new types, rowToFormData for legacy types
          let formData: QuestionFormData | null = null;
          if (storedQuestion.type === 'true_false' || storedQuestion.type === 'short_answer') {
            formData = rowToFormData(row);
          } else {
            // text_sequencing, image_sequencing, multiple_choice, essay, fill_in_blanks, free_hand_drawing, record_audio use storedToFormData
            formData = storedToFormData(storedQuestion);
          }

          if (formData) {
            selectedQuestionType.current = formData.type;
            questionToEditId.current = row.id;
            setInitialFormData(formData);
            setEditorMode('edit');
            setQuestionToEdit(row);
            setIsEditorOpen(true);
          }
        } else {
          console.error('Edit not supported for this question type yet');
        }
      })
      .catch((err) => console.error('Failed to load question for editing', err));
  }, []);

  const handleSave = useCallback(
    (questionData: QuestionFormData, questionId?: string | number) => {
      const storedQuestion = createStoredQuestion(questionData);

      if (storedQuestion) {
        if (editorMode === 'edit' && (questionId || questionToEditId.current)) {
          storedQuestion.id = String(questionId || questionToEditId.current);
          storedQuestion.lastModified = new Date().toISOString();
        }

        putQuestion(storedQuestion)
          .then(() => {
            loadQuestions();
            setQuestionToEdit(null);
            setEditorMode('create');
            questionToEditId.current = null;
            setInitialFormData(undefined);
            setIsEditorOpen(false);
            setSnackbarSeverity('success');
            setSnackbarMessage(editorMode === 'edit' ? 'Question updated successfully.' : 'Question created successfully.');
            setSnackbarOpen(true);
          })
          .catch((err) => {
            console.error('Failed to save question to IndexedDB', err);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save question.');
            setSnackbarOpen(true);
          });
      } else if (questionData.type === 'text_sequencing') {
        // Factory validation failed — RHF should have blocked submission,
        // but as a safety net we stay in the editor rather than silently
        // discarding the user's data.
        console.error('Text sequencing factory validation failed — keeping editor open');
      } else if (questionData.type === 'image_sequencing') {
        // Factory validation failed — RHF should have blocked submission,
        // but as a safety net we stay in the editor rather than silently
        // discarding the user's data.
        console.error('Image sequencing factory validation failed — keeping editor open');
      } else if (questionData.type === 'highlight_correct_word') {
        console.error('Highlight correct word factory validation failed — keeping editor open');
      } else if (questionData.type === 'drag_drop_text') {
        console.error('Drag drop text factory validation failed — keeping editor open');
      } else if (questionData.type === 'drag_drop_image') {
        console.error('Drag drop image factory validation failed — keeping editor open');
      } else if (questionData.type === 'matching') {
        console.error('Matching factory validation failed — keeping editor open');
      } else if (questionData.type === 'true_false') {
        console.error('True false factory validation failed — keeping editor open');
      } else {
        console.error('Unsupported question type:', questionData.type);
        setQuestionToEdit(null);
        setEditorMode('create');
        questionToEditId.current = null;
        setInitialFormData(undefined);
        setIsEditorOpen(false);
      }
    },
    [loadQuestions, editorMode]
  );

  const closeEditor = useCallback(() => {
    setQuestionToEdit(null);
    setEditorMode('create');
    questionToEditId.current = null;
    setInitialFormData(undefined);
    setIsEditorOpen(false);
  }, []);

  const handleQuestionViewOpen = useCallback((row: QuestionRow | null) => {
    selectedQuestion.current = row;
    setQuestionViewOpen(true);
  }, []);

  const handleDeleteQuestion = useCallback(
    (row: QuestionRow) => {
      deleteQuestion(String(row.id))
        .then(() => {
          loadQuestions();
          setSnackbarSeverity('success');
          setSnackbarMessage('Question deleted successfully.');
          setSnackbarOpen(true);
        })
        .catch((err) => {
          console.error('Failed to delete question from IndexedDB', err);
          setSnackbarSeverity('error');
          setSnackbarMessage('Failed to delete question.');
          setSnackbarOpen(true);
        });
    },
    [loadQuestions]
  );

  return (
    <div className="w-full">
      <QuestionsTable
        questions={questions}
        onQuestionTypeChange={handleQuestionTypeChange}
        handleQuestionViewOpen={handleQuestionViewOpen}
        onEditQuestion={handleEditQuestion}
        onDeleteQuestion={handleDeleteQuestion}
      />

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="max-w-3xl">
          {(questionToEdit ? questionToEdit.type : selectedQuestionType.current) && (
            <QuestionEditorShell
              key={questionToEdit ? questionToEdit.id : 'new'}
              questionType={questionToEdit ? questionToEdit.type : selectedQuestionType.current ?? 'true_false'}
              onSave={handleSave}
              onCancel={closeEditor}
              initialData={initialFormData}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Question View Dialog */}
      <Dialog open={questionViewOpen} onOpenChange={(open) => { if (!open) setQuestionViewOpen(false); }}>
        <DialogContent
          className={selectedQuestion.current?.type === 'free_hand_drawing' ? 'max-w-5xl' : 'max-w-3xl'}
        >
          <QuestionViewShell question={selectedQuestion.current} />
        </DialogContent>
      </Dialog>

      {/* Snackbar notification */}
      {snackbarOpen && (
        <SnackbarNotification
          message={snackbarMessage}
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;
