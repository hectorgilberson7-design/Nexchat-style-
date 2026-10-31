import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import Logo from '@/components/Logo';
import { signIn, signUp } from '@/lib/authService';

type Mode = 'signin' | 'signup';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

const INPUT_CLASS =
  'w-full rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted transition-colors duration-200 focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isSignup) {
      const normalizedUsername = username.trim().toLowerCase();
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        setError("Le nom d'utilisateur doit contenir 3 à 24 lettres sans accent, chiffres ou tirets bas.");
        return;
      }
      if (!displayName.trim()) {
        setError('Indiquez le nom affiché sur votre profil.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp({ username: username.trim(), displayName, email: email.trim(), password });
      } else {
        await signIn(email.trim(), password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-up space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl border border-nc-raised bg-nc-surface/90 p-6 shadow-neon backdrop-blur-md">
          <h1 className="font-display text-xl font-bold tracking-wide text-nc-text">
            {isSignup ? 'Créer un compte' : 'Connexion'}
          </h1>
          <p className="mt-1 text-sm text-nc-muted">
            {isSignup
              ? 'Choisissez un nom d’utilisateur pour être trouvé par vos contacts.'
              : 'Retrouvez vos discussions privées chiffrées.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {isSignup && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-nc-muted">Nom affiché</span>
                  <input
                    className={INPUT_CLASS}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Ex. Sarah Martin"
                    autoComplete="name"
                    maxLength={60}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-nc-muted">Nom d'utilisateur</span>
                  <input
                    className={INPUT_CLASS}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="sarah_martin"
                    autoComplete="username"
                    maxLength={24}
                  />
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-nc-muted">Adresse e-mail</span>
              <input
                type="email"
                className={INPUT_CLASS}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-nc-muted">Mot de passe</span>
              <input
                type="password"
                className={INPUT_CLASS}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6 caractères minimum"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={6}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-nc-cyan py-3 text-sm font-bold text-nc-bg shadow-neon transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignup ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSignup ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-nc-muted">
          {isSignup ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-nc-cyan transition-colors duration-200 hover:text-nc-text"
          >
            {isSignup ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
      </div>
    </div>
  );
}
