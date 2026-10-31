import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { deleteStatus, listActiveStatuses, type StatusWithAuthor } from '@/lib/statusService';
import { initialsOf } from '@/lib/format';
import Avatar from '@/components/Avatar';
import PublishStatusDialog from '@/components/PublishStatusDialog';

type Props = {
  userId: string;
};

function hoursLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.max(0, Math.round(ms / 3_600_000));
  return hours <= 1 ? 'Expire bientôt' : `Expire dans ${hours} h`;
}

export default function StatusesView({ userId }: Props) {
  const [statuses, setStatuses] = useState<StatusWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatuses(await listActiveStatuses());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les statuts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (statusId: string) => {
    setActionError(null);
    setDeletingId(statusId);
    try {
      await deleteStatus(statusId);
      setStatuses((current) => current.filter((item) => item.id !== statusId));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  const mine = statuses.filter((status) => status.user_id === userId);
  const others = statuses.filter((status) => status.user_id !== userId);

  return (
    <div className="flex min-h-full flex-col animate-fade-up">
      <button
        type="button"
        onClick={() => setPublishing(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-nc-surface"
      >
        <div className="relative">
          <Avatar initials="+" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-nc-bg bg-nc-cyan text-nc-bg">
            <Plus className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>
        <div>
          <p className="font-semibold text-nc-text">Mon statut</p>
          <p className="text-sm text-nc-muted">Appuyez pour publier un statut</p>
        </div>
      </button>

      {actionError && (
        <p role="alert" className="mx-4 mb-2 rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-nc-cyan" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p className="text-sm text-nc-muted">{error}</p>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 rounded-full border border-nc-cyan/50 px-4 py-2 text-sm font-semibold text-nc-cyan transition-colors duration-200 hover:bg-nc-cyan/10"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      ) : statuses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="font-semibold text-nc-text">Aucun statut actif</p>
          <p className="max-w-xs text-sm text-nc-muted">Les statuts publiés apparaissent ici pendant 24 heures.</p>
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <StatusSection title="Mes statuts">
              {mine.map((status) => (
                <StatusRow
                  key={status.id}
                  status={status}
                  name="Mon statut"
                  onDelete={() => handleDelete(status.id)}
                  deleting={deletingId === status.id}
                />
              ))}
            </StatusSection>
          )}
          {others.length > 0 && (
            <StatusSection title="Mises à jour récentes">
              {others.map((status) => (
                <StatusRow key={status.id} status={status} name={status.authorName} />
              ))}
            </StatusSection>
          )}
        </>
      )}

      {publishing && (
        <PublishStatusDialog
          onClose={() => setPublishing(false)}
          onPublished={() => {
            setPublishing(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function StatusSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-4 pb-1 pt-4 text-sm font-semibold text-nc-muted">{title}</h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

type RowProps = {
  status: StatusWithAuthor;
  name: string;
  onDelete?: () => void;
  deleting?: boolean;
};

function StatusRow({ status, name, onDelete, deleting = false }: RowProps) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="rounded-full border-2 border-nc-cyan p-0.5">
        <Avatar initials={initialsOf(status.authorName)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-nc-text">{name}</p>
        <p className="text-xs text-nc-muted">{hoursLeft(status.expires_at)}</p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-nc-text">{status.body}</p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Supprimer mon statut"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-nc-muted transition-colors duration-200 hover:bg-nc-danger/15 hover:text-nc-danger disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      )}
    </li>
  );
}
