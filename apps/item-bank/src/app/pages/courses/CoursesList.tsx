import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  Badge,
  Input,
  Label,
  Textarea,
} from '@item-bank/ui';

import { useCourses, useCreateCourse, useDeleteCourse } from '../../../features/courses/hooks';
import type { CourseSummary } from '@item-bank/api/courses';

// ─── Validation ─────────────────────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().max(500).optional(),
});

type CourseFields = z.infer<typeof courseSchema>;

// ─── Create dialog ───────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFields) => void;
  isPending: boolean;
}

function CreateCourseDialog({ open, onClose, onSubmit, isPending }: CreateDialogProps) {
  const { t } = useTranslation('common');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFields>({ resolver: zodResolver(courseSchema) });

  useEffect(() => {
    if (open) reset({ title: '', description: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('courses.new_course')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-title">{t('courses.course_title')}</Label>
            <Input
              id="course-title"
              {...register('title')}
              placeholder={t('courses.course_title_placeholder')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-desc">
              {t('courses.course_description')}{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="course-desc"
              {...register('description')}
              placeholder={t('courses.course_description_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('profile.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('courses.saving') : t('profile.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  if (status === 'published') {
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border">
        {t('courses.status_published')}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">{t('courses.status_draft')}</Badge>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-muted" />
          <div className="h-3.5 w-2/3 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="h-8 w-32 rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: CourseSummary;
  onDelete: (course: CourseSummary) => void;
}

function CourseCard({ course, onDelete }: CourseCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <Card
      className="flex flex-col cursor-pointer transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
      onClick={() => navigate(`/projects/${course.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug truncate">
              {course.title}
            </CardTitle>
            <StatusBadge status={course.status} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={t('courses.edit')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${course.id}/edit`); }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={t('courses.delete')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => { e.stopPropagation(); onDelete(course); }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {course.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/50">No description</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CoursesList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseSummary | null>(null);

  const { data: courses = [], isLoading, isError } = useCourses();

  const { mutate: createCourse, isPending: isCreating } = useCreateCourse();
  const { mutate: deleteCourse } = useDeleteCourse();

  const handleCreate = (fields: CourseFields) => {
    createCourse(fields, {
      onSuccess: (course) => {
        setCreateOpen(false);
        navigate(`/projects/${course.id}/edit`);
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteCourse(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  return (
    <div className="w-full px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('courses.title')}</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="me-1.5" />
          {t('courses.new_course')}
        </Button>
      </div>

      {isError && (
        <p className="mb-4 text-destructive">{t('courses.loading_error')}</p>
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
      {!isLoading && !isError && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <BookOpen size={48} className="text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">{t('courses.no_courses')}</p>
          <p className="text-sm text-muted-foreground/70">{t('courses.no_courses_desc')}</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="me-1.5" />
            {t('courses.new_course')}
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && courses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateCourseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={isCreating}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('courses.delete_confirm_title', { name: deleteTarget?.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('courses.delete_confirm_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {t('courses.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoursesList;
