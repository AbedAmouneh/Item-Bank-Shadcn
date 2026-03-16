import { Box, Typography, alpha, styled } from '@mui/material';
import type { ReactNode } from 'react';

interface QuestionTypeTileProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  selected?: boolean;
}

const TileRoot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  border: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  backgroundColor: selected
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.07)
    : 'transparent',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.06),
  },
  '&:focus-visible': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
}));

const IconCircle = styled(Box)(({ theme }) => ({
    width: 72,
    height: 72,
    borderRadius: '50%',
  backgroundColor: alpha(
    theme.palette.primary.main,
    theme.palette.mode === 'dark' ? 0.15 : 0.08,
  ),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color:
    theme.palette.mode === 'dark'
      ? theme.palette.primary.light
      : theme.palette.primary.dark,
  flexShrink: 0,
  '& svg': {
    fontSize: 32,
  },
}));

export default function QuestionTypeTile({
  label,
  icon,
  onClick,
  selected,
}: QuestionTypeTileProps) {
  return (
    <TileRoot
      className="flex flex-col items-center gap-3 py-5 px-3 rounded-2xl cursor-pointer transition-colors duration-150 ease-in-out select-none outline-none"
      selected={selected}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <IconCircle>{icon}</IconCircle>
      <Typography
        variant="body2"
        align="center"
        className="max-w-[100px]"
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          lineHeight: 1.35,
          color: 'text.primary',
        }}
      >
        {label}
      </Typography>
    </TileRoot>
  );
}
