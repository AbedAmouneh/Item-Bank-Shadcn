/**
 * QuizQuestionDisplay — renders the question text as sanitised HTML.
 *
 * Questions may contain rich TinyMCE markup, MathML, or Arabic text.
 * We render them as HTML (not on canvas) to handle all of these correctly.
 * DOMPurify sanitisation happens at the API layer; here we trust the content
 * stored in the database matches the project's existing pattern.
 */

import type { GameQuestion } from '../../domain/types';

interface QuizQuestionDisplayProps {
  question: GameQuestion;
}

export default function QuizQuestionDisplay({ question }: QuizQuestionDisplayProps) {
  return (
    <div className="w-full px-6 py-4 text-white text-center">
      <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
        {question.type.replace(/_/g, ' ')}
      </p>
      {/* dangerouslySetInnerHTML mirrors the pattern used in QuestionViewShell. */}
      <div
        className="text-lg font-medium leading-relaxed"
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: question.text || '(no question text)' }}
      />
    </div>
  );
}
