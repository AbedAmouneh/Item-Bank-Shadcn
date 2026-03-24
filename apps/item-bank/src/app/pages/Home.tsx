import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@item-bank/ui';
import {
  QuestionEditorShell,
  QuestionCardList,
  type QuestionType,
  type QuestionFormData,
  type QuestionRow,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
} from '@item-bank/questions';
import { getQuestion } from '@item-bank/api';
import { normalizeStatus, formatLastModified } from '../../utils/questionUtils';
import { formDataToApiPayload } from '../../utils/questionToApiPayload';
import { apiQuestionToFormData } from '../../utils/apiQuestionToFormData';

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

/** Convert an API Question to the QuestionRow shape expected by QuestionsTable. */
function apiToRow(q: {
  id: number;
  name: string;
  type: string;
  text?: string;
  mark?: number;
  status: string;
  updated_at?: string;
}): QuestionRow {
  return {
    id: q.id,
    type: q.type as QuestionType,
    questionName: q.name,
    mark: Number(q.mark ?? 0),
    status: normalizeStatus(q.status),
    lastModified: q.updated_at ? formatLastModified(q.updated_at) : '',
    question_text: q.text ?? '',
  };
}

const Home = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionRow | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [initialFormData, setInitialFormData] = useState<QuestionFormData | undefined>(undefined);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>('success');
  const selectedQuestionType = useRef<QuestionType | null>(null);
  const questionToEditId = useRef<string | number | null>(null);

  // Fetch all questions at once so the card grid can filter client-side.
  const { data: questionsPage, isError } = useQuestions({ limit: 100 });
  const questions: QuestionRow[] = (questionsPage?.items ?? []).map(apiToRow);

  const { mutate: createQuestionMutate } = useCreateQuestion();
  const { mutate: updateQuestionMutate } = useUpdateQuestion();

  const handleQuestionTypeChange = useCallback((questionType: QuestionType) => {
    setQuestionToEdit(null);
    selectedQuestionType.current = questionType;
    setEditorMode('create');
    questionToEditId.current = null;
    setInitialFormData(undefined);
    setIsEditorOpen(true);
  }, []);

  const handleEditQuestion = useCallback((row: QuestionRow) => {
    getQuestion(row.id as number)
      .then((question) => {
        const formData = apiQuestionToFormData(question);
        if (!formData) return;
        selectedQuestionType.current = formData.type;
        questionToEditId.current = row.id;
        setInitialFormData(formData);
        setEditorMode('edit');
        setQuestionToEdit(row);
        setIsEditorOpen(true);
      })
      .catch(() => {
        setSnackbarSeverity('error');
        setSnackbarMessage('Failed to load question for editing.');
        setSnackbarOpen(true);
      });
  }, []);

  const closeEditor = useCallback(() => {
    setQuestionToEdit(null);
    setEditorMode('create');
    questionToEditId.current = null;
    setInitialFormData(undefined);
    setIsEditorOpen(false);
  }, []);

  const handleSave = useCallback(
    (questionData: QuestionFormData) => {
      const successMsg =
        editorMode === 'edit' ? 'Question updated successfully.' : 'Question created successfully.';

      const payload = formDataToApiPayload(questionData);
      if (!payload) {
        // Validation failed for this type — keep the editor open.
        return;
      }

      if (editorMode === 'edit' && questionToEditId.current) {
        updateQuestionMutate(
          { id: Number(questionToEditId.current), data: payload },
          {
            onSuccess: () => {
              closeEditor();
              setSnackbarSeverity('success');
              setSnackbarMessage(successMsg);
              setSnackbarOpen(true);
            },
            onError: () => {
              setSnackbarSeverity('error');
              setSnackbarMessage('Failed to save question.');
              setSnackbarOpen(true);
            },
          }
        );
      } else {
        createQuestionMutate(payload, {
          onSuccess: () => {
            closeEditor();
            setSnackbarSeverity('success');
            setSnackbarMessage(successMsg);
            setSnackbarOpen(true);
          },
          onError: () => {
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save question.');
            setSnackbarOpen(true);
          },
        });
      }
    },
    [editorMode, closeEditor, createQuestionMutate, updateQuestionMutate]
  );

  const handleQuestionViewOpen = useCallback((row: QuestionRow | null) => {
    if (row) navigate(`/questions/${row.id}/preview`);
  }, [navigate]);

  return (
    <div className="w-full px-8 py-8">
      {isError && (
        <p className="text-destructive mb-4">Failed to load questions</p>
      )}
      <QuestionCardList
        questions={questions}
        onEditQuestion={handleEditQuestion}
        onPreviewQuestion={handleQuestionViewOpen}
        onQuestionTypeChange={handleQuestionTypeChange}
      />

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open: boolean) => { if (!open) closeEditor(); }}>
        <DialogContent className="max-w-3xl">
          {(questionToEdit ? questionToEdit.type : selectedQuestionType.current) && (
            <QuestionEditorShell
              key={questionToEdit ? questionToEdit.id : 'new'}
              questionType={questionToEdit ? questionToEdit.type : selectedQuestionType.current ?? 'true_false'}
              onSave={handleSave}
              onCancel={closeEditor}
              initialData={initialFormData}
              questionId={questionToEdit ? Number(questionToEdit.id) : undefined}
            />
          )}
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
