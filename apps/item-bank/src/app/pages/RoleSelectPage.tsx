import { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

const LAST_MODE_KEY = 'last-mode';

/**
 * Mode picker shown to dual-role users (authoring + learner) on their first
 * login. On revisit, immediately redirects to the stored last-mode.
 *
 * This page is placed inside AuthoringRoute (no shell) so it's a full-screen
 * picker with no nav bar distracting from the choice.
 */
export default function RoleSelectPage() {
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
          Your account has access to two experiences.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose how you want to proceed — you can switch at any time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {/* Authoring card */}
        <button
          onClick={handleSelectAuthor}
          className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-border bg-card text-card-foreground hover:border-primary hover:shadow-card transition-all cursor-pointer text-start"
          aria-label="Go to Authoring Tools"
        >
          <span className="text-4xl" aria-hidden>✏️</span>
          <div>
            <p className="font-semibold text-lg">Authoring Tools</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage your content
            </p>
          </div>
        </button>

        {/* Learning card */}
        <button
          onClick={handleSelectLearn}
          className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-border bg-card text-card-foreground hover:border-primary hover:shadow-card transition-all cursor-pointer text-start"
          aria-label="Go to My Learning"
        >
          <span className="text-4xl" aria-hidden>🎓</span>
          <div>
            <p className="font-semibold text-lg">My Learning</p>
            <p className="text-sm text-muted-foreground mt-1">
              View your assigned courses and exams
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
