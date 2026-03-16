import type { QuestionRow } from '../../components/QuestionsTable';

export type SelectCorrectWordQuestionViewProps = {
  question: QuestionRow;
};

export type DecodedOption = {
  id: number;
  text: string;
  isCorrect: boolean;
};

export type DecodedGroup = {
  key: string;
  options: DecodedOption[];
};

export type ParsedPart =
  | { type: 'text'; content: string }
  | { type: 'key'; key: string };
