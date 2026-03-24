import { useState, useEffect, useRef } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@item-bank/ui';
import { useLearnerCourse, useCompleteModule } from '../../../features/learn/hooks';
import { ModuleSidebar } from './components/ModuleSidebar';

/**
 * Renders a single course module with rich-HTML content and a navigation footer.
 *
 * Content is sanitized with DOMPurify and rendered via the DOM Range API
 * (createContextualFragment + replaceChildren). This is defence-in-depth:
 * content is authored by trusted staff but sanitized because it travels
 * through the database and API before reaching the client.
 */
export default function ModulePage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const contentRef = useRef<HTMLDivElement>(null);

  const courseIdNum = parseInt(courseId ?? '0', 10);
  const moduleIdNum = parseInt(moduleId ?? '0', 10);

  const { data: course, isLoading, isError } = useLearnerCourse(courseIdNum);
  const { mutate: complete, isPending, reset: resetMutation } = useCompleteModule(courseIdNum);
  const [showMutationError, setShowMutationError] = useState(false);

  const sortedModules = [...(course?.modules ?? [])].sort((a, b) => a.position - b.position);
  const currentIndex  = sortedModules.findIndex((m) => m.id === moduleIdNum);
  const currentModule = currentIndex >= 0 ? sortedModules[currentIndex] : null;
  const prevModule    = currentIndex > 0 ? sortedModules[currentIndex - 1] : null;
  const nextModule    = currentIndex < sortedModules.length - 1
    ? sortedModules[currentIndex + 1]
    : null;
  const isLastModule  = currentIndex >= 0 && currentIndex === sortedModules.length - 1;

  // Render sanitized HTML content using the DOM Range API.
  useEffect(() => {
    if (!contentRef.current || !currentModule) return;
    const sanitized = DOMPurify.sanitize(currentModule.content);
    const fragment  = document.createRange().createContextualFragment(sanitized);
    contentRef.current.replaceChildren(fragment);
  }, [currentModule]);

  // Clear mutation error when the user navigates to a different module.
  useEffect(() => {
    setShowMutationError(false);
    resetMutation();
  }, [moduleIdNum, resetMutation]);

  const handleMarkComplete = () => {
    setShowMutationError(false);
    complete(moduleIdNum, {
      onSuccess: () => {
        if (nextModule) {
          navigate(`/learn/courses/${courseIdNum}/module/${nextModule.id}`);
        } else {
          navigate(`/learn/courses/${courseIdNum}`);
        }
      },
      onError: () => setShowMutationError(true),
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <aside className="hidden md:block w-64 shrink-0 border-e border-border animate-pulse bg-muted" />
        <main className="flex-1 p-8 animate-pulse">
          <div className="h-8 w-1/2 rounded bg-muted mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="h-4 rounded bg-muted" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Error / module not found ──────────────────────────────────────────────
  if (isError || !course || !currentModule) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-destructive">{t('learn.loading_error')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:block w-64 shrink-0 border-e border-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{course.title}</p>
        </div>
        <ModuleSidebar
          modules={course.modules}
          courseId={courseIdNum}
          activeModuleId={moduleIdNum}
        />
      </aside>

      {/* Content column */}
      <div className="flex flex-col flex-1 min-h-0">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-6">{currentModule.title}</h1>

          {/* Sanitized HTML content — written via DOM Range API (see component JSDoc) */}
          <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none" />

          {/* Exam-ready banner: final module + linked exam */}
          {isLastModule && currentModule.completed && course.exam_id !== null && (
            <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
              {t('learn.exam_ready_banner')}
            </div>
          )}
        </main>

        {/* Sticky navigation footer */}
        <footer className="border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={!prevModule}
            onClick={() =>
              prevModule &&
              navigate(`/learn/courses/${courseIdNum}/module/${prevModule.id}`)
            }
            aria-label={t('learn.previous')}
          >
            <ArrowLeft size={16} className="me-1.5" />
            {t('learn.previous')}
          </Button>

          <div className="flex flex-col items-end gap-1">
            {showMutationError && (
              <p className="text-xs text-destructive">{t('learn.complete_error')}</p>
            )}
            <Button
              onClick={handleMarkComplete}
              disabled={isPending || currentModule.completed}
            >
              {isPending ? '…' : t('learn.mark_complete')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
