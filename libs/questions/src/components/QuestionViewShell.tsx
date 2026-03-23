import { QuestionRow } from './QuestionsTable';
import TrueFalseQuestionView from '../pages/true-false/TrueFalseQuestionView';
import ShortAnswerQuestionView from '../pages/short-answer/ShortAnswerQuestionView';
import MultipleChoiceQuestionView from '../pages/multiple-choice/MultipleChoiceQuestionView';
import EssayQuestionView from '../pages/essay/EssayQuestionView';
import FillInBlanksQuestionView from '../pages/fill-in-blanks/FillInBlanksQuestionView';
import FillInBlanksImageView from '../pages/fill-in-blanks-image/FillInBlanksImageView';
import TextSequencingQuestionView from '../pages/text-sequencing/TextSequencingQuestionView';
import ImageSequencingQuestionView from '../pages/image-sequencing/ImageSequencingQuestionView';
import FreeHandDrawingQuestionView from '../pages/free-hand-drawing/FreeHandDrawingQuestionView';
import SelectCorrectWordQuestionView from '../pages/select-correct-word/SelectCorrectWordQuestionView';
import RecordAudioQuestionView from '../pages/record-audio/RecordAudioQuestionView';
import NumericalQuestionView from '../pages/numerical/NumericalQuestionView';
import HighlightCorrectWordQuestionView from '../pages/highlight-correct-word/HighlightCorrectWordQuestionView';
import MultipleHotspotsQuestionView from '../pages/multiple-hotspots/MultipleHotspotsQuestionView';
import DragDropTextQuestionView from '../pages/drag-drop-text/DragDropTextQuestionView';
import DragDropImageView from '../pages/drag-drop-image/DragDropImageView';
import TextClassificationView from '../pages/text-classification/TextClassificationView';
import ImageClassificationView from '../pages/image-classification/ImageClassificationView';
import { MatchingView } from '../pages/matching';
import { CrosswordView } from '../pages/crossword';
import { SpellingDictationView } from '../pages/spelling-dictation';
import DOMPurify from 'dompurify';

type QuestionViewShellProps = {
  question: QuestionRow | null;
};

const QuestionViewShell = ({ question }: QuestionViewShellProps) => {
  return (
    <div className="p-6 rounded-xl border border-[hsl(var(--question-view-border))] bg-[hsl(var(--question-view-background))]">
      <h2 className="text-[1.25rem] font-semibold py-4 text-foreground">{question?.questionName}</h2>
      {question?.type !== 'select_correct_word' && question?.type !== 'highlight_correct_word' && question?.type !== 'drag_drop_text' && question?.type !== 'drag_drop_image' && question && (
        <div className="text-[0.95rem] font-medium mb-2 text-[hsl(var(--question-view-question-text))]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.question_text) }} />
      )}
      {
      question?.type === 'true_false' ? <TrueFalseQuestionView question={question} /> :
      question?.type === 'short_answer' ? <ShortAnswerQuestionView question={question} /> :
      question?.type === 'multiple_choice' ? <MultipleChoiceQuestionView question={question} /> :
      question?.type === 'essay' ? <EssayQuestionView question={question} /> :
      question?.type === 'fill_in_blanks' ? <FillInBlanksQuestionView question={question} /> :
      question?.type === 'fill_in_blanks_image' ? <FillInBlanksImageView question={question} /> :
      question?.type === 'text_sequencing' ? <TextSequencingQuestionView question={question} /> :
      question?.type === 'image_sequencing' ? <ImageSequencingQuestionView question={question} /> :
      question?.type === 'free_hand_drawing' ? (
        <FreeHandDrawingQuestionView
          question={question}
          canvasWidth={question.canvas_width}
          canvasHeight={question.canvas_height}
          backgroundImage={question.background_image}
        />
      ) :
      question?.type === 'select_correct_word' ? <SelectCorrectWordQuestionView question={question} /> :
      question?.type === 'record_audio' ? (
        <RecordAudioQuestionView question={question} />
      ) :
      question?.type === 'numerical' ? (
        <NumericalQuestionView question={question} />
      ) :
      question?.type === 'highlight_correct_word' ? (
        <HighlightCorrectWordQuestionView question={question} />
      ) :
      question?.type === 'multiple_hotspots' ? (
        <MultipleHotspotsQuestionView question={question} />
      ) :
      question?.type === 'drag_drop_text' ? (
        <DragDropTextQuestionView question={question} />
      ) :
      question?.type === 'drag_drop_image' ? (
        <DragDropImageView question={question} />
      ) :
      question?.type === 'text_classification' ? (
        <TextClassificationView question={question} />
      ) :
      question?.type === 'image_classification' ? (
        <ImageClassificationView question={question} />
      ) :
      question?.type === 'matching' ? (
        <MatchingView question={question} />
      ) :
      question?.type === 'crossword' ? (
        <CrosswordView question={question} />
      ) :
      question?.type === 'spelling_dictation' ? (
        <SpellingDictationView question={question} />
      ) : null
      }
    </div>
  );
};

export default QuestionViewShell;
