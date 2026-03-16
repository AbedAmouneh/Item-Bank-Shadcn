import 'mathlive';
import { memo, useState, useCallback, useEffect, useRef, createElement } from 'react';
import {
  Box,
  TextField,
  IconButton,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { type NumericalUnit } from './types';

type MathFieldElement = HTMLElement & {
  value: string;
  mathVirtualKeyboardPolicy?: 'auto' | 'manual' | 'sandboxed';
  menuItems?: readonly MathMenuItem[];
  focus: () => void;
  insert: (latex: string, options?: { selectionMode?: 'placeholder' | 'after' | 'before' | 'item' }) => boolean;
  executeCommand: (command: string | [string, ...unknown[]]) => boolean;
};

type MathVirtualKeyboard = {
  show: () => void;
  hide: () => void;
};

type MathMenuItem = {
  type?: 'command' | 'divider' | 'heading' | 'submenu';
  label?: string;
  id?: string;
  keyboardShortcut?: string;
  submenu?: readonly MathMenuItem[];
  onMenuSelect?: () => void;
};

const buildMatrixTemplate = (rows: number, cols: number) =>
  `\\begin{pmatrix}${Array.from({ length: rows }, () => Array.from({ length: cols }, () => '#?').join(' & ')).join(
    '\\\\'
  )}\\end{pmatrix}`;

const buildMathMenuItems = (mathField: MathFieldElement): readonly MathMenuItem[] => {
  const matrixSubmenu: MathMenuItem[] = [2, 3, 4, 5].flatMap((rows) =>
    [2, 3, 4, 5].map((cols) => ({
      label: `${rows} × ${cols}`,
      onMenuSelect: () => {
        mathField.insert(buildMatrixTemplate(rows, cols), { selectionMode: 'item' });
      },
    }))
  );

  return [
    { label: 'Insert Matrix', submenu: matrixSubmenu },
    {
      label: 'Insert',
      submenu: [
        { label: 'Absolute value', onMenuSelect: () => mathField.insert('\\left|#?\\right|', { selectionMode: 'item' }) },
        { label: 'nth Root', onMenuSelect: () => mathField.insert('\\sqrt[#?]{#?}', { selectionMode: 'item' }) },
        { label: 'Logarithm base a', onMenuSelect: () => mathField.insert('\\log_{#?}\\left(#?\\right)', { selectionMode: 'item' }) },
        { type: 'divider' },
        { label: 'Derivative', onMenuSelect: () => mathField.insert('\\frac{d}{dx}f\\left(x\\right)', { selectionMode: 'item' }) },
        { label: 'nth Derivative', onMenuSelect: () => mathField.insert('\\frac{d^{#?}}{dx^{#?}}f\\left(x\\right)', { selectionMode: 'item' }) },
        { label: 'Integral', onMenuSelect: () => mathField.insert('\\int_{#?}^{#?} f\\left(x\\right)\\,dx', { selectionMode: 'item' }) },
        { label: 'Sum', onMenuSelect: () => mathField.insert('\\sum_{i=1}^{n} x_i', { selectionMode: 'item' }) },
        { label: 'Product', onMenuSelect: () => mathField.insert('\\prod_{i=1}^{n} x_i', { selectionMode: 'item' }) },
        { type: 'divider' },
        { label: 'Modulus', onMenuSelect: () => mathField.insert('\\left|#?\\right|', { selectionMode: 'item' }) },
        { label: 'Argument', onMenuSelect: () => mathField.insert('\\arg\\left(#?\\right)', { selectionMode: 'item' }) },
        { label: 'Real Part', onMenuSelect: () => mathField.insert('\\Re\\left(#?\\right)', { selectionMode: 'item' }) },
        { label: 'Imaginary Part', onMenuSelect: () => mathField.insert('\\Im\\left(#?\\right)', { selectionMode: 'item' }) },
        { label: 'Conjugate', onMenuSelect: () => mathField.insert('\\overline{#?}', { selectionMode: 'item' }) },
      ],
    },
    {
      label: 'Font Style',
      submenu: [
        { label: 'Bold', onMenuSelect: () => mathField.insert('\\mathbf{#@}', { selectionMode: 'item' }) },
        { label: 'Italic', onMenuSelect: () => mathField.insert('\\mathit{#@}', { selectionMode: 'item' }) },
        { label: 'Script', onMenuSelect: () => mathField.insert('\\mathcal{#@}', { selectionMode: 'item' }) },
        { label: 'Fraktur', onMenuSelect: () => mathField.insert('\\mathfrak{#@}', { selectionMode: 'item' }) },
      ],
    },
    {
      label: 'Color',
      submenu: [
        { label: 'Red', onMenuSelect: () => mathField.insert('\\textcolor{red}{#@}', { selectionMode: 'item' }) },
        { label: 'Blue', onMenuSelect: () => mathField.insert('\\textcolor{blue}{#@}', { selectionMode: 'item' }) },
        { label: 'Green', onMenuSelect: () => mathField.insert('\\textcolor{green}{#@}', { selectionMode: 'item' }) },
      ],
    },
    {
      label: 'Background',
      submenu: [
        { label: 'Yellow', onMenuSelect: () => mathField.insert('\\colorbox{yellow}{#@}', { selectionMode: 'item' }) },
        { label: 'Cyan', onMenuSelect: () => mathField.insert('\\colorbox{cyan}{#@}', { selectionMode: 'item' }) },
        { label: 'Pink', onMenuSelect: () => mathField.insert('\\colorbox{pink}{#@}', { selectionMode: 'item' }) },
      ],
    },
    { type: 'divider' },
    { label: 'Cut', keyboardShortcut: 'Ctrl+X', onMenuSelect: () => mathField.executeCommand('cutToClipboard') },
    { label: 'Copy', keyboardShortcut: 'Ctrl+C', onMenuSelect: () => mathField.executeCommand('copyToClipboard') },
    { label: 'Paste', keyboardShortcut: 'Ctrl+V', onMenuSelect: () => mathField.executeCommand('pasteFromClipboard') },
    { label: 'Select All', keyboardShortcut: 'Ctrl+A', onMenuSelect: () => mathField.executeCommand('selectAll') },
  ];
};

type NumericalUnitRowProps = {
  unit: NumericalUnit;
  index: number;
  showCalculatorIcon: boolean;
  onChange: (id: string, field: keyof NumericalUnit, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

const NumericalUnitRow = memo(function NumericalUnitRow({
  unit,
  index,
  showCalculatorIcon,
  onChange,
  onRemove,
  canRemove,
}: NumericalUnitRowProps) {
  const id = unit.id;
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [mathInputValue, setMathInputValue] = useState('');
  const [mathFieldNode, setMathFieldNode] = useState<MathFieldElement | null>(null);
  const displayMathRef = useRef<MathFieldElement | null>(null);

  const getVirtualKeyboard = useCallback(
    () => (window as Window & { mathVirtualKeyboard?: MathVirtualKeyboard }).mathVirtualKeyboard,
    []
  );

  useEffect(() => {
    if (!mathFieldNode) return;

    const handleInput = () => {
      setMathInputValue(mathFieldNode.value ?? '');
    };

    mathFieldNode.mathVirtualKeyboardPolicy = 'manual';
    mathFieldNode.menuItems = buildMathMenuItems(mathFieldNode);
    mathFieldNode.addEventListener('input', handleInput);

    return () => {
      mathFieldNode.removeEventListener('input', handleInput);
    };
  }, [mathFieldNode]);

  useEffect(() => {
    if (!mathDialogOpen || !mathFieldNode) return;

    mathFieldNode.value = mathInputValue;
    mathFieldNode.focus();
  }, [mathDialogOpen, mathFieldNode, mathInputValue]);

  useEffect(() => {
    if (displayMathRef.current) {
      displayMathRef.current.value = unit.unit;
    }
  }, [unit.unit]);

  const hideVirtualKeyboard = useCallback(() => {
    getVirtualKeyboard()?.hide();
  }, [getVirtualKeyboard]);

  const handleOpenMathDialog = useCallback(() => {
    setMathInputValue(unit.unit);
    setMathDialogOpen(true);
  }, [unit.unit]);
  const handleCloseMathDialog = useCallback(() => {
    setMathDialogOpen(false);
    hideVirtualKeyboard();
  }, [hideVirtualKeyboard]);
  const handleSaveMath = useCallback(() => {
    onChange(id, 'unit', mathInputValue);
    setMathDialogOpen(false);
    hideVirtualKeyboard();
  }, [hideVirtualKeyboard, id, mathInputValue, onChange]);

  return (
    <>
    <Box
      className="flex items-end gap-3 p-3 w-full box-border min-w-0 rounded border flex-wrap"
      sx={(theme) => ({
        backgroundColor: theme.palette.action.hover,
        borderColor: theme.palette.divider,
      })}
    >
      {showCalculatorIcon ? (
        <Box sx={{ flex: '1 1 160px', minWidth: 140, position: 'relative' }}>
          <Box
            component="label"
            className="absolute top-0 left-[10px] z-10 pointer-events-none text-xs leading-none -translate-y-1/2 px-0.5"
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              backgroundColor: theme.palette.background.paper,
            })}
          >
            Unit *
          </Box>
          <Box
            onClick={handleOpenMathDialog}
            className="flex items-center cursor-pointer pl-5 pr-2 h-[36px] rounded border border-solid"
            sx={(theme) => ({
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)',
              backgroundColor: theme.palette.background.paper,
              '&:hover': {
                borderColor: theme.palette.text.primary,
              },
            })}
          >
            <Box className="flex flex-1 items-center overflow-hidden min-w-0">
              {createElement('math-field', {
                ref: (node: MathFieldElement | null) => {
                  displayMathRef.current = node;
                  if (node) {
                    node.value = unit.unit;
                    node.mathVirtualKeyboardPolicy = 'manual';
                  }
                },
                'read-only': true,
                style: {
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '0.8125rem',
                  pointerEvents: 'none',
                  minHeight: '1.4rem',
                },
              })}
            </Box>
            <IconButton
              size="small"
              disableRipple
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleOpenMathDialog();
              }}
              sx={(theme) => ({
                color: theme.palette.primary.main,
                p: 0.25,
                borderRadius: 1,
                '&:hover': { backgroundColor: 'transparent' },
              })}
              aria-label="Open calculator"
            >
              <CalculateOutlinedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <TextField
          label="Unit *"
          value={unit.unit}
          onChange={(e) => onChange(id, 'unit', e.target.value)}
          size="small"
          sx={(theme) => ({
            flex: '1 1 160px',
            minWidth: 140,
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
              fontSize: '0.8125rem',
              height: 36,
            },
            '& .MuiOutlinedInput-input': { py: 1.5, px: 2.5 },
          })}
        />
      )}

      <TextField
        label="Multiplier *"
        value={unit.multiplier}
        disabled={index === 0}
        onChange={(e) => onChange(id, 'multiplier', e.target.value)}
        type="number"
        size="small"
        sx={(theme) => ({
          flex: '1 1 160px',
          minWidth: 140,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.background.paper,
            fontSize: '0.8125rem',
            height: 36,
          },
          '& .MuiOutlinedInput-input': { py: 1.5, px: 2.5 },
        })}
        slotProps={{ htmlInput: { step: 'any' } }}
      />

      {canRemove ? (
        <IconButton
          size="small"
          className="shrink-0 p-1 mb-0.5"
          onClick={() => onRemove(id)}
          aria-label="Remove unit"
        >
          <DeleteOutlineIcon sx={{ fontSize: 20 }} />
        </IconButton>
      ) : (
        <Box className="w-8 shrink-0" />
      )}
    </Box>

    <Dialog
      open={mathDialogOpen}
      onClose={handleCloseMathDialog}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      PaperProps={{
        sx: (theme) => ({
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          overflow: 'visible',
        }),
      }}
    >
      <DialogTitle
        component="div"
        className="flex items-center justify-between py-4 px-5"
      >
        <Box component="span" className="text-xl font-semibold">
          Insert/Edit Math
        </Box>
        <IconButton
          size="small"
          onClick={handleCloseMathDialog}
          aria-label="Close"
          sx={(theme) => ({ color: theme.palette.primary.light })}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="px-5 pb-2 overflow-visible">
        <Box
          className="rounded px-2.5 py-1"
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.action.hover,
          })}
        >
          {createElement('math-field', {
            ref: (node: MathFieldElement | null) => setMathFieldNode(node),
            'aria-label': 'Math input',
            style: {
              width: '100%',
              minHeight: '2.25rem',
              border: 'none',
              outline: 'none',
              overflow: 'visible',
              backgroundColor: 'transparent',
              fontSize: '1rem',
            },
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
        <Button
          onClick={handleCloseMathDialog}
          variant="outlined"
          className="normal-case"
          sx={(theme) => ({ borderColor: theme.palette.primary.light, color: theme.palette.primary.light })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveMath}
          variant="contained"
          className="normal-case"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
});

export default NumericalUnitRow;
