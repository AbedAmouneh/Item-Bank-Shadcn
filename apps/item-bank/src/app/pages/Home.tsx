import { Alert, Box, Dialog, DialogContent, IconButton, Snackbar } from '@mui/material';
import { useState, useRef, useCallback, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
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
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
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
    <Box className="w-full">
      <QuestionsTable
        questions={questions}
        onQuestionTypeChange={handleQuestionTypeChange}
        handleQuestionViewOpen={handleQuestionViewOpen}
        onEditQuestion={handleEditQuestion}
        onDeleteQuestion={handleDeleteQuestion}
      />
      
      <Dialog
        open={isEditorOpen}
        onClose={closeEditor}
        maxWidth="md"
        fullWidth
      >
        <IconButton
          onClick={closeEditor}
          className="absolute right-2 top-2"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent className="pt-12">
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
      <Dialog
        open={questionViewOpen}
        onClose={() => setQuestionViewOpen(false)}
        maxWidth={selectedQuestion.current?.type === 'free_hand_drawing' ? 'lg' : 'md'}
        fullWidth
      >
        <IconButton
          onClick={() => setQuestionViewOpen(false)}
          className="absolute right-2 top-2"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent className="pt-12">
          <QuestionViewShell
            question={selectedQuestion.current}
          >

          </QuestionViewShell>
        </DialogContent>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setSnackbarOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          elevation={6}
          variant="filled"
          className="w-full"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;
