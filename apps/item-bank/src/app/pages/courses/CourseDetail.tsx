import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, FileText, ClipboardList, BarChart2, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, Badge } from '@item-bank/ui';

import { useCourse } from '../../../features/courses/hooks';
import type { Activity, ActivityType } from '@item-bank/api/courses';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the lucide icon component for an activity type. */
function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case 'quiz':          return <ClipboardList size={16} className="shrink-0 text-blue-500" />;
    case 'survey':        return <BarChart2     size={16} className="shrink-0 text-purple-500" />;
    case 'practice_quiz': return <ClipboardList size={16} className="shrink-0 text-orange-500" />;
    case 'pdf_book':      return <FileText      size={16} className="shrink-0 text-red-500" />;
  }
}

/** Converts an activity type to a human-readable label. */
function activityTypeLabel(type: ActivityType): string {
  switch (type) {
    case 'quiz':          return 'Quiz';
    case 'survey':        return 'Survey';
    case 'practice_quiz': return 'Practice Quiz';
    case 'pdf_book':      return 'PDF Book';
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  if (status === 'published') {
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border">
        {t('courses.status_published')}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t('courses.status_draft')}</Badge>;
}

// ─── Single activity row ───────────────────────────────────────────────────────

function ActivityRow({ activity }: { activity: Activity }) {
  const { t } = useTranslation('common');
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">
        {activity.position}
      </span>
      <ActivityIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{activity.title}</p>
        {activity.description && (
          <p className="truncate text-xs text-muted-foreground">{activity.description}</p>
        )}
        {(activity.type === 'quiz' || activity.type === 'practice_quiz') &&
          activity.item_bank_name && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {t('courses.item_bank')}: {activity.item_bank_name}
            </p>
          )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {activityTypeLabel(activity.type)}
      </Badge>
    </li>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="mb-8 animate-pulse space-y-3">
      <div className="h-8 w-1/2 rounded bg-muted" />
      <div className="h-4 w-1/4 rounded bg-muted" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const { data: course, isLoading, isError } = useCourse(courseId);

  return (
    <div className="w-full px-8 py-8">
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} />
        {t('courses.back_to_courses')}
      </Link>

      {isLoading && <HeaderSkeleton />}

      {(isError || (!isLoading && !course)) && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            {t('courses.course_not_found')}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            {t('back')}
          </Button>
        </div>
      )}

      {course && (
        <>
          {/* Header */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={course.status} />
              </div>
              {course.description && (
                <p className="text-muted-foreground">{course.description}</p>
              )}
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => navigate(`/projects/${course.id}/edit`)}
            >
              <Pencil size={15} className="me-1.5" />
              {t('courses.edit')}
            </Button>
          </div>

          {/* Activity list */}
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('courses.activities')}
          </h2>

          {course.activities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen size={40} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No activities yet.</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {course.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
};

export default CourseDetail;
