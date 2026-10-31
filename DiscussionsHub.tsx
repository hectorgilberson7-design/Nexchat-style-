import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import type { ConversationKind, ConversationSummary } from '@/lib/chatService';
import ChatList from '@/components/ChatList';

type Section = 'messages' | 'groups' | 'channels';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'groups', label: 'Groupes' },
  { id: 'channels', label: 'Chaînes' },
];

const CHAT_SECTIONS: Record<Section, { kind: ConversationKind; title: string; hint: string; fabLabel: string }> = {
  messages: {
    kind: 'direct',
    title: 'Aucune discussion pour le moment',
    hint: "Appuyez sur le bouton « + » et saisissez le nom d'utilisateur d'un contact.",
    fabLabel: 'Nouvelle discussion',
  },
  groups: {
    kind: 'group',
    title: 'Aucun groupe',
    hint: 'Créez un groupe pour discuter avec plusieurs contacts à la fois.',
    fabLabel: 'Nouveau groupe',
  },
  channels: {
    kind: 'channel',
    title: 'Aucune chaîne',
    hint: 'Une chaîne diffuse des messages à ses abonnés. Seuls les administrateurs publient.',
    fabLabel: 'Nouvelle chaîne',
  },
};

type Props = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (conversationId: string) => void;
  onCreate: (kind: ConversationKind) => void;
};

export default function DiscussionsHub({ conversations, loading, error, onRetry, onOpen, onCreate }: Props) {
  const [section, setSection] = useState<Section>('messages');
  const config = CHAT_SECTIONS[section];

  return (
    <section className="flex min-h-full flex-1 flex-col">
      <nav aria-label="Filtres de discussions" className="overflow-x-auto px-4 pb-2 pt-1">
        <ul className="flex gap-2">
          {SECTIONS.map((item) => {
            const active = item.id === section;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'border-nc-cyan/40 bg-nc-cyan/20 text-nc-cyan'
                      : 'border-nc-raised bg-nc-bg text-nc-muted hover:text-nc-text'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <ChatList
        conversations={conversations.filter((item) => item.kind === config.kind)}
        loading={loading}
        error={error}
        emptyTitle={config.title}
        emptyHint={config.hint}
        onRetry={onRetry}
        onOpen={onOpen}
      />

      <div className="pointer-events-none sticky bottom-4 mt-auto flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={() => onCreate(config.kind)}
          aria-label={config.fabLabel}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-nc-cyan text-nc-bg shadow-neon transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <MessageSquarePlus className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
