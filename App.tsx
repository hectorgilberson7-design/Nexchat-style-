import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { listConversations, type ConversationKind, type ConversationSummary } from '@/lib/chatService';
import AppHeader from '@/components/AppHeader';
import BottomNav, { type Tab } from '@/components/BottomNav';
import DiscussionsHub from '@/components/DiscussionsHub';
import StatusesView from '@/components/StatusesView';
import LivesView from '@/components/LivesView';
import ChatView from '@/components/ChatView';
import ConversationInfoView from '@/components/ConversationInfoView';
import AssistantView from '@/components/AssistantView';
import ProfileView from '@/components/ProfileView';
import AuthScreen from '@/components/AuthScreen';
import NewConversationDialog from '@/components/NewConversationDialog';
import NewGroupDialog from '@/components/NewGroupDialog';

function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-nc-cyan" />
    </div>
  );
}

const TAB_TITLES: Record<Tab, string | null> = {
  discussions: null,
  statuses: 'Statuts',
  lives: 'Lives',
  assistant: 'NexChat AI',
  profile: 'Profil',
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('discussions');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [creating, setCreating] = useState<ConversationKind | null>(null);

  const userId = user?.id ?? null;

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setConversations(await listConversations());
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : 'Impossible de charger vos discussions.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void loadConversations();
  }, [userId, loadConversations]);

  if (authLoading) return <FullScreenLoader />;
  if (!user) return <AuthScreen />;

  const openConversation = conversations.find((item) => item.conversationId === openConversationId) ?? null;

  const handleOpen = (conversationId: string) => {
    setOpenConversationId(conversationId);
    setInfoOpen(false);
    if (!conversations.some((item) => item.conversationId === conversationId)) {
      void loadConversations();
    }
  };

  const handleCreated = (conversationId: string) => {
    setCreating(null);
    setTab('discussions');
    handleOpen(conversationId);
  };

  const closeConversation = () => {
    setInfoOpen(false);
    setOpenConversationId(null);
  };

  const showChrome = openConversationId === null;

  return (
    <div className="flex h-full justify-center md:py-6">
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-nc-bg md:rounded-[2rem] md:border md:border-nc-raised md:shadow-neon">
        {openConversationId ? (
          openConversation ? (
            infoOpen ? (
              <ConversationInfoView
                key={`info-${openConversation.conversationId}`}
                conversation={openConversation}
                onBack={() => setInfoOpen(false)}
                onChanged={loadConversations}
              />
            ) : (
              <ChatView
                key={openConversation.conversationId}
                conversation={openConversation}
                currentUserId={user.id}
                onBack={closeConversation}
                onOpenInfo={() => setInfoOpen(true)}
              />
            )
          ) : (
            <FullScreenLoader />
          )
        ) : (
          <>
            <AppHeader
              title={TAB_TITLES[tab]}
              onNewChat={() => setCreating('direct')}
              onNewGroup={() => setCreating('group')}
            />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {tab === 'discussions' && (
                <DiscussionsHub
                  conversations={conversations}
                  loading={listLoading}
                  error={listError}
                  onRetry={loadConversations}
                  onOpen={handleOpen}
                  onCreate={setCreating}
                />
              )}
              {tab === 'statuses' && <StatusesView userId={user.id} />}
              {tab === 'lives' && <LivesView />}
              {tab === 'assistant' && <AssistantView />}
              {tab === 'profile' && <ProfileView user={user} />}
            </main>
          </>
        )}

        {showChrome && <BottomNav active={tab} onChange={setTab} />}

        {creating === 'direct' && (
          <NewConversationDialog onClose={() => setCreating(null)} onCreated={handleCreated} />
        )}
        {(creating === 'group' || creating === 'channel') && (
          <NewGroupDialog kind={creating} onClose={() => setCreating(null)} onCreated={handleCreated} />
        )}
      </div>
    </div>
  );
}
