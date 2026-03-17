import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DropdownItem {
  key: string;
  label: string;
  onClick: () => void;
}

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-9 px-4 py-2 text-sm rounded-md',
        lg: 'h-10 px-6 text-base rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ActionButtonProps extends VariantProps<typeof buttonVariants> {
  btnLabel?: string;
  onClick?: () => void;
  dropdownItems?: DropdownItem[];
  style?: React.CSSProperties;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  btnLabel,
  onClick,
  dropdownItems,
  size = 'default',
  variant = 'default',
  style,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasDropdown = dropdownItems && dropdownItems.length > 0;

  if (hasDropdown) {
    return (
      <DropdownMenuPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            className={cn(buttonVariants({ variant, size }), 'gap-2')}
            style={style}
          >
            {btnLabel}
            <ChevronDown size={14} />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            className="min-w-[140px] rounded-lg border border-border bg-popover shadow-card p-1 z-50 animate-fade-in"
            sideOffset={4}
            align="end"
          >
            {dropdownItems.map((item) => (
              <DropdownMenuPrimitive.Item
                key={item.key}
                className="flex items-center px-3 py-2 text-sm rounded-md cursor-pointer text-popover-foreground hover:bg-accent focus:bg-accent transition-colors outline-none"
                onSelect={() => {
                  item.onClick();
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </DropdownMenuPrimitive.Item>
            ))}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      onClick={onClick}
      style={style}
    >
      {btnLabel}
    </button>
  );
};

export default ActionButton;
