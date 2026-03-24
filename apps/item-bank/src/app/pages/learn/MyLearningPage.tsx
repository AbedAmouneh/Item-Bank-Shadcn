import { useState } from 'react';

import { BookOpen, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useMyLearning } from '../../../features/learn/hooks';
import { CourseCard } from './components/CourseCard';
import { AssignmentCard } from './components/AssignmentCard';
import { ExamCard } from './components/ExamCard';

function CardSkeleton() {
  return <div className="animate-pulse rounded-xl border border-border bg-card h-56" />;
}

function RowSkeleton() {
  return <div className="animate-pulse rounded-lg border border-border bg-card h-16" />;
}

function EmptyState({ icon: Icon }: { icon: typeof BookOpen }) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Icon size={40} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{t('learn.empty_state')}</p>
    </div>
  );
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Collapsible section with a chevron toggle button. */
function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-start focus:outline-none focus:ring-2 focus:ring-ring rounded"
        aria-expanded={open}
      >
        {open
          ? <ChevronDown size={18} className="text-muted-foreground" />
          : <ChevronRight size={18} className="text-muted-foreground" />}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </button>
      {open && children}
    </section>
  );
}

/**
 * My Learning dashboard — shows the learner's active courses, assignments,
 * exams, and completed courses in four independently-collapsible sections.
 */
export default function MyLearningPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError } = useMyLearning();

  const activeCourses    = data?.courses.filter((c) => c.status !== 'completed') ?? [];
  const completedCourses = data?.courses.filter((c) => c.status === 'completed') ?? [];
  const assignments      = data?.assignments ?? [];
  const exams            = data?.exams ?? [];

  return (
    <main className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-foreground">{t('learn.my_learning')}</h1>

      {/* Active Courses */}
      <Section title={t('learn.active_courses')}>
        {isError && <p className="text-sm text-destructive">{t('learn.loading_error')}</p>}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && !isError && activeCourses.length === 0 && (
          <EmptyState icon={BookOpen} />
        )}
        {!isLoading && activeCourses.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeCourses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </Section>

      {/* Assignments */}
      <Section title={t('learn.assignments')}>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <RowSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && !isError && assignments.length === 0 && (
          <EmptyState icon={BookOpen} />
        )}
        {!isLoading && assignments.length > 0 && (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        )}
      </Section>

      {/* Exams */}
      <Section title={t('learn.exams')}>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <RowSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && !isError && exams.length === 0 && (
          <EmptyState icon={GraduationCap} />
        )}
        {!isLoading && exams.length > 0 && (
          <div className="flex flex-col gap-2">
            {exams.map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        )}
      </Section>

      {/* Completed */}
      <Section
        title={t('learn.completed_section', { count: completedCourses.length })}
        defaultOpen={false}
      >
        {!isLoading && completedCourses.length === 0 && <EmptyState icon={BookOpen} />}
        {completedCourses.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </Section>
    </main>
  );
}
