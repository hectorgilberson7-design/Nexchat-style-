import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { startConversation } from '@/lib/chatService';

type Props = {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
};

export default function NewConversationDialog({ onClose, onCreated }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = username.trim().replace(/^@/, '').toLowerCase();
    if (!cleaned) {
      setError("Saisissez le nom d'utilisateur de votre contact.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const conversationId = await startConversation(cleaned);
      onCreated(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-nc-bg/70 p-4 backdrop-blur-sm animate-fade-up sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-nc-raised bg-nc-surface p-6 shadow-neon">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-nc-text">Nouvelle discussion</h2>
            <p className="mt-1 text-sm text-nc-muted">Saisissez le nom d'utilisateur de la personne.</p>
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
            <span className="text-xs font-medium text-nc-muted">Nom d'utilisateur</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@sarah_martin"
              autoFocus
              maxLength={25}
              className="w-full rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30"
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
            Démarrer la discussion
          </button>
        </form>
      </div>
    </div>
  );
}
