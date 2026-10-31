import { useState } from 'react';
import { MessageSquarePlus, MoreVertical, Users } from 'lucide-react';
import Logo from '@/components/Logo';
import { applyTheme, getTheme, type ThemeChoice } from '@/lib/theme';

type Props = {
  title: string | null;
  onNewChat: () => void;
  onNewGroup: () => void;
};

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'system', label: 'Système' },
];

export default function AppHeader({ title, onNewChat, onNewGroup }: Props) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(getTheme());

  const chooseTheme = (choice: ThemeChoice) => {
    applyTheme(choice);
    setTheme(choice);
  };

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <header className="relative flex items-center justify-between gap-3 bg-nc-bg px-4 py-3">
      {title ? <h1 className="text-xl font-bold text-nc-text">{title}</h1> : <Logo />}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-nc-text transition-colors duration-200 hover:bg-nc-surface"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-3 top-12 z-30 w-60 overflow-hidden rounded-xl border border-nc-raised bg-nc-surface py-1 shadow-neon animate-fade-up"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onNewChat)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-nc-text transition-colors duration-200 hover:bg-nc-raised"
            >
              <MessageSquarePlus className="h-4 w-4 text-nc-muted" />
              Nouvelle discussion
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onNewGroup)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-nc-text transition-colors duration-200 hover:bg-nc-raised"
            >
              <Users className="h-4 w-4 text-nc-muted" />
              Nouveau groupe
            </button>
            <div className="mt-1 border-t border-nc-raised px-4 py-3">
              <p className="mb-2 text-xs font-medium text-nc-muted">Thème</p>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-nc-bg p-1">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseTheme(item.id)}
                    aria-pressed={theme === item.id}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      theme === item.id ? 'bg-nc-cyan text-nc-bg' : 'text-nc-muted hover:text-nc-text'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
