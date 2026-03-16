import { useMemo } from 'react';
import { useTheme, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';

type EditorVariant = 'choice' | 'feedback';

export function useEditorConfig(
  height: number,
  placeholder: string,
  variant: EditorVariant = 'choice'
) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isDarkMode = theme.palette.mode === 'dark';

  return useMemo(() => {
    const fontSize = variant === 'feedback' ? '13px' : '14px';
    const lineHeight = variant === 'feedback' ? '1.5' : '1.6';
    const padding = variant === 'feedback' ? '10px' : '12px';

    const contentStyle = isDarkMode
      ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: ${fontSize}; line-height: ${lineHeight}; padding: ${padding}; background-color: ${theme.palette.background.default}; color: ${alpha(theme.palette.text.primary, 0.9)}; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: rgba(255, 255, 255, 0.7) !important; }`
      : `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: ${fontSize}; line-height: ${lineHeight}; padding: ${padding}; }`;

    return {
      height,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
      plugins: ['lists', 'link'],
      toolbar:
        variant === 'feedback'
          ? 'bold italic underline | bullist numlist | link'
          : 'bold italic underline strikethrough | bullist numlist | link',
      toolbar_mode: 'floating' as const,
      statusbar: false,
      placeholder,
      content_style: contentStyle,
    };
  }, [height, placeholder, isDarkMode, i18n.language, theme.palette, variant]);
}
