import { supabase } from '@/lib/supabase';

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId);
  if (error) throw new Error("Le nom n'a pas pu être enregistré. Réessayez.");
}

export async function getProfilesByIds(userIds: string[]) {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  if (error) throw new Error('Impossible de charger les membres.');
  for (const row of data as { id: string; display_name: string }[]) {
    names.set(row.id, row.display_name);
  }
  return names;
}

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_path, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error('Impossible de charger votre profil.');
  return data as ProfileRow | null;
}

export async function searchProfiles(term: string, excludeId: string): Promise<ProfileRow[]> {
  const pattern = `%${term}%`;
  const columns = 'id, username, display_name, avatar_path, created_at';
  const [byUsername, byName] = await Promise.all([
    supabase.from('profiles').select(columns).ilike('username', pattern).neq('id', excludeId).limit(20),
    supabase.from('profiles').select(columns).ilike('display_name', pattern).neq('id', excludeId).limit(20),
  ]);
  if (byUsername.error || byName.error) throw new Error('La recherche de personnes a échoué.');
  const merged = new Map<string, ProfileRow>();
  for (const row of [...(byUsername.data as ProfileRow[]), ...(byName.data as ProfileRow[])]) {
    merged.set(row.id, row);
  }
  return [...merged.values()].slice(0, 20);
}
