import { supabase } from '@/lib/supabase';

export type Status = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  expires_at: string;
};

export type StatusWithAuthor = Status & {
  authorName: string;
  authorUsername: string;
};

export async function listActiveStatuses(): Promise<StatusWithAuthor[]> {
  const { data, error } = await supabase
    .from('statuses')
    .select('id, user_id, body, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('Impossible de charger les statuts.');

  const rows = data as Status[];
  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  const authors = new Map<string, { username: string; display_name: string }>();

  if (authorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', authorIds);
    if (profileError) throw new Error('Impossible de charger les auteurs des statuts.');
    for (const profile of profiles as { id: string; username: string; display_name: string }[]) {
      authors.set(profile.id, { username: profile.username, display_name: profile.display_name });
    }
  }

  return rows.map((row) => ({
    ...row,
    authorName: authors.get(row.user_id)?.display_name ?? 'Utilisateur',
    authorUsername: authors.get(row.user_id)?.username ?? '',
  }));
}

export async function publishStatus(body: string): Promise<void> {
  const { error } = await supabase.from('statuses').insert({ body });
  if (error) throw new Error("Le statut n'a pas pu être publié. Réessayez.");
}

export async function deleteStatus(statusId: string): Promise<void> {
  const { error } = await supabase.from('statuses').delete().eq('id', statusId);
  if (error) throw new Error("Le statut n'a pas pu être supprimé. Réessayez.");
}
