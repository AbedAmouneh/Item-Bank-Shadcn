import { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, Trash2 } from 'lucide-react';

import {
  Button,
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
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import { getTags, createTag, deleteTag } from '@item-bank/api';
import type { Tag } from '@item-bank/api';

// ---------------------------------------------------------------------------
// Validation schema — name is required, 2–50 chars.
// ---------------------------------------------------------------------------

const tagSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
});

type TagFields = z.infer<typeof tagSchema>;

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

/** Fetch all tags. */
function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });
}

/** Create a new tag and refresh the list on success. */
function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      createTag({ name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-') }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

/** Delete a tag by ID and refresh the list on success. */
function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Add Tag dialog
// ---------------------------------------------------------------------------

interface AddTagDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TagFields) => void;
  isPending: boolean;
}

function AddTagDialog({ open, onClose, onSubmit, isPending }: AddTagDialogProps) {
  const { t } = useTranslation('common');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFields>({ resolver: zodResolver(tagSchema) });

  // Reset form every time the dialog opens.
  useEffect(() => {
    if (open) reset({ name: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin_tags.add_tag')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tag-name">{t('admin_tags.name_label')}</Label>
            <Input
              id="tag-name"
              {...register('name')}
              placeholder={t('admin_tags.tag_name_placeholder')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('profile.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('admin_tags.saving') : t('admin_tags.add_tag')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton rows shown while loading
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <TableRow key={i} className="animate-pulse">
          <TableCell>
            <div className="h-4 w-32 rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-12 rounded bg-muted" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AdminTags = () => {
  const { t } = useTranslation('common');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  // deleteError is shown inside the confirm dialog so the user sees it in
  // context. The dialog stays open until they dismiss it manually.
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: tags = [], isLoading, isError } = useTags();
  const { mutate: addTag, isPending: isAdding } = useCreateTag();
  const { mutate: removeTag } = useDeleteTag();

  const handleAddSubmit = (data: TagFields) => {
    addTag(data, { onSuccess: () => setDialogOpen(false) });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    removeTag(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        // A 409 means the tag is still in use by questions.
        // Keep deleteTarget set so the dialog stays open and shows the error.
        const message = err instanceof Error ? err.message : 'Failed to delete tag';
        setDeleteError(message);
      },
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Tags className="text-primary" size={28} />
          <h1 className="font-semibold text-xl text-foreground">{t('admin_tags.title')}</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} className="me-1.5" />
          {t('admin_tags.add_tag')}
        </Button>
      </div>

      <Separator />

      {/* Fetch error */}
      {isError && (
        <p className="text-sm text-destructive">{t('admin_tags.load_error')}</p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin_tags.tag_name_col')}</TableHead>
              <TableHead>{t('admin_tags.questions_using_col')}</TableHead>
              <TableHead className="text-end">{t('admin.users.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading skeleton */}
            {isLoading && <SkeletonRows />}

            {/* Empty state */}
            {!isLoading && !isError && tags.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-12 text-center text-muted-foreground"
                >
                  {t('admin_tags.no_tags')}
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading && tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {tag.question_count ?? '—'}
                </TableCell>
                <TableCell className="text-end">
                  <button
                    type="button"
                    aria-label={t('admin_tags.delete_tag_aria', { name: tag.name })}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(tag);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Tag dialog */}
      <AddTagDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddSubmit}
        isPending={isAdding}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tag{' '}
              <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Shown when the server rejects the delete (e.g. 409 — tag still in use). */}
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {t('admin_tags.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTags;
