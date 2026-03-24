import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle, Lock, ChevronRight } from 'lucide-react';
import type { ComponentType } from 'react';

type AccountCardProps = {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
};

function AccountCard({ title, description, icon: Icon, onClick }: AccountCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-start group"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
        <Icon size={20} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight
        size={18}
        className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors rtl:rotate-180"
      />
    </button>
  );
}

/** Account settings panel — navigation cards linking to profile sub-pages. */
export default function AccountPanel() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <h2 className="text-base font-semibold text-foreground">
        {t('settings.tab_account')}
      </h2>
      <AccountCard
        title={t('profile.edit_profile')}
        description={t('settings.edit_profile_desc')}
        icon={UserCircle}
        onClick={() => navigate('/profile/edit')}
      />
      <AccountCard
        title={t('profile.change_password')}
        description={t('settings.change_password_desc')}
        icon={Lock}
        onClick={() => navigate('/profile/change-password')}
      />
    </div>
  );
}
