import { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LAST_MODE_KEY = 'last-mode';

/**
 * Mode picker shown to dual-role users (authoring + learner) on their first
 * login. On revisit, immediately redirects to the stored last-mode.
 *
 * This page is placed inside AuthoringRoute (no shell) so it's a full-screen
 * picker with no nav bar distracting from the choice.
 */
export default function RoleSelectPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  // On revisit, skip the picker and go straight to the last-used mode.
  useEffect(() => {
    const lastMode = localStorage.getItem(LAST_MODE_KEY);
    if (lastMode === 'author') navigate('/dashboard', { replace: true });
    else if (lastMode === 'learn') navigate('/learn/dashboard', { replace: true });
    // Any other value (corrupted storage) — fall through and show the cards.
  }, [navigate]);

  const handleSelectAuthor = () => {
    localStorage.setItem(LAST_MODE_KEY, 'author');
    navigate('/dashboard', { replace: true });
  };

  const handleSelectLearn = () => {
    localStorage.setItem(LAST_MODE_KEY, 'learn');
    navigate('/learn/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {t('role_select.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('role_select.subtitle')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {/* Authoring card */}
        <button
          onClick={handleSelectAuthor}
          className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-border bg-card text-card-foreground hover:border-primary hover:shadow-card transition-all cursor-pointer text-start"
          aria-label={t('role_select.authoring_tools_aria')}
        >
          <span className="text-4xl" aria-hidden>✏️</span>
          <div>
            <p className="font-semibold text-lg">{t('role_select.authoring_tools')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('role_select.authoring_tools_desc')}
            </p>
          </div>
        </button>

        {/* Learning card */}
        <button
          onClick={handleSelectLearn}
          className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-border bg-card text-card-foreground hover:border-primary hover:shadow-card transition-all cursor-pointer text-start"
          aria-label={t('role_select.my_learning_aria')}
        >
          <span className="text-4xl" aria-hidden>🎓</span>
          <div>
            <p className="font-semibold text-lg">{t('role_select.my_learning')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('role_select.my_learning_desc')}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
