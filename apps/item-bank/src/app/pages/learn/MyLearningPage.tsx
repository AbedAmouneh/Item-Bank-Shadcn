import { useState } from 'react';

import { BookOpen, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useMyLearning } from '../../../features/learn/hooks';
import { CourseCard } from './components/CourseCard';
import { AssignmentCard } from './components/AssignmentCard';
import { ExamCard } from './components/ExamCard';

/** Pill label — small rounded tag used above section headings. */
function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

/** Pastel icon box — soft coloured rounded square behind an icon. */
function IconBox({
  children,
  className = 'bg-primary/10',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function CardSkeleton() {
  return <div className="animate-pulse rounded-2xl border-2 border-border bg-card h-56" />;
}

function RowSkeleton() {
  return <div className="animate-pulse rounded-xl border-2 border-border bg-card h-16" />;
}

function EmptyState({ icon: Icon }: { icon: typeof BookOpen }) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <IconBox className="bg-muted h-16 w-16">
        <Icon size={28} className="text-muted-foreground/50" />
      </IconBox>
      <p className="text-sm text-muted-foreground">{t('learn.empty_state')}</p>
    </div>
  );
}

interface SectionProps {
  title: string;
  pill?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Collapsible section with an optional pill label and chevron toggle. */
function Section({ title, pill, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {pill && <PillLabel>{pill}</PillLabel>}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-start focus:outline-none focus:ring-2 focus:ring-ring rounded"
          aria-expanded={open}
        >
          {open
            ? <ChevronDown size={18} className="text-muted-foreground" />
            : <ChevronRight size={18} className="text-muted-foreground" />}
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </button>
      </div>
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
    <main className="w-full max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">

      {/* Hero heading */}
      <div className="flex flex-col gap-3">
        <PillLabel>📚 {t('learn.my_learning')}</PillLabel>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {t('learn.active_courses')}
        </h1>
      </div>

      {/* Active Courses */}
      <Section title={t('learn.active_courses')} pill={`🎯 ${t('learn.active_courses')}`}>
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
      <Section title={t('learn.assignments')} pill={`📝 ${t('learn.assignments')}`}>
        {isError && <p className="text-sm text-destructive">{t('learn.loading_error')}</p>}
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
        {!isLoading && !isError && assignments.length > 0 && (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        )}
      </Section>

      {/* Exams */}
      <Section title={t('learn.exams')} pill={`🎓 ${t('learn.exams')}`}>
        {isError && <p className="text-sm text-destructive">{t('learn.loading_error')}</p>}
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
        {!isLoading && !isError && exams.length > 0 && (
          <div className="flex flex-col gap-2">
            {exams.map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        )}
      </Section>

      {/* Completed */}
      <Section
        title={t('learn.completed_section', { count: completedCourses.length })}
        pill={`✅ ${t('learn.completed_section', { count: completedCourses.length })}`}
        defaultOpen={false}
      >
        {isError && <p className="text-sm text-destructive">{t('learn.loading_error')}</p>}
        {!isLoading && !isError && completedCourses.length === 0 && <EmptyState icon={BookOpen} />}
        {!isError && completedCourses.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </Section>
    </main>
  );
}
