import type { ReactNode, ComponentType } from 'react';
import { cn } from '../lib/utils';

export type SidebarItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  onClick: () => void | Promise<void>;
  selected: boolean;
};

export type SidebarProps = {
  header: ReactNode;
  items: SidebarItem[];
  children?: ReactNode;
};

export default function Sidebar({ header, items, children }: SidebarProps) {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-[280px] shrink-0 flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-border rtl:border-r-0 rtl:border-l">
        {header}
        <div className="h-px bg-border mx-0" />
        <nav className="flex flex-col py-2 px-2 gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150',
                  item.selected
                    ? 'bg-primary-dark text-white'
                    : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground'
                )}
              >
                <Icon className="shrink-0" size={18} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      {children}
    </div>
  );
}
