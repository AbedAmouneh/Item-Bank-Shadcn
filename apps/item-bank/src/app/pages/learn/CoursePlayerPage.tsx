import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useLearnerCourse } from '../../../features/learn/hooks';
import { ModuleSidebar } from './components/ModuleSidebar';

/**
 * Two-panel course player shell.
 *
 * Left:  ModuleSidebar — module list with completed/active/locked icons.
 * Right: prompt to select a module (actual content renders in ModulePage).
 *
 * Desktop (md+): side-by-side. Mobile: stacked vertically.
 */
export default function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const id = parseInt(courseId ?? '0', 10);
  const { data: course, isLoading, isError } = useLearnerCourse(id);

  const sortedModules = [...(course?.modules ?? [])].sort((a, b) => a.position - b.position);
  const defaultModule =
    sortedModules.find((m) => !m.locked && !m.completed) ??
    (sortedModules.length > 0 ? sortedModules[sortedModules.length - 1] : null);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] animate-pulse gap-0">
        <div className="w-64 shrink-0 border-e border-border bg-muted" />
        <div className="flex-1 bg-card" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-destructive">{t('learn.loading_error')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-e border-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{course.title}</p>
        </div>
        <ModuleSidebar modules={course.modules} courseId={id} />
      </aside>

      <main className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        {defaultModule ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">{t('learn.select_module')}</p>
            <button
              type="button"
              className="text-primary underline text-sm"
              onClick={() => navigate(`/learn/courses/${id}/module/${defaultModule.id}`)}
            >
              {defaultModule.title}
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('learn.select_module')}</p>
        )}
      </main>
    </div>
  );
}
