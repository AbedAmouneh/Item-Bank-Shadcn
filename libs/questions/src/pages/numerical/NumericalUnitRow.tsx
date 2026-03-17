import 'mathlive';
import { memo, useState, useCallback, useEffect, useRef, createElement } from 'react';
import { Calculator, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from '@item-bank/ui';
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
  const { t } = useTranslation('questions');
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
      <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20">
        {showCalculatorIcon ? (
          <div className="relative flex-1 min-w-[140px]">
            {/* Floating label */}
            <span className="absolute -top-2 start-2.5 z-10 pointer-events-none text-xs leading-none px-0.5 bg-background text-muted-foreground">
              {t('editor.numerical.unit')} *
            </span>
            {/* Math display + open dialog trigger */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleOpenMathDialog}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenMathDialog(); }}
              className="flex items-center cursor-pointer ps-2 pe-1 h-9 rounded-md border border-input bg-background hover:border-foreground transition-colors"
              aria-label={t('editor.numerical.open_math_editor')}
            >
              <div className="flex flex-1 items-center overflow-hidden min-w-0">
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
              </div>
              <button
                type="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleOpenMathDialog();
                }}
                className="p-0.5 rounded text-primary hover:bg-transparent transition-colors"
                aria-label={t('editor.numerical.open_calculator')}
              >
                <Calculator size={18} />
              </button>
            </div>
          </div>
        ) : (
          <Input
            value={unit.unit}
            onChange={(e) => onChange(id, 'unit', e.target.value)}
            className="flex-1 min-w-[140px] text-sm"
            placeholder={`${t('editor.numerical.unit')} *`}
          />
        )}

        <span className="text-xs text-muted-foreground shrink-0">×</span>

        <Input
          type="number"
          value={unit.multiplier}
          disabled={index === 0}
          onChange={(e) => onChange(id, 'multiplier', e.target.value)}
          className="w-28 text-sm"
          placeholder={`${t('editor.numerical.multiplier')} *`}
          step="any"
        />

        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            aria-label={t('editor.numerical.delete_unit')}
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <div className="w-8 shrink-0" />
        )}
      </div>

      <Dialog open={mathDialogOpen} onOpenChange={(open) => { if (!open) handleCloseMathDialog(); }}>
        <DialogContent className="max-w-2xl overflow-visible rounded-lg">
          <DialogHeader className="flex flex-row items-center justify-between py-1">
            <DialogTitle className="text-xl font-semibold">{t('editor.numerical.insert_edit_math')}</DialogTitle>
            <button
              type="button"
              onClick={handleCloseMathDialog}
              className="p-1.5 rounded-md text-primary hover:bg-accent transition-colors"
              aria-label={t('editor.numerical.close')}
            >
              <X size={18} />
            </button>
          </DialogHeader>

          <div className="rounded border border-border bg-muted/30 px-2.5 py-1">
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
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-row justify-end">
            <Button variant="outline" onClick={handleCloseMathDialog} type="button">
              {t('editor.numerical.cancel')}
            </Button>
            <Button onClick={handleSaveMath} type="button">
              {t('editor.numerical.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default NumericalUnitRow;
