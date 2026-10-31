import { supabase } from '@/lib/supabase';

export type ConversationKind = 'direct' | 'group' | 'channel';

export type ConversationSummary = {
  conversationId: string;
  kind: ConversationKind;
  title: string | null;
  myRole: 'admin' | 'member';
  memberCount: number;
  partnerId: string | null;
  partnerUsername: string | null;
  partnerDisplayName: string | null;
  partnerAvatarPath: string | null;
  avatarPath: string | null;
  lastBody: string | null;
  lastAt: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ConversationRow = {
  conversation_id: string;
  kind: ConversationKind;
  title: string | null;
  my_role: 'admin' | 'member';
  member_count: number;
  partner_id: string | null;
  partner_username: string | null;
  partner_display_name: string | null;
  last_body: string | null;
  last_at: string | null;
  conversation_avatar_path: string | null;
  partner_avatar_path: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  user_not_found: "Aucun compte ne correspond à ce nom d'utilisateur.",
  cannot_message_self: 'Vous ne pouvez pas vous écrire à vous-même.',
  not_authenticated: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  forbidden: 'Seuls les administrateurs peuvent faire cette action.',
  invalid_title: 'Donnez un nom à votre groupe ou chaîne.',
  invalid_kind: "Ce type de discussion n'est pas valide.",
};

export function toUserMessage(error: { message: string }, fallback: string) {
  const key = error.message.split(':')[0].trim();
  if (key === 'user_not_found') {
    const name = error.message.split(':')[1]?.trim();
    return name
      ? `Aucun compte ne correspond à « ${name} ».`
      : ERROR_MESSAGES.user_not_found;
  }
  return ERROR_MESSAGES[key] ?? fallback;
}

export function conversationName(conversation: ConversationSummary) {
  if (conversation.kind === 'direct') return conversation.partnerDisplayName ?? 'Discussion';
  return conversation.title ?? 'Sans nom';
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('list_my_conversations');
  if (error) throw new Error(toUserMessage(error, 'Impossible de charger vos discussions.'));

  return (data as ConversationRow[]).map((row) => ({
    conversationId: row.conversation_id,
    kind: row.kind,
    title: row.title,
    myRole: row.my_role,
    memberCount: row.member_count,
    partnerId: row.partner_id,
    partnerUsername: row.partner_username,
    partnerDisplayName: row.partner_display_name,
    partnerAvatarPath: row.partner_avatar_path,
    avatarPath: row.conversation_avatar_path,
    lastBody: row.last_body,
    lastAt: row.last_at,
  }));
}

export async function startConversation(username: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_direct_conversation', {
    other_username: username,
  });
  if (error) throw new Error(toUserMessage(error, 'Impossible de créer la discussion.'));
  if (typeof data !== 'string') throw new Error('Impossible de créer la discussion.');
  return data;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw new Error('Impossible de charger les messages.');
  return data;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, body })
    .select('id, conversation_id, sender_id, body, created_at')
    .single();
  if (error) throw new Error("Le message n'a pas pu être envoyé. Vérifiez votre connexion.");
  return data;
}

export async function searchMessages(term: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .ilike('body', `%${term}%`)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error('La recherche de messages a échoué.');
  return data;
}
