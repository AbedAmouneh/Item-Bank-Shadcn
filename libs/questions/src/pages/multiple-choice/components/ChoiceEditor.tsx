import { memo } from 'react';
import { Box, styled, alpha } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { useEditorConfig } from '../hooks/useEditorConfig';

type EditorVariant = 'choice' | 'feedback';

type ChoiceEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height: number;
  placeholder: string;
  variant?: EditorVariant;
};

const ChoiceEditorWrapper = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.semantic.choiceEditor.border}`,
  backgroundColor: theme.palette.semantic.choiceEditor.background,
  '& .tox-tinymce': {
    border: 'none !important',
  },
  '& .tox .tox-toolbar': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)} !important`,
  },
}));

function ChoiceEditor({
  value,
  onChange,
  height,
  placeholder,
  variant = 'choice',
}: ChoiceEditorProps) {
  const editorConfig = useEditorConfig(height, placeholder, variant);

  return (
    <ChoiceEditorWrapper className="overflow-hidden">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        value={value}
        onEditorChange={onChange}
        init={editorConfig}
      />
    </ChoiceEditorWrapper>
  );
}

export default memo(ChoiceEditor);
