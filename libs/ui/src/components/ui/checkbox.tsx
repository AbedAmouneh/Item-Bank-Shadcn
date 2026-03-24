import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Checkbox — a Radix-powered check input supporting three visual states:
 *   • unchecked   → empty box
 *   • checked     → box with a tick
 *   • indeterminate → box with a dash (used in "select-all" table headers)
 *
 * The `group` class on Root lets child selectors react to `data-state`
 * without any JavaScript logic — pure CSS driven by the Radix state machine.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'group peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {/* Tick — shown only in the checked state */}
      <Check className="hidden h-3.5 w-3.5 group-data-[state=checked]:block" strokeWidth={3} />
      {/* Dash — shown only in the indeterminate state */}
      <Minus className="hidden h-3.5 w-3.5 group-data-[state=indeterminate]:block" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
