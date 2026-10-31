import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Check, Loader2, LogOut, Save } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { signOut } from '@/lib/authService';
import { getProfile, updateDisplayName, type ProfileRow } from '@/lib/profileService';
import { avatarUrl, replaceMyAvatar } from '@/lib/avatarService';
import AvatarPicker from '@/components/AvatarPicker';
import { initialsOf } from '@/lib/format';

type Props = {
  user: User;
};

const INPUT_CLASS =
  'w-full rounded-xl border border-nc-raised bg-nc-bg px-4 py-3 text-sm text-nc-text placeholder:text-nc-muted focus:border-nc-cyan focus:outline-none focus:ring-2 focus:ring-nc-cyan/30';

export default function ProfileView({ user }: Props) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProfile(user.id)
      .then((row) => {
        if (!active) return;
        if (!row) {
          setLoadError('Votre profil est introuvable. Reconnectez-vous ou réessayez plus tard.');
          return;
        }
        setProfile(row);
        setDisplayName(row.display_name);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(caught instanceof Error ? caught.message : 'Impossible de charger votre profil.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = displayName.trim();
    if (!cleaned || cleaned.length > 60) {
      setSaveError('Le nom affiché doit contenir entre 1 et 60 caractères.');
      return;
    }

    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateDisplayName(user.id, cleaned);
      setProfile((current) => (current ? { ...current, display_name: cleaned } : current));
      setSaved(true);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (file: File) => {
    if (!profile) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const path = await replaceMyAvatar(user.id, profile.avatar_path, file);
      setProfile((current) => (current ? { ...current, avatar_path: path } : current));
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : 'Une erreur est survenue.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (caught) {
      setSignOutError(caught instanceof Error ? caught.message : 'La déconnexion a échoué.');
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-nc-cyan" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <p role="alert" className="m-4 rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
        {loadError ?? 'Profil indisponible.'}
      </p>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 pt-6 animate-fade-up">
      <div className="flex flex-col items-center gap-3 text-center">
        <AvatarPicker
          initials={initialsOf(profile.display_name)}
          src={avatarUrl(profile.avatar_path)}
          busy={photoBusy}
          onSelect={handlePhoto}
          onError={setPhotoError}
        />
        {photoError && (
          <p role="alert" className="text-sm text-nc-danger">
            {photoError}
          </p>
        )}
        <div>
          <p className="font-display text-lg font-bold tracking-wide text-nc-text">{profile.display_name}</p>
          <p className="text-sm text-nc-muted">@{profile.username}</p>
          <p className="mt-1 text-xs text-nc-muted">Membre depuis {memberSince}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-nc-raised bg-nc-surface p-5" noValidate>
        <h2 className="font-semibold text-nc-text">Modifier mon profil</h2>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-nc-muted">Nom affiché</span>
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setSaved(false);
            }}
            maxLength={60}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-nc-muted">Nom d'utilisateur (non modifiable)</span>
          <input value={`@${profile.username}`} readOnly className={`${INPUT_CLASS} opacity-70`} />
        </label>

        {saveError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-nc-danger" />
            <span>{saveError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || displayName.trim() === profile.display_name}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-nc-cyan py-3 text-sm font-bold text-nc-bg transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Profil enregistré' : 'Enregistrer'}
        </button>
      </form>

      <div className="space-y-3">
        {signOutError && (
          <p role="alert" className="rounded-xl border border-nc-danger/40 bg-nc-danger/10 px-3 py-2.5 text-sm text-nc-text">
            {signOutError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-nc-danger/50 py-3 text-sm font-semibold text-nc-danger transition-colors duration-200 hover:bg-nc-danger/10 disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
