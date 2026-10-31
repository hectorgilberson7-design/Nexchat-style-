import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { createGroup, type GroupKind } from '@/lib/groupService';

type Props = {
  kind: GroupKind;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
};

const COPY: Record<GroupKind, { heading: string; hint: string; submit: string }> = {
  group: {
    heading: 'Nouveau groupe',
    hint: 'Tous les membres pourront écrire dans le groupe.',
    submit: 'Créer le groupe',
  },
  channel: {
    heading: 'Nouvelle chaîne',
    hint: 'Seuls les administrateurs publient. Les membres lisent.',
    submit: 'Créer la chaîne',
  },
};

export default function NewGroupDialog({ kind, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [members, setMembers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[kind];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Donnez un nom à votre ' + (kind === 'group' ? 'groupe.' : 'chaîne.'));
      return;
    }

    const usernames = members
      .split(/[\s,;]+/)
      .map((name) => name.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean);

    setError(null);
    setSubmitting(true);
    try {
      const conversationId = await createGroup(kind, cleanTitle, [...new Set(usernames)]);
      onCreated(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-nc-bg/70 p-4 backdrop-blur-sm animate-fade-up sm:items-center">
      <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-nc-raised bg-nc-surface p-6 shadow-neon">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-nc-text">{copy.heading}</h2>
            <p className="mt-1 text-sm text-nc-muted">{copy.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-nc-muted transition-colors duration-200 hover:bg-nc-raised hover:text-nc-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-nc-muted">Nom</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={60}
              autoFocus
              className="w-full rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-nc-muted">Membres (noms d'utilisateur, optionnel)</span>
            <textarea
              value={members}
              onChange={(event) => setMembers(event.target.value)}
              rows={3}
              placeholder="sarah_martin, marc_dev"
              className="w-full resize-none rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30"
            />
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-nc-danger" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-nc-cyan py-3 text-sm font-bold text-nc-bg transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
