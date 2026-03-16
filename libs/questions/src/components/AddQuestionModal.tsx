import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
  alpha,
  styled,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ShortTextIcon from '@mui/icons-material/ShortText';
import ArticleIcon from '@mui/icons-material/Article';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ImageIcon from '@mui/icons-material/Image';
import GestureIcon from '@mui/icons-material/Gesture';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import PlaceIcon from '@mui/icons-material/Place';
import CalculateIcon from '@mui/icons-material/Calculate';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import ReorderIcon from '@mui/icons-material/Reorder';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import HighlightIcon from '@mui/icons-material/Highlight';
import MicIcon from '@mui/icons-material/Mic';
import CategoryIcon from '@mui/icons-material/Category';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useTranslation } from 'react-i18next';
import QuestionTypeTile from './QuestionTypeTile';
import { PICKER_QUESTION_TYPES } from './questionTypePickerData';
import type { QuestionType } from '../domain/types';

interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: QuestionType) => void;
}

const TILE_ICONS: Record<QuestionType, React.ReactElement> = {
  true_false: <CheckCircleOutlineIcon />,
  multiple_choice: <PlaylistAddCheckIcon />,
  short_answer: <ShortTextIcon />,
  essay: <ArticleIcon />,
  drag_drop_text: <DragHandleIcon />,
  drag_drop_image: <ImageIcon />,
  free_hand_drawing: <GestureIcon />,
  image_sequencing: <ViewCarouselIcon />,
  multiple_hotspots: <PlaceIcon />,
  numerical: <CalculateIcon />,
  fill_in_blanks: <NoteAltIcon />,
  select_correct_word: <SpellcheckIcon />,
  text_sequencing: <ReorderIcon />,
  fill_in_blanks_image: <FindInPageIcon />,
  highlight_correct_word: <HighlightIcon />,
  record_audio: <MicIcon />,
  text_classification: <CategoryIcon />,
  image_classification: <PhotoLibraryIcon />,
  matching: <AccountTreeIcon />,
};

const ModalHeader = styled(Box)(({ theme }) => ({
  gap: theme.spacing(2),
  padding: theme.spacing(2.5, 3, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
}));

const SearchField = styled(TextField)(({ theme }) => ({
  width: 220,
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1.5),
    fontSize: '0.875rem',
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.paper, 0.6)
        : alpha(theme.palette.action.hover, 0.5),
    '& fieldset': {
      borderColor: alpha(theme.palette.divider, 0.5),
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

const TileGrid = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
}));

export default function AddQuestionModal({
  open,
  onClose,
  onSelectType,
}: AddQuestionModalProps) {
  const { t } = useTranslation('questions');
  const [search, setSearch] = useState('');

  // Reset search whenever modal is opened
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = useCallback(
    (type: QuestionType) => {
      onSelectType(type);
      onClose();
    },
    [onSelectType, onClose],
  );

  const filteredTypes = search.trim()
    ? PICKER_QUESTION_TYPES.filter((type) =>
        t(`types.${type}`).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : PICKER_QUESTION_TYPES;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      {/* Custom header — title + search + close */}
      <DialogTitle component="div" className="p-0">
        <ModalHeader className="flex items-center justify-between">
          <Typography variant="h6" fontWeight={600} component="span">
            {t('add_questions_title')}
          </Typography>

          <Box className="flex items-center gap-2">
            <SearchField
              size="small"
              placeholder={t('search_question_types')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton
              onClick={onClose}
              size="small"
              aria-label={t('cancel')}
              className="ml-1"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </ModalHeader>
      </DialogTitle>

      {/* Scrollable tile grid */}
      <DialogContent className="p-6 overflow-y-auto">
        {filteredTypes.length > 0 ? (
          <TileGrid className="grid grid-cols-4 gap-1">
            {filteredTypes.map((type) => (
              <QuestionTypeTile
                key={type}
                label={t(`types.${type}`)}
                icon={TILE_ICONS[type]}
                onClick={() => handleSelect(type)}
              />
            ))}
          </TileGrid>
        ) : (
          <Box className="py-12 text-center">
            <Typography color="text.secondary" variant="body2">
              {t('no_types_found')}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
