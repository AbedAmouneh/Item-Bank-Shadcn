import { memo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useEditorConfig } from '../hooks/useEditorConfig';
import { cn } from '@item-bank/ui';

type EditorVariant = 'choice' | 'feedback';

type ChoiceEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height: number;
  placeholder: string;
  variant?: EditorVariant;
};

function ChoiceEditor({
  value,
  onChange,
  height,
  placeholder,
  variant = 'choice',
}: ChoiceEditorProps) {
  const editorConfig = useEditorConfig(height, placeholder, variant);

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        variant === 'feedback'
          ? 'border-[hsl(var(--choice-editor-border))] bg-[hsl(var(--choice-feedback-background))]'
          : 'border-[hsl(var(--choice-editor-border))] bg-[hsl(var(--choice-editor-background))]'
      )}
    >
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        value={value}
        onEditorChange={onChange}
        init={{
          ...editorConfig,
          height,
          placeholder,
        }}
      />
    </div>
  );
}

export default memo(ChoiceEditor);
