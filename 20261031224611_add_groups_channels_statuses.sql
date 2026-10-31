/*
# Add groups, channels and 24-hour statuses

1. Modified Tables
- `conversations`: new `kind` (direct, group or channel), optional `title`, and `created_by`. Existing private conversations are kept as `direct`.
- `conversation_members`: new `role` (admin or member). Existing members become `member`.

2. New Tables
- `statuses`: short text statuses published by a user. Each status expires 24 hours after publication and is hidden afterwards.

3. New Functions
- `create_group_conversation`: creates a group or a channel, makes the creator its admin and adds members by username. Fails completely if a username does not exist.
- `add_group_member`: lets a group admin add a member by username.
- `can_post_to_conversation`: tells whether the signed-in user may write in a conversation. In channels only admins may write.
- `list_my_conversations` is rebuilt to also return the kind, title, role and member count of each conversation.
- `start_direct_conversation` only reuses private conversations, never groups.

4. Security
- Message insertion now follows the channel rule: members can write in groups, only admins can write in channels.
- Statuses are readable by signed-in users only while they are active, can only be published by their author, and can be deleted only by their author.
- No client-side insert into conversations or members; creation goes through the functions above.

5. Important notes
- Statuses are visible to every signed-in user until they expire. Audience controls are not implemented yet.
*/

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'direct';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_kind_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_kind_check CHECK (kind IN ('direct', 'group', 'channel'));
  END IF;
END $$;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_title_check') THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_title_check CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 60);
  END IF;
END $$;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_members_role_check') THEN
    ALTER TABLE conversation_members ADD CONSTRAINT conversation_members_role_check CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS statuses_user_created_idx ON statuses (user_id, created_at);
CREATE INDEX IF NOT EXISTS statuses_expires_idx ON statuses (expires_at);

ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON statuses FROM anon, authenticated;
GRANT SELECT ON statuses TO authenticated;
GRANT INSERT (body) ON statuses TO authenticated;
GRANT DELETE ON statuses TO authenticated;

DROP POLICY IF EXISTS "select_active_statuses" ON statuses;
CREATE POLICY "select_active_statuses" ON statuses FOR SELECT
  TO authenticated USING (expires_at > now());

DROP POLICY IF EXISTS "insert_own_status" ON statuses;
CREATE POLICY "insert_own_status" ON statuses FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_status" ON statuses;
CREATE POLICY "delete_own_status" ON statuses FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION can_post_to_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = conv_id
      AND m.user_id = auth.uid()
      AND (c.kind <> 'channel' OR m.role = 'admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION can_post_to_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_post_to_conversation(uuid) TO authenticated;

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid() AND can_post_to_conversation(conversation_id));

CREATE OR REPLACE FUNCTION create_group_conversation(group_kind text, group_title text, member_usernames text[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
  uname text;
  member_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF group_kind NOT IN ('group', 'channel') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;
  IF char_length(trim(group_title)) = 0 THEN
    RAISE EXCEPTION 'invalid_title';
  END IF;

  INSERT INTO conversations (kind, title, created_by)
  VALUES (group_kind, trim(group_title), me)
  RETURNING id INTO conv;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (conv, me, 'admin');

  FOREACH uname IN ARRAY coalesce(member_usernames, '{}') LOOP
    SELECT id INTO member_id FROM profiles WHERE username = lower(trim(uname));
    IF member_id IS NULL THEN
      RAISE EXCEPTION 'user_not_found: %', uname;
    END IF;
    IF member_id <> me THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (conv, member_id, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_group_conversation(text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_group_conversation(text, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION add_group_member(conv_id uuid, member_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM conversation_members m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = conv_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND c.kind <> 'direct'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO member_id FROM profiles WHERE username = lower(trim(member_username));
  IF member_id IS NULL THEN
    RAISE EXCEPTION 'user_not_found: %', member_username;
  END IF;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (conv_id, member_id, 'member')
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION add_group_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_group_member(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION start_direct_conversation(other_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  other uuid;
  conv uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO other FROM profiles WHERE username = lower(trim(other_username));
  IF other IS NULL THEN
    RAISE EXCEPTION 'user_not_found: %', other_username;
  END IF;
  IF other = me THEN
    RAISE EXCEPTION 'cannot_message_self';
  END IF;

  SELECT c.id INTO conv
  FROM conversations c
  WHERE c.kind = 'direct'
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = me)
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = other)
    AND (SELECT count(*) FROM conversation_members m WHERE m.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv IS NULL THEN
    INSERT INTO conversations (kind, created_by) VALUES ('direct', me) RETURNING id INTO conv;
    INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv, me), (conv, other);
  END IF;

  RETURN conv;
END;
$$;

DROP FUNCTION IF EXISTS list_my_conversations();

CREATE FUNCTION list_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  kind text,
  title text,
  my_role text,
  member_count int,
  partner_id uuid,
  partner_username text,
  partner_display_name text,
  last_body text,
  last_at timestamptz
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
    lm.created_at
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

REVOKE EXECUTE ON FUNCTION list_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION list_my_conversations() TO authenticated;
