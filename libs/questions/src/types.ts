export type QuestionComponentProps<T = Record<string, unknown>> = {
  data: T;
  onInputChange: (field: string, value: unknown) => void;
};
