import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { publishStatus } from '@/lib/statusService';

type Props = {
  onClose: () => void;
  onPublished: () => void;
};

const EMOJIS = ['🔥', '💡', '🎉', '🛡️', '🌍'];

export default function PublishStatusDialog({ onClose, onPublished }: Props) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      setError('Écrivez un texte pour votre statut.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await publishStatus(text);
      onPublished();
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
            <h2 className="font-display text-lg font-bold tracking-wide text-nc-text">Nouveau statut</h2>
            <p className="mt-1 text-sm text-nc-muted">Visible par les utilisateurs NexChat pendant 24 heures.</p>
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
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={280}
            rows={4}
            autoFocus
            placeholder="Quoi de neuf ?"
            className="w-full resize-none rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30"
          />

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setBody((current) => `${current}${emoji}`.slice(0, 280))}
                  aria-label={`Ajouter ${emoji}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform duration-200 hover:scale-110 hover:bg-nc-raised"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <span className="text-xs text-nc-muted">{body.length}/280</span>
          </div>

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
            Publier
          </button>
        </form>
      </div>
    </div>
  );
}
