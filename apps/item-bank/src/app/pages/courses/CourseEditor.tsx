import { useState, useEffect } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus } from 'lucide-react';

import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Input,
  Label,
  Textarea,
  Separator,
} from '@item-bank/ui';

import type { Activity, ActivityType } from '@item-bank/api';

import {
  useCourse,
  useUpdateCourse,
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
} from '../../../features/courses/hooks';
import { ActivityList } from './ActivityList';
import { ActivityTypePicker } from './ActivityTypePicker';
import { ActivitySettingsPanel } from './ActivitySettingsPanel';
import { AssignedUsersPanel } from './AssignedUsersPanel';

// ─── Course info form schema ──────────────────────────────────────────────────

const courseInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().max(500).optional(),
});

type CourseInfoFields = z.infer<typeof courseInfoSchema>;

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  if (status === 'published') {
    return (
      <Badge className="border border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400">
        {t('courses.status_published')}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t('courses.status_draft')}</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CourseEditor = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localActivities, setLocalActivities] = useState<Activity[]>([]);

  const { data: course, isLoading, isError } = useCourse(courseId);
  const { mutate: updateCourse, isPending: isSaving } = useUpdateCourse();
  const { mutate: createActivity, isPending: isAddingActivity } = useCreateActivity();
  const { mutate: deleteActivity } = useDeleteActivity();
  const { mutate: reorderActivities } = useReorderActivities();

  const {
    register,
    handleSubmit,
    reset: resetCourseForm,
    formState: { errors: courseErrors },
  } = useForm<CourseInfoFields>({ resolver: zodResolver(courseInfoSchema) });

  // Sync form and local activity list when course data loads.
  useEffect(() => {
    if (course) {
      resetCourseForm({ title: course.title, description: course.description ?? '' });
      setLocalActivities([...(course.activities ?? [])]);
    }
  }, [course, resetCourseForm]);

  const selectedActivity = localActivities.find((a) => a.id === selectedActivityId) ?? null;

  const handleSaveCourse = (data: CourseInfoFields) => {
    updateCourse({ id: courseId, data });
  };

  const handlePublish = () => {
    updateCourse({ id: courseId, data: { status: 'published' } });
  };

  const handlePickType = (type: ActivityType) => {
    createActivity(
      { courseId, data: { type, title: `New ${type.replace(/_/g, ' ')}` } },
      {
        onSuccess: (newActivity) => {
          setLocalActivities((prev) => [...prev, newActivity]);
          setSelectedActivityId(newActivity.id);
        },
      },
    );
  };

  const handleDeleteActivity = (activityId: number) => {
    // Capture a snapshot before the optimistic update so we can roll back on failure.
    const snapshot = localActivities;
    setLocalActivities((prev) => prev.filter((a) => a.id !== activityId));
    if (selectedActivityId === activityId) setSelectedActivityId(null);
    deleteActivity(
      { courseId, activityId },
      { onError: () => setLocalActivities(snapshot) },
    );
  };

  const handleReorder = (newOrder: Activity[]) => {
    setLocalActivities(newOrder);
    reorderActivities({ courseId, orderedIds: newOrder.map((a) => a.id) });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('courses.course_not_found')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          {t('back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Link
          to="/projects"
          aria-label={t('courses.back_to_courses')}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-lg font-semibold">{course.title}</h1>
        <StatusBadge status={course.status} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activities" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="details">{t('courses.tab_details')}</TabsTrigger>
          <TabsTrigger value="activities">{t('courses.tab_activities')}</TabsTrigger>
          <TabsTrigger value="users">{t('courses.tab_assigned_users')}</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Course Details ── */}
        <TabsContent value="details" className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit(handleSaveCourse)} className="max-w-lg space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-title">{t('courses.course_title')}</Label>
              <Input
                id="course-title"
                {...register('title')}
                placeholder={t('courses.course_title_placeholder')}
                aria-invalid={!!courseErrors.title}
              />
              {courseErrors.title && (
                <p className="text-xs text-destructive">{courseErrors.title.message}</p>
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
                rows={4}
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('courses.saving') : t('courses.save_course')}
            </Button>
          </form>
        </TabsContent>

        {/* ── Tab 2: Activities ── */}
        <TabsContent value="activities" className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Left: activity list */}
            <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-e p-4">
              <ActivityList
                activities={localActivities}
                selectedId={selectedActivityId}
                onSelect={setSelectedActivityId}
                onDelete={handleDeleteActivity}
                onReorder={handleReorder}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isAddingActivity}
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={14} className="me-1.5" />
                {t('courses.add_activity')}
              </Button>
            </div>

            {/* Right: settings panel */}
            <div className="flex-1 overflow-y-auto">
              {selectedActivity ? (
                <ActivitySettingsPanel courseId={courseId} activity={selectedActivity} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t('courses.no_activity_selected')}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: Assigned Users ── */}
        <TabsContent value="users" className="flex-1 overflow-auto">
          <AssignedUsersPanel courseId={courseId} />
        </TabsContent>
      </Tabs>

      {/* Bottom toolbar */}
      <Separator />
      <div className="flex items-center justify-end gap-2 px-6 py-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={handleSubmit(handleSaveCourse)}
        >
          {isSaving ? t('courses.saving') : t('courses.save_course')}
        </Button>
        <Button
          type="button"
          disabled={isSaving || course.status === 'published'}
          onClick={handlePublish}
        >
          {t('courses.publish')}
        </Button>
      </div>

      {/* Type picker dialog */}
      <ActivityTypePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickType}
      />
    </div>
  );
};

export default CourseEditor;
