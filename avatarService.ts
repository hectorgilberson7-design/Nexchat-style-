import { supabase } from '@/lib/supabase';
import type { ConversationSummary } from '@/lib/chatService';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function conversationPhotoUrl(conversation: ConversationSummary): string | null {
  return avatarUrl(conversation.kind === 'direct' ? conversation.partnerAvatarPath : conversation.avatarPath);
}

export function validateAvatarFile(file: File): string | null {
  if (!EXTENSIONS[file.type]) return 'Choisissez une image JPEG, PNG ou WebP.';
  if (file.size > MAX_AVATAR_BYTES) return 'La photo doit faire moins de 2 Mo.';
  return null;
}

async function uploadAvatar(folder: string, file: File): Promise<string> {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);
  const path = `${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error("La photo n'a pas pu être envoyée. Réessayez.");
  return path;
}

async function removeAvatar(path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

export async function replaceMyAvatar(userId: string, previousPath: string | null, file: File): Promise<string> {
  const path = await uploadAvatar(`users/${userId}`, file);
  const { error } = await supabase.rpc('set_my_avatar', { avatar: path });
  if (error) {
    await removeAvatar(path);
    throw new Error("La photo n'a pas pu être enregistrée.");
  }
  await removeAvatar(previousPath);
  return path;
}

export async function replaceConversationAvatar(
  conversationId: string,
  previousPath: string | null,
  file: File
): Promise<string> {
  const path = await uploadAvatar(`groups/${conversationId}`, file);
  const { error } = await supabase.rpc('set_conversation_avatar', {
    conv_id: conversationId,
    avatar: path,
  });
  if (error) {
    await removeAvatar(path);
    throw new Error(
      error.message.includes('forbidden')
        ? 'Seuls les administrateurs peuvent changer la photo.'
        : "La photo n'a pas pu être enregistrée."
    );
  }
  await removeAvatar(previousPath);
  return path;
}
