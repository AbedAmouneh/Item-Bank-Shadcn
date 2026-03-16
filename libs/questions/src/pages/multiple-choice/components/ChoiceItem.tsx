import { memo } from 'react';
import {
  Box,
  Switch,
  FormControlLabel,
  IconButton,
  styled,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import ChoiceEditor from './ChoiceEditor';
import ChoiceFeedback from './ChoiceFeedback';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

type ChoiceItemProps = {
  choice: Choice;
  index: number;
  canDelete: boolean;
  onTextChange: (id: string, value: string) => void;
  onCorrectToggle: (id: string, checked: boolean) => void;
  onFeedbackToggle: (id: string, checked: boolean) => void;
  onFeedbackTextChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
};

const ChoiceCard = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.semantic.choiceItem.background,
  border: `1px solid ${theme.palette.semantic.choiceItem.border}`,
}));

function ChoiceItem({
  choice,
  index,
  canDelete,
  onTextChange,
  onCorrectToggle,
  onFeedbackToggle,
  onFeedbackTextChange,
  onDelete,
}: ChoiceItemProps) {
  const { t } = useTranslation('questions');

  return (
    <ChoiceCard className="flex flex-col gap-4 p-5 relative">
      <ChoiceEditor
        value={choice.text}
        onChange={(value) => onTextChange(choice.id, value)}
        height={120}
        placeholder={t('editor.choice_placeholder', { index: index + 1 })}
        variant="choice"
      />

      <Box className="flex justify-between items-center flex-wrap gap-2">
        <Box className="flex gap-4 items-center">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={choice.isCorrect}
                onChange={(e) => onCorrectToggle(choice.id, e.target.checked)}
              />
            }
            label={t('editor.correct')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={choice.feedbackEnabled}
                onChange={(e) => onFeedbackToggle(choice.id, e.target.checked)}
              />
            }
            label={t('editor.feedback')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
          />
        </Box>

        <IconButton
          size="small"
          onClick={() => onDelete(choice.id)}
          disabled={!canDelete}
          aria-label={t('editor.delete_choice')}
          sx={{
            color: canDelete ? 'error.main' : 'action.disabled',
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      {choice.feedbackEnabled && (
        <ChoiceFeedback
          feedbackText={choice.feedbackText}
          onChange={(value) => onFeedbackTextChange(choice.id, value)}
          choiceId={choice.id}
        />
      )}
    </ChoiceCard>
  );
}

export default memo(ChoiceItem);
