import { useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import type { ConversationSummary } from '@/lib/chatService';
import { conversationName } from '@/lib/chatService';
import Avatar from '@/components/Avatar';
import { formatListTime, initialsOf } from '@/lib/format';
import { conversationPhotoUrl } from '@/lib/avatarService';

type Props = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyHint: string;
  onRetry: () => void;
  onOpen: (conversationId: string) => void;
};

export default function ChatList({ conversations, loading, error, emptyTitle, emptyHint, onRetry, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const visible = conversations.filter((conversation) =>
    conversationName(conversation).toLowerCase().includes(query.trim().toLowerCase())
  );

  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-nc-cyan" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-sm text-nc-muted">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full border border-nc-cyan/50 px-4 py-2 text-sm font-semibold text-nc-cyan transition-colors duration-200 hover:bg-nc-cyan/10"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center animate-fade-up">
        <p className="font-semibold text-nc-text">{emptyTitle}</p>
        <p className="max-w-xs text-sm text-nc-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-fade-up">
      <label className="relative mx-4 mb-2 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-nc-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher"
          className="w-full rounded-full bg-nc-surface py-2.5 pl-11 pr-4 text-sm text-nc-text placeholder:text-nc-muted focus:outline-none focus:ring-2 focus:ring-nc-cyan/40"
        />
      </label>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-nc-muted">Aucun résultat pour cette recherche.</p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((conversation) => {
            const name = conversationName(conversation);
            const subtitle =
              conversation.lastBody ??
              (conversation.kind === 'direct'
                ? `@${conversation.partnerUsername ?? ''}`
                : `${conversation.memberCount} membre${conversation.memberCount > 1 ? 's' : ''}`);
            return (
              <li key={conversation.conversationId}>
                <button
                  type="button"
                  onClick={() => onOpen(conversation.conversationId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-nc-surface active:bg-nc-raised"
                >
                  <Avatar initials={initialsOf(name)} src={conversationPhotoUrl(conversation)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-semibold text-nc-text">{name}</span>
                      <span className="ml-auto shrink-0 text-xs text-nc-muted">
                        {formatListTime(conversation.lastAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-nc-muted">{subtitle}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
