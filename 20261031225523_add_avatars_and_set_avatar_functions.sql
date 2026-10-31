/*
# Add profile and group/channel photos

1. Schema changes
- `profiles.avatar_path` (text, nullable): storage path of the user's profile photo, always of the form `users/<user id>/<file>`.
- `conversations.avatar_path` (text, nullable): storage path of a group or channel photo, always of the form `groups/<conversation id>/<file>`.
- `list_my_conversations()` now also returns `conversation_avatar_path` and `partner_avatar_path` so the conversation list can show photos.

2. Storage
- New public bucket `avatars`: JPEG, PNG or WebP only, 2 MB maximum per file. Public URLs are used for display.
- Upload, replace and delete are limited to the owner's own `users/<id>/` folder, or to a group/channel's `groups/<id>/` folder for admins of that group or channel.

3. Functions
- `set_my_avatar(avatar text)`: sets the caller's own profile photo; the path must be inside the caller's folder.
- `set_conversation_avatar(conv_id uuid, avatar text)`: sets a group or channel photo; caller must be an admin of a non-direct conversation.
- Both run as SECURITY DEFINER with an internal `auth.uid()` check, EXECUTE granted to `authenticated` only.

4. Security notes
- Clients cannot write these columns directly; they go through the functions above, which validate the path.
- No new table is exposed; existing row policies on profiles and conversations still apply.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_avatar_path_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_avatar_path_check
  CHECK (avatar_path IS NULL OR (avatar_path LIKE 'users/%' AND length(avatar_path) <= 200));

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_avatar_path_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_avatar_path_check
  CHECK (avatar_path IS NULL OR (avatar_path LIKE 'groups/%' AND length(avatar_path) <= 200));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
CREATE POLICY "avatars_insert_own_folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;
CREATE POLICY "avatars_delete_own_folder" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_insert_group_admin" ON storage.objects;
CREATE POLICY "avatars_insert_group_admin" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1
    FROM conversation_members m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.id::text = (storage.foldername(name))[2]
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND c.kind IN ('group', 'channel')
  )
);

DROP POLICY IF EXISTS "avatars_delete_group_admin" ON storage.objects;
CREATE POLICY "avatars_delete_group_admin" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1
    FROM conversation_members m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.id::text = (storage.foldername(name))[2]
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND c.kind IN ('group', 'channel')
  )
);

CREATE OR REPLACE FUNCTION public.set_my_avatar(avatar text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF avatar IS NULL OR avatar NOT LIKE 'users/' || auth.uid()::text || '/%' OR length(avatar) > 200 THEN
    RAISE EXCEPTION 'invalid_avatar';
  END IF;
  UPDATE profiles SET avatar_path = avatar WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_conversation_avatar(conv_id uuid, avatar text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF avatar IS NULL OR avatar NOT LIKE 'groups/' || conv_id::text || '/%' OR length(avatar) > 200 THEN
    RAISE EXCEPTION 'invalid_avatar';
  END IF;
  SELECT c.kind INTO v_kind
  FROM conversations c
  JOIN conversation_members m ON m.conversation_id = c.id
  WHERE c.id = conv_id AND m.user_id = auth.uid() AND m.role = 'admin';
  IF v_kind IS NULL OR v_kind = 'direct' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE conversations SET avatar_path = avatar WHERE id = conv_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_avatar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_avatar(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_conversation_avatar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_conversation_avatar(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.list_my_conversations();

CREATE FUNCTION public.list_my_conversations()
RETURNS TABLE(
  conversation_id uuid,
  kind text,
  title text,
  my_role text,
  member_count integer,
  partner_id uuid,
  partner_username text,
  partner_display_name text,
  last_body text,
  last_at timestamptz,
  conversation_avatar_path text,
  partner_avatar_path text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  c.id,
  c.kind,
  c.title,
  me.role,
  (SELECT count(*)::int FROM conversation_members x WHERE x.conversation_id = c.id),
  p.id,
  p.username,
  p.display_name,
  lm.body,
  lm.created_at,
  c.avatar_path,
  p.avatar_path
FROM conversation_members me
JOIN conversations c ON c.id = me.conversation_id
LEFT JOIN LATERAL (
  SELECT o.user_id
  FROM conversation_members o
  WHERE o.conversation_id = c.id AND o.user_id <> me.user_id AND c.kind = 'direct'
  LIMIT 1
) po ON true
LEFT JOIN profiles p ON p.id = po.user_id
LEFT JOIN LATERAL (
  SELECT m.body, m.created_at
  FROM messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at DESC
  LIMIT 1
) lm ON true
WHERE me.user_id = auth.uid()
ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.list_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_conversations() TO authenticated;
