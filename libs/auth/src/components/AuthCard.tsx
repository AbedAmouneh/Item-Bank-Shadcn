import { cn } from '@item-bank/ui';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[480px] mx-4',
        'backdrop-blur-[20px] rounded-[24px] p-10',
        'border border-border',
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--auth-card-background))',
        boxShadow: '0 8px 40px 0 hsl(var(--auth-card-shadow))',
      }}
    >
      {children}
    </div>
  );
}
