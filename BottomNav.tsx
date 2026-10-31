import { CircleDashed, MessageSquare, Radio, Sparkles, UserRound } from 'lucide-react';

export type Tab = 'discussions' | 'statuses' | 'lives' | 'assistant' | 'profile';

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

const TABS = [
  { id: 'discussions', label: 'Discussions', Icon: MessageSquare },
  { id: 'statuses', label: 'Statuts', Icon: CircleDashed },
  { id: 'lives', label: 'Lives', Icon: Radio },
  { id: 'assistant', label: 'NexChat AI', Icon: Sparkles },
  { id: 'profile', label: 'Profil', Icon: UserRound },
] as const;

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="border-t border-nc-raised bg-nc-surface">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 pb-2.5 pt-2 text-[11px] transition-colors duration-200 ${
                  isActive ? 'font-semibold text-nc-text' : 'font-medium text-nc-muted hover:text-nc-text'
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-nc-cyan/25 text-nc-cyan' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
