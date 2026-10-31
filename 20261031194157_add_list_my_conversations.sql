/*
# Add list_my_conversations for the discussion list

1. New Functions
- `list_my_conversations`: returns the signed-in user's private conversations, each with the other person's username and display name and the latest message preview. Sorted by most recent activity.

2. Security
- Only returns conversations where the signed-in user is a member; it never returns other conversations.
- Not callable by anonymous visitors.

3. Important notes
- The function runs with elevated rights to join the data in one step, so the membership filter on the signed-in user is the only thing limiting results. It must stay in place.
*/

CREATE OR REPLACE FUNCTION list_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
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
    p.id,
    p.username,
    p.display_name,
    lm.body,
    lm.created_at
  FROM conversation_members me
  JOIN conversations c ON c.id = me.conversation_id
  JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id <> me.user_id
  JOIN profiles p ON p.id = other.user_id
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
