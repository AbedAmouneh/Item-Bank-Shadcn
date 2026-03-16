import { cn } from '@item-bank/ui';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface AuthFieldProps {
  type: string;
  placeholder: string;
  error?: string | null;
  icon: React.ReactNode;
  registration: UseFormRegisterReturn;
  endAdornment?: React.ReactNode;
}

export default function AuthField({
  type,
  placeholder,
  error,
  icon,
  registration,
  endAdornment,
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {/* Leading icon */}
        <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center w-5 h-5 pointer-events-none">
          {icon}
        </div>

        <input
          type={type}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-2xl border bg-[hsl(var(--auth-field-background))]',
            'ps-10 py-3 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary',
            'transition-colors duration-150',
            endAdornment ? 'pe-10' : 'pe-4',
            error
              ? 'border-destructive focus:ring-destructive focus:border-destructive'
              : 'border-border hover:border-border/70'
          )}
          {...registration}
        />

        {/* Trailing adornment (e.g. show/hide password button) */}
        {endAdornment && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
      </div>

      {/* Inline error text */}
      {error && (
        <p className="text-xs text-destructive ps-1">{error}</p>
      )}
    </div>
  );
}
