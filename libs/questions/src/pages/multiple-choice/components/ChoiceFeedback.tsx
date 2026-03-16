import { memo } from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box className="mt-2">
      <Typography
        variant="caption"
        component="span"
        className="block mb-2 font-medium"
        sx={{ color: 'text.secondary' }}
      >
        {t('editor.choice_feedback')}
      </Typography>
      <ChoiceEditor
        value={feedbackText}
        onChange={onChange}
        height={90}
        placeholder={t('editor.feedback_placeholder')}
        variant="feedback"
      />
    </Box>
  );
}

export default memo(ChoiceFeedback);
