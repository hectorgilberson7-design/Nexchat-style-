import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, UserPlus, Users } from 'lucide-react';
import { conversationName, type ConversationSummary } from '@/lib/chatService';
import { listMembers, type Member } from '@/lib/groupService';
import { avatarUrl, conversationPhotoUrl, replaceConversationAvatar } from '@/lib/avatarService';
import Avatar from '@/components/Avatar';
import AvatarPicker from '@/components/AvatarPicker';
import AddMemberDialog from '@/components/AddMemberDialog';
import { initialsOf } from '@/lib/format';

type Props = {
  conversation: ConversationSummary;
  onBack: () => void;
  onChanged: () => void;
};

export default function ConversationInfoView({ conversation, onBack, onChanged }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  const isDirect = conversation.kind === 'direct';
  const isChannel = conversation.kind === 'channel';
  const isAdmin = !isDirect && conversation.myRole === 'admin';
  const name = conversationName(conversation);
  const conversationId = conversation.conversationId;

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setMembers(await listMembers(conversationId));
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handlePhoto = async (file: File) => {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await replaceConversationAvatar(conversationId, conversation.avatarPath, file);
      onChanged();
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const kindLabel = isDirect ? 'Discussion privée' : isChannel ? 'Chaîne' : 'Groupe';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto animate-fade-up">
      <header className="flex items-center gap-3 border-b border-nc-raised bg-nc-surface/90 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à la discussion"
          className="flex h-10 w-10 items-center justify-center rounded-full text-nc-text transition-colors duration-200 hover:bg-nc-raised"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold text-nc-text">Infos</p>
      </header>

      <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-8 text-center">
        {isAdmin ? (
          <AvatarPicker
            initials={initialsOf(name)}
            src={conversationPhotoUrl(conversation)}
            busy={photoBusy}
            onSelect={handlePhoto}
            onError={setPhotoError}
          />
        ) : (
          <Avatar initials={initialsOf(name)} src={conversationPhotoUrl(conversation)} size="lg" />
        )}
        {photoError && (
          <p role="alert" className="text-sm text-nc-danger">
            {photoError}
          </p>
        )}
        <div>
          <p className="font-display text-lg font-bold tracking-wide text-nc-text">{name}</p>
          <p className="mt-1 text-sm text-nc-muted">{kindLabel}</p>
        </div>
      </div>

      {!isDirect && (
        <section className="space-y-3 px-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-nc-text">
              <Users className="h-4 w-4 text-nc-cyan" />
              Membres ({members.length})
            </h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddingMember(true)}
                className="flex items-center gap-2 rounded-full border border-nc-cyan/50 px-3 py-1.5 text-xs font-semibold text-nc-cyan transition-colors duration-200 hover:bg-nc-cyan/10"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}
          </div>
          <MemberList members={members} loading={loading} error={loadError} onRetry={loadMembers} />
        </section>
      )}

      {isDirect && (
        <section className="space-y-3 px-4 pb-8">
          <h2 className="font-semibold text-nc-text">Contact</h2>
          <div className="flex items-center gap-3 rounded-2xl border border-nc-raised bg-nc-surface p-4">
            <Avatar initials={initialsOf(name)} src={avatarUrl(conversation.partnerAvatarPath)} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-nc-text">{name}</p>
              <p className="truncate text-sm text-nc-muted">@{conversation.partnerUsername}</p>
            </div>
          </div>
        </section>
      )}

      {addingMember && (
        <AddMemberDialog
          conversationId={conversationId}
          onClose={() => setAddingMember(false)}
          onAdded={() => {
            setAddingMember(false);
            void loadMembers();
          }}
        />
      )}
    </div>
  );
}

function MemberList({
  members,
  loading,
  error,
  onRetry,
}: {
  members: Member[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-nc-cyan" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-nc-danger">
          {error}
        </p>
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-nc-cyan hover:underline">
          Réessayer
        </button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-nc-raised overflow-hidden rounded-2xl border border-nc-raised bg-nc-surface">
      {members.map((member) => (
        <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
          <Avatar initials={initialsOf(member.displayName)} src={avatarUrl(member.avatarPath)} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-nc-text">{member.displayName}</p>
            <p className="truncate text-xs text-nc-muted">@{member.username}</p>
          </div>
          {member.role === 'admin' && (
            <span className="shrink-0 rounded-full bg-nc-cyan/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nc-cyan">
              Admin
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
