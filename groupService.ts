import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/chatService';

export type GroupKind = 'group' | 'channel';

export async function createGroup(kind: GroupKind, title: string, usernames: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    group_kind: kind,
    group_title: title,
    member_usernames: usernames,
  });
  if (error) throw new Error(toUserMessage(error, 'Impossible de créer le groupe.'));
  if (typeof data !== 'string') throw new Error('Impossible de créer le groupe.');
  return data;
}

export async function addGroupMember(conversationId: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('add_group_member', {
    conv_id: conversationId,
    member_username: username,
  });
  if (error) throw new Error(toUserMessage(error, "Impossible d'ajouter ce membre."));
}

export type Member = {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  role: 'admin' | 'member';
};

export async function listMembers(conversationId: string): Promise<Member[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('conversation_members')
    .select('user_id, role')
    .eq('conversation_id', conversationId);
  if (memberError) throw new Error('Impossible de charger les membres.');
  const members = memberRows as { user_id: string; role: 'admin' | 'member' }[];
  if (members.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_path')
    .in('id', members.map((member) => member.user_id));
  if (profileError) throw new Error('Impossible de charger les membres.');
  const profiles = new Map(
    (profileRows as { id: string; username: string; display_name: string; avatar_path: string | null }[]).map(
      (profile) => [profile.id, profile]
    )
  );

  return members
    .flatMap((member) => {
      const profile = profiles.get(member.user_id);
      if (!profile) return [];
      return [
        {
          userId: member.user_id,
          username: profile.username,
          displayName: profile.display_name,
          avatarPath: profile.avatar_path,
          role: member.role,
        },
      ];
    })
    .sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin') || a.displayName.localeCompare(b.displayName));
}
