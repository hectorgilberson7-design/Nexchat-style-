/*
# Restrict table access for the messaging tables

1. Problem
- The project grants every table privilege (read, insert, update, delete) to the anonymous and signed-in roles by default. Row level security still limits rows, but column-level and verb-level limits were not enforced.

2. Changes
- Remove all default privileges from `anon` and `authenticated` on `profiles`, `conversations`, `conversation_members` and `messages`.
- Grant back only what the app uses:
  - `profiles`: read all profiles; update only the display name.
  - `conversations` and `conversation_members`: read only.
  - `messages`: read; insert only the conversation and the text.

3. Security
- No anonymous access to any of these tables.
- Users cannot change their username, their identity, or the author of a message.
- No deletion of profiles, conversations, members or messages from the client.

4. Important notes
- Row level security policies are unchanged; they still decide which rows each user can see or write.
*/

REVOKE ALL ON profiles, conversations, conversation_members, messages FROM anon, authenticated;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (display_name) ON profiles TO authenticated;
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversation_members TO authenticated;
GRANT SELECT ON messages TO authenticated;
GRANT INSERT (conversation_id, body) ON messages TO authenticated;
