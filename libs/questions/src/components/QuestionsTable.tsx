import { Box, Typography, Chip, IconButton, Paper, useTheme, alpha, styled, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { MRT_Localization_AR } from 'material-react-table/locales/ar'
import { useTranslation } from 'react-i18next'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { ActionButton } from '@item-bank/ui'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { type QuestionType } from '../domain/types'
import AddQuestionModal from './AddQuestionModal'
type QuestionStatus = 'Draft' | 'Published' | 'In Review'

export type QuestionChoice = {
  id: number,
  answer: string,
  fraction: string,
  feedback: string | null,
  ignore_casing: boolean,
}

export interface QuestionRow {
  id: number | string
  questionName: string
  type: QuestionType
  mark: number
  status: QuestionStatus
  lastModified: string
  question_text: string
  correct_choice?: boolean
  choices?: QuestionChoice[]
  multipleChoiceAllowPartialCredit?: boolean
  essayResponseFormat?: 'html' | 'html_with_file_picker' | 'plain_text'
  fillInBlanksContent?: string
  fillInBlanksRequireUniqueKeyAnswers?: boolean
  sequencingAllowPartialCredit?: boolean
  selectWordAllowPartialCredit?: boolean
  canvas_width?: number
  canvas_height?: number
  background_image?: string | null
  hotspots?: Array<{
    type: 'rectangle' | 'circle' | 'polygon'
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    points?: number[]
    color: string
    strokeWidth: number
    isCorrect: boolean
    mark?: number
  }>
  minSelections?: number
  maxSelections?: number
  hotspotsAllowPartialCredit?: boolean
  inputAreas?: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    answers: Array<{
      id: string
      text: string
      mark: number
      ignoreCasing: boolean
    }>
  }>
  // Record audio specific
  numberOfRecordingsMin?: number
  numberOfRecordingsMax?: number
  recordingDurationMinSeconds?: number
  recordingDurationMaxSeconds?: number
  // Highlight correct word specific
  highlightPenaltyPercent?: number
  // Drag-drop-text specific
  dragDropItems?: Array<{
    id: string;
    key: string;
    answer: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
  }>
  dragDropGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>
  // Drag-drop-image specific
  dragDropImageItems?: Array<{
    id: string;
    itemType: 'text' | 'image';
    answer: string;
    image?: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
    zones: Array<{ id: string; left: number; top: number; width?: number; height?: number }>;
  }>
  dragDropImageGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>
  justificationMode?: 'required' | 'optional' | 'disabled';
  justificationFraction?: number;
  // Numerical specific
  numericalAnswers?: Array<{
    id: string;
    answer: number;
    error: number;
    mark: number;
    feedback: boolean;
  }>
  numericalUnitHandling?: 'required' | 'optional' | 'disabled';
  numericalUnitInputMethod?: 'multiple_choice_selection' | 'drop_down' | 'text_input';
  numericalUnitPenalty?: number;
  numericalUnits?: Array<{
    id: string;
    unit: string;
    multiplier: number;
  }>
  // Text classification specific
  textClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      text: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>
  textClassificationLayout?: 'columns' | 'rows';
  textClassificationJustification?: 'disabled' | 'optional' | 'required';
  textClassificationJustificationFraction?: number;
  // Image classification specific
  imageClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      imageUrl: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>
  // Matching specific
  matchingLeftItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
    multipleAnswers: boolean;
    linkedRightIds: string[];
    markPercent: number;
  }>
  matchingRightItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
  }>
  matchingLeftMode?: 'text' | 'image';
  matchingRightMode?: 'text' | 'image';
  matchingJustification?: 'disabled' | 'optional' | 'required';
}

type QuestionsTableProps = {
  questions?: QuestionRow[]
  onQuestionTypeChange?: (questionType: QuestionType) => void
  handleQuestionViewOpen?: (row: QuestionRow) => void
  onEditQuestion?: (row: QuestionRow) => void
  onDeleteQuestion?: (row: QuestionRow) => void
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.surface.card,
  backgroundImage: 'none',
  backdropFilter: theme.palette.mode === 'dark' ? 'blur(20px) saturate(120%)' : 'none',
  border: `1px solid ${theme.palette.semantic.border.card}`,
  boxShadow: theme.palette.mode === 'dark'
    ? `0 8px 32px ${alpha(theme.palette.background.default, 0.5)}, 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`
    : theme.shadows[1],
}))

const StyledChip = styled(Chip)({
  '& .MuiChip-label': {
    padding: '0 12px',
  },
})

const QuestionsTable = ({ questions = [], onQuestionTypeChange, handleQuestionViewOpen, onEditQuestion, onDeleteQuestion }: QuestionsTableProps) => {
  const { t, i18n } = useTranslation('questions')
  const theme = useTheme()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<QuestionRow | null>(null)
  const selectedRow = useRef<QuestionRow | null>(null)

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>, row: QuestionRow) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    selectedRow.current = row
  }, [])

  const handleClose = useCallback(() => {
    setAnchorEl(null)
    selectedRow.current = null
  }, [])

  const viewQuestion = useCallback(() => {
    if (!selectedRow.current) return
    handleQuestionViewOpen?.(selectedRow.current)
    handleClose()
  }, [handleClose, handleQuestionViewOpen])

  const openEdit = useCallback(() => {
    if (!selectedRow.current) return
    onEditQuestion?.(selectedRow.current)
    handleClose()
  }, [handleClose, onEditQuestion])

  const openDeleteDialog = useCallback(() => {
    if (!selectedRow.current) return
    setQuestionToDelete(selectedRow.current)
    setDeleteDialogOpen(true)
    handleClose()
  }, [handleClose])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setQuestionToDelete(null)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!questionToDelete) return
    onDeleteQuestion?.(questionToDelete)
    closeDeleteDialog()
  }, [questionToDelete, onDeleteQuestion, closeDeleteDialog])

  const getTypeChipSx = useCallback((type: QuestionType) => {
    const isDark = theme.palette.mode === 'dark'
    const p = theme.palette
    const chip = (main: string, light?: string, dark?: string) => ({
      backgroundColor: isDark ? alpha(main, 0.22) : alpha(main, 0.12),
      color: isDark ? (light ?? main) : (dark ?? main),
    })
    const chipStyles: Record<QuestionType, object> = {
      multiple_choice: chip(p.primary.main, p.primary.light, p.primary.dark),
      short_answer: chip(p.secondary.main, p.secondary.light, p.secondary.dark),
      essay: chip(p.success.main, p.success.light, p.success.dark),
      true_false: chip(p.info.main, p.info.light, p.info.dark),
      fill_in_blanks: chip(p.warning.main, p.warning.light, p.warning.dark),
      record_audio: chip(p.error.main, p.error.light, p.error.dark),
      drag_drop_image: chip(p.primary.dark, p.primary.light, p.primary.dark),
      drag_drop_text: chip(p.secondary.dark, p.secondary.light, p.secondary.dark),
      free_hand_drawing: chip(p.grey[700], p.grey[400], p.grey[800]),
      image_sequencing: chip(p.success.dark, p.success.light, p.success.dark),
      multiple_hotspots: chip(p.info.dark, p.info.light, p.info.dark),
      numerical: chip(p.warning.dark, p.warning.light, p.warning.dark),
      select_correct_word: chip(p.error.dark, p.error.light, p.error.dark),
      text_sequencing: chip(p.grey[600], p.grey[300], p.grey[700]),
      fill_in_blanks_image: chip(p.grey[500], p.grey[300], p.grey[700]),
      highlight_correct_word: chip(p.grey[400], p.grey[200], p.grey[600]),
      text_classification: chip(p.info.main, p.info.light, p.info.dark),
      image_classification: chip(p.success.main, p.success.light, p.success.dark),
      matching: chip(p.warning.main, p.warning.light, p.warning.dark),
    }
    return chipStyles[type]
  }, [theme])

  const getStatusChipSx = useCallback((status: QuestionStatus) => {
    const isDark = theme.palette.mode === 'dark'
    const chipStyles: Record<QuestionStatus, object> = {
      Draft: {
        backgroundColor: isDark ? alpha(theme.palette.grey[400], 0.2) : alpha(theme.palette.grey[400], 0.1),
        color: isDark ? theme.palette.grey[400] : theme.palette.grey[700],
      },
      Published: {
        backgroundColor: isDark ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.success.main, 0.1),
        color: isDark ? theme.palette.success.light : theme.palette.success.dark,
      },
      'In Review': {
        backgroundColor: isDark ? alpha(theme.palette.warning.main, 0.2) : alpha(theme.palette.warning.main, 0.1),
        color: isDark ? theme.palette.warning.light : theme.palette.warning.dark,
      },
    }
    return chipStyles[status]
  }, [theme])

  const columns = useMemo<MRT_ColumnDef<QuestionRow>[]>(
    () => [
      {
        accessorKey: 'questionName',
        header: t('question_name'),
        size: 300,
        minSize: 300,
        grow: true,
        muiTableHeadCellProps: { align: 'left' },
        muiTableBodyCellProps: { align: 'left' },
        Cell: ({ cell }) => cell.getValue<string>() ?? '',
      },
      {
        accessorKey: 'type',
        header: t('type'),
        size: 180,
        enableSorting: true,
        muiTableHeadCellProps: { align: 'left' },
        muiTableBodyCellProps: { align: 'left' },
        Cell: ({ cell }) => {
          const typeValue = cell.getValue<string>();
          const typeKey = typeValue.toLowerCase().replace(/ /g, '_');
          return (
            <Box className="flex items-center h-full">
              <StyledChip
                className="font-medium text-[0.6875rem] h-[22px] rounded-[10px]"
                label={t(`types.${typeKey}`)}
                size="small"
                sx={getTypeChipSx(cell.getValue<QuestionType>())}
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'mark',
        header: t('mark'),
        size: 100,
        muiTableHeadCellProps: { align: 'left' },
        muiTableBodyCellProps: { align: 'left' },
      },
      {
        accessorKey: 'status',
        header: t('status'),
        size: 130,
        muiTableHeadCellProps: { align: 'left' },
        muiTableBodyCellProps: { align: 'left' },
        Cell: ({ cell }) => {
          const statusValue = cell.getValue<string>();
          const statusKey = statusValue.toLowerCase().replace(/ /g, '_');
          return (
            <Box className="flex items-center h-full">
              <StyledChip
                className="font-medium text-[0.6875rem] h-[22px] rounded-[10px]"
                label={t(`statuses.${statusKey}`)}
                size="small"
                sx={getStatusChipSx(cell.getValue<QuestionStatus>())}
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'lastModified',
        header: t('last_modified'),
        size: 140,
        muiTableHeadCellProps: { align: 'left' },
        muiTableBodyCellProps: { align: 'left' },
      },
      {
        id: 'actions',
        accessorFn: () => '',
        header: t('actions'),
        size: 80,
        enableSorting: false,
        muiTableHeadCellProps: { align: 'center' },
        muiTableBodyCellProps: { align: 'center' },
        Cell: ({ cell }) => (
          <Box className="flex items-center h-full justify-center">
            <IconButton 
              size="small" 
              sx={{ color: 'text.secondary' }} 
              onClick={(e) => handleClick(e, cell.row.original)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, getTypeChipSx, getStatusChipSx, handleClick]
  )

  const table = useMaterialReactTable({
    columns,
    data: questions,
    getRowId: (row) => String(row.id),
    localization: i18n.language === 'ar' ? MRT_Localization_AR : undefined,
    enableTopToolbar: true,
    enableRowSelection: false,
    enableColumnActions: false,
    enableColumnResizing: true,
    layoutMode: 'grid',
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 20, 50],
      showFirstButton: false,
      showLastButton: false,
    },
    muiTablePaperProps: ({ table: tableInst }) => ({
      elevation: 0,
      sx: {
        backgroundColor: tableInst.getState().isFullScreen
          ? theme.palette.semantic.surface.card
          : 'transparent',
        boxShadow: 'none',
        border: 'none',
      },
    }),
    muiTableContainerProps: ({ table: tableInst }) => ({
      sx: {
        width: '100%',
        overflow: tableInst.getState().isFullScreen ? 'auto' : 'visible',
      },
    }),
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        color: theme.palette.semantic.table.headColor,
        lineHeight: 1,
        px: 2,
        borderBottom: theme.palette.semantic.table.headBorder,
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        cursor: 'pointer',
        border: 'none',
        borderBottom: theme.palette.semantic.table.rowBorder,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.06),
        },
        ...(row.getIsSelected() && {
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.18),
          },
        }),
      },
    }),
    muiTableBodyCellProps: {
      sx: {
        border: 'none',
        px: 2,
        fontSize: '0.875rem',
        color: theme.palette.text.primary,
        '&:focus, &:focus-within': {
          outline: 'none',
        },
      },
    },
    muiBottomToolbarProps: {
      sx: {
        borderTop: `1px solid ${theme.palette.divider}`,
        height: 56,
        marginTop: theme.spacing(2),
        color: theme.palette.text.secondary,
        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
          fontSize: '0.8125rem',
        },
      },
    },
  })

  const isFullScreen = table.getState().isFullScreen

  return (
    <StyledPaper
      elevation={0}
      className="w-full rounded-3xl overflow-hidden"
      sx={isFullScreen ? { backdropFilter: 'none', overflow: 'visible' } : undefined}
    >
      <Box className="pt-6 px-6 pb-4 flex justify-between items-center">
        <Typography className="font-semibold text-[1.25rem]" variant="h6" color="text.primary">
          {t('questions')}
        </Typography>
        <Box className="flex gap-2 items-center">
          <ActionButton 
            btnLabel={t('add_question')}
            onClick={() => setAddModalOpen(true)}
          />
        </Box>
      </Box>

      <Box className="w-full pt-0 px-6 pb-4 overflow-auto">
        <MaterialReactTable table={table} />
      </Box>

      <AddQuestionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelectType={(type) => onQuestionTypeChange?.(type)}
      />

      <Menu
        id='question-actions-menu'
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={viewQuestion}>
          {t('preview')}
        </MenuItem>
        <MenuItem onClick={openEdit}>
          {t('edit')}
        </MenuItem>
        <MenuItem onClick={openDeleteDialog} sx={{ color: 'error.main' }}>
          {t('delete')}
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {t('delete_confirm_title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t('delete_confirm_message', { name: questionToDelete?.questionName ?? '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="inherit">
            {t('cancel')}
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledPaper>
  )
}

export default memo(QuestionsTable)
