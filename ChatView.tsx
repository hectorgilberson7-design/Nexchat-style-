import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Lock, Send } from 'lucide-react';
import { conversationName, listMessages, sendMessage, type ConversationSummary, type Message } from '@/lib/chatService';
import { conversationPhotoUrl } from '@/lib/avatarService';
import { getProfilesByIds } from '@/lib/profileService';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import { formatDayLabel, formatMessageTime, initialsOf } from '@/lib/format';

type Props = {
  conversation: ConversationSummary;
  currentUserId: string;
  onBack: () => void;
  onOpenInfo: () => void;
};

export default function ChatView({ conversation, currentUserId, onBack, onOpenInfo }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation.conversationId;
  const isDirect = conversation.kind === 'direct';
  const isChannel = conversation.kind === 'channel';
  const canPost = !isChannel || conversation.myRole === 'admin';
  const name = conversationName(conversation);

  useEffect(() => {
    let active = true;

    const appendMessage = (message: Message) => {
      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );
    };

    setLoading(true);
    setLoadError(null);
    listMessages(conversationId)
      .then(async (rows) => {
        if (!active) return;
        setMessages(rows);
        const senderIds = [...new Set(rows.map((row) => row.sender_id))];
        const senderNames = await getProfilesByIds(senderIds);
        if (active) setNames(senderNames);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(caught instanceof Error ? caught.message : 'Impossible de charger les messages.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (active) appendMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canPost) return;

    setSendError(null);
    setSending(true);
    try {
      const saved = await sendMessage(conversationId, body);
      setMessages((current) =>
        current.some((existing) => existing.id === saved.id) ? current : [...current, saved]
      );
      setDraft('');
    } catch (caught) {
      setSendError(caught instanceof Error ? caught.message : "Le message n'a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  };

  const subtitle = isDirect
    ? `@${conversation.partnerUsername} · chiffré de bout en bout`
    : `${conversation.memberCount} membre${conversation.memberCount > 1 ? 's' : ''} · ${isChannel ? 'Chaîne' : 'Groupe'}`;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-fade-up">
      <header className="flex items-center gap-2 bg-nc-surface px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour aux discussions"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-nc-text transition-colors duration-200 hover:bg-nc-raised"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onOpenInfo}
          aria-label="Voir les infos"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left"
        >
          <Avatar initials={initialsOf(name)} src={conversationPhotoUrl(conversation)} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-nc-text">{name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-nc-muted">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </p>
          </div>
        </button>
      </header>

      <div className="chat-bg flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-nc-cyan" />
          </div>
        )}

        {loadError && (
          <p role="alert" className="rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
            {loadError}
          </p>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-nc-muted">
            {canPost ? `Aucun message pour le moment. Dites bonjour à ${name} !` : 'Aucun message pour le moment.'}
          </p>
        )}

        {messages.map((message, index) => {
          const mine = message.sender_id === currentUserId;
          const showSender = !isDirect && !mine;
          const previous = index > 0 ? messages[index - 1] : null;
          const newDay =
            !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
          const sameSenderAsPrevious = previous?.sender_id === message.sender_id && !newDay;
          return (
            <div key={message.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-nc-surface px-3 py-1 text-xs font-medium text-nc-muted shadow-sm">
                    {formatDayLabel(message.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${sameSenderAsPrevious ? '' : 'mt-2'}`}>
                <div
                  className={`max-w-[82%] rounded-lg px-2.5 pb-1 pt-1.5 text-[15px] leading-snug text-nc-text shadow-sm ${
                    mine ? 'bg-nc-out' : 'bg-nc-in'
                  } ${sameSenderAsPrevious ? '' : mine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                >
                  {showSender && (
                    <p className="mb-0.5 text-xs font-semibold text-nc-cyan">
                      {names.get(message.sender_id) ?? 'Membre'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className="mt-0.5 text-right text-[11px] text-nc-muted">{formatMessageTime(message.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && (
        <div role="alert" className="mx-3 mb-2 flex items-start gap-2 rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-nc-danger" />
          <span>{sendError}</span>
        </div>
      )}

      {canPost ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-nc-chat px-2 py-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Écrire un message"
            maxLength={4000}
            className="min-w-0 flex-1 rounded-full bg-nc-surface px-4 py-3 text-[15px] text-nc-text placeholder:text-nc-muted focus:outline-none focus:ring-2 focus:ring-nc-cyan/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Envoyer"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nc-cyan text-nc-bg transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      ) : (
        <p className="bg-nc-surface px-4 py-4 text-center text-sm text-nc-muted">
          Seuls les administrateurs peuvent publier dans cette chaîne.
        </p>
      )}
    </div>
  );
}
