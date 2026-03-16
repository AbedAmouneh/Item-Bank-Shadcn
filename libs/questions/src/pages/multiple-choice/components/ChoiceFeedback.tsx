import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import ChoiceEditor from './ChoiceEditor';

type ChoiceFeedbackProps = {
  feedbackText: string;
  onChange: (value: string) => void;
  choiceId: string;
};

function ChoiceFeedback({ feedbackText, onChange, choiceId }: ChoiceFeedbackProps) {
  const { t } = useTranslation('questions');

  return (
    <div className="mt-1">
      <span className="block mb-2 text-xs font-medium text-muted-foreground">
        {t('editor.choice_feedback')}
      </span>
      <ChoiceEditor
        value={feedbackText}
        onChange={onChange}
        height={90}
        placeholder={t('editor.feedback_placeholder')}
        variant="feedback"
      />
    </div>
  );
}

export default memo(ChoiceFeedback);
