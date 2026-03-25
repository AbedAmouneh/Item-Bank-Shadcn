import { HeaderPreferenceButtons } from '@item-bank/ui';

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: 'var(--auth-page-background)' }}
    >
      {/* Utility buttons — top-right, RTL-aware */}
      <div className="absolute top-5 end-5">
        <HeaderPreferenceButtons />
      </div>

      {children}
    </div>
  );
}
