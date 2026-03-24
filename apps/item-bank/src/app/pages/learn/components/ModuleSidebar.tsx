import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, PlayCircle } from 'lucide-react';

import { cn } from '@item-bank/ui';
import type { CourseModule } from '@item-bank/types';

type ModuleSidebarProps = {
  modules: CourseModule[];
  courseId: number;
  activeModuleId?: number;
};

/**
 * Vertical module list for the course player sidebar.
 *
 * Icon priority (top wins):
 * 1. completed         -> CheckCircle2 (green)
 * 2. active + unlocked -> PlayCircle (blue)
 * 3. locked            -> Lock (muted)
 */
export function ModuleSidebar({ modules, courseId, activeModuleId }: ModuleSidebarProps) {
  const navigate = useNavigate();
  const sorted = [...modules].sort((a, b) => a.position - b.position);

  return (
    <nav aria-label="Course modules" className="flex flex-col gap-1 p-3">
      {sorted.map((mod) => {
        const isActive = mod.id === activeModuleId;

        return (
          <button
            key={mod.id}
            type="button"
            disabled={mod.locked}
            onClick={() => navigate(`/learn/courses/${courseId}/module/${mod.id}`)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors',
              mod.locked
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              isActive && !mod.locked && !mod.completed
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground',
            )}
            aria-current={isActive ? 'step' : undefined}
          >
            {mod.completed ? (
              <CheckCircle2
                size={16}
                className="shrink-0 text-green-600 dark:text-green-400"
                aria-label="Completed"
              />
            ) : isActive && !mod.locked ? (
              <PlayCircle
                size={16}
                className="shrink-0 text-primary"
                aria-label="Current module"
              />
            ) : (
              <Lock
                size={16}
                className="shrink-0 text-muted-foreground"
                aria-label="Locked"
              />
            )}
            <span className="truncate">{mod.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
