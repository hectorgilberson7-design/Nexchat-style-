/*
# Create private messaging core (accounts, profiles, direct conversations, messages)

1. New Tables
- `profiles`: one row per account, with a unique lowercase `username`, a `display_name` and creation date. Filled automatically when an account is created.
- `conversations`: a private discussion between two people.
- `conversation_members`: who belongs to which conversation.
- `messages`: text messages sent inside a conversation.

2. Functions
- `handle_new_user` (trigger): creates the profile from the username and display name given at sign-up.
- `is_conversation_member`: tells whether the signed-in user belongs to a conversation. Used by security rules to avoid recursive checks.
- `start_direct_conversation`: finds a user by username and opens a private conversation with them, or returns the existing one.

3. Security
- Row level security enabled on every table.
- Profiles are readable by signed-in users (username and display name only); each user can only edit their own display name.
- Conversations, members and messages are visible only to members of that conversation.
- Messages can only be sent by their author and only inside a conversation the author belongs to.
- Conversations are created only through `start_direct_conversation`, never directly.
- Helper functions are not callable by anonymous visitors.

4. Important notes
- No message editing or deletion yet; those will be added with their own rules.
- Realtime delivery is enabled for `messages`; the security rules above still apply to what each user receives.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    lower(NEW.raw_user_meta_data ->> 'username'),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), lower(NEW.raw_user_meta_data ->> 'username'))
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION is_conversation_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_conversation_member(uuid) TO authenticated;

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
    RAISE EXCEPTION 'user_not_found';
  END IF;
  IF other = me THEN
    RAISE EXCEPTION 'cannot_message_self';
  END IF;

  SELECT c.id INTO conv
  FROM conversations c
  WHERE EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = me)
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = other)
    AND (SELECT count(*) FROM conversation_members m WHERE m.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv;
    INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv, me), (conv, other);
  END IF;

  RETURN conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION start_direct_conversation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION start_direct_conversation(text) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (display_name) ON profiles TO authenticated;
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversation_members TO authenticated;
GRANT SELECT ON messages TO authenticated;
GRANT INSERT (conversation_id, body) ON messages TO authenticated;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "select_member_conversations" ON conversations;
CREATE POLICY "select_member_conversations" ON conversations FOR SELECT
  TO authenticated USING (is_conversation_member(id));

DROP POLICY IF EXISTS "select_member_rows" ON conversation_members;
CREATE POLICY "select_member_rows" ON conversation_members FOR SELECT
  TO authenticated USING (is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "select_conversation_messages" ON messages;
CREATE POLICY "select_conversation_messages" ON messages FOR SELECT
  TO authenticated USING (is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
