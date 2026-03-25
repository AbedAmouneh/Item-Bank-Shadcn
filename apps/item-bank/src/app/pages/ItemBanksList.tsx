import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Pencil, Trash2, Play, Plus, Library } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
  Textarea,
} from '@item-bank/ui';
import {
  useItemBanks,
  useCreateItemBank,
  useUpdateItemBank,
  useDeleteItemBank,
} from '@item-bank/questions';
import type { ItemBank } from '@item-bank/api';

// ---------------------------------------------------------------------------
// Validation schema — name is required (3–100 chars), description is optional.
// ---------------------------------------------------------------------------

const bankSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional(),
});

type BankFields = z.infer<typeof bankSchema>;

// ---------------------------------------------------------------------------
// Create / Edit dialog
// ---------------------------------------------------------------------------

interface BankFormDialogProps {
  open: boolean;
  initialData?: { name: string; description: string };
  onClose: () => void;
  onSubmit: (data: BankFields) => void;
  isPending: boolean;
}

function BankFormDialog({
  open,
  initialData,
  onClose,
  onSubmit,
  isPending,
}: BankFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankFields>({ resolver: zodResolver(bankSchema) });

  // Sync form values every time the dialog opens (create = empty, edit = pre-filled).
  useEffect(() => {
    if (open) {
      reset(initialData ?? { name: '', description: '' });
    }
  }, [open, initialData, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Item Bank' : 'New Item Bank'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank-name">Name</Label>
            <Input
              id="bank-name"
              {...register('name')}
              placeholder="e.g. Grade 5 Science"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank-description">
              Description{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="bank-description"
              {...register('description')}
              placeholder="A short description of what this bank covers"
              rows={3}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton shown while data is loading
// ---------------------------------------------------------------------------

function LoadingCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-3/4 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-muted" />
          <div className="h-3.5 w-2/3 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="h-9 w-20 rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single item bank card
// ---------------------------------------------------------------------------

interface ItemBankCardProps {
  bank: ItemBank;
  onEdit: (bank: ItemBank) => void;
  onDelete: (bank: ItemBank) => void;
}

function ItemBankCard({ bank, onEdit, onDelete }: ItemBankCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="flex flex-col cursor-pointer transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
      onClick={() => navigate(`/item-banks/${bank.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">
            {bank.name}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Edit item bank"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bank);
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label="Delete item bank"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bank);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {bank.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{bank.description}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/50">No description</p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/games?item_bank_id=${bank.id}`);
          }}
        >
          <Play size={14} className="me-1.5" />
          Play
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type DialogMode = 'create' | 'edit';

const ItemBanksList = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [editTarget, setEditTarget] = useState<ItemBank | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemBank | null>(null);

  const { data: page, isLoading, isError } = useItemBanks({ limit: 100 });
  const banks = page?.items ?? [];

  const { mutate: createBank, isPending: isCreating } = useCreateItemBank();
  const { mutate: updateBank, isPending: isUpdating } = useUpdateItemBank();
  const { mutate: deleteBank } = useDeleteItemBank();

  const openCreate = () => {
    setEditTarget(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEdit = (bank: ItemBank) => {
    setEditTarget(bank);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleFormSubmit = (data: BankFields) => {
    if (dialogMode === 'edit' && editTarget) {
      updateBank(
        { id: editTarget.id, data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createBank(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteBank(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  return (
    <div className="w-full px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Item Banks</h1>
        <Button onClick={openCreate}>
          <Plus size={16} className="me-1.5" />
          New Item Bank
        </Button>
      </div>

      {/* Error */}
      {isError && (
        <p className="mb-4 text-destructive">Failed to load item banks.</p>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <LoadingCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && banks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Library size={48} className="text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No item banks yet</p>
          <p className="text-sm text-muted-foreground/70">
            Create your first item bank to organise questions by topic or curriculum.
          </p>
          <Button onClick={openCreate}>
            <Plus size={16} className="me-1.5" />
            New Item Bank
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && banks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <ItemBankCard
              key={bank.id}
              bank={bank}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <BankFormDialog
        open={dialogOpen}
        initialData={
          editTarget
            ? { name: editTarget.name, description: editTarget.description ?? '' }
            : undefined
        }
        onClose={() => setDialogOpen(false)}
        onSubmit={handleFormSubmit}
        isPending={isCreating || isUpdating}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the item bank{' '}
              <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ItemBanksList;
