DROP POLICY IF EXISTS "community_connections_select" ON community_connections;
DROP POLICY IF EXISTS "community_connections_insert" ON community_connections;
DROP POLICY IF EXISTS "community_connections_update" ON community_connections;
DROP POLICY IF EXISTS "community_connections_delete" ON community_connections;

CREATE POLICY "community_connections_select" ON community_connections
FOR SELECT TO authenticated, admin
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "community_connections_insert" ON community_connections
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_connections_update" ON community_connections
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id OR auth.uid() = connected_user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_connections_delete" ON community_connections
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_group_members_select" ON community_group_members;
DROP POLICY IF EXISTS "community_group_members_insert" ON community_group_members;
DROP POLICY IF EXISTS "community_group_members_update" ON community_group_members;
DROP POLICY IF EXISTS "community_group_members_delete" ON community_group_members;

CREATE POLICY "community_group_members_select" ON community_group_members
FOR SELECT TO authenticated, admin
USING (auth.uid() = user_id OR group_id IN (
  SELECT group_id FROM community_group_members WHERE user_id = auth.uid()
));

CREATE POLICY "community_group_members_insert" ON community_group_members
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_group_members_update" ON community_group_members
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_group_members_delete" ON community_group_members
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_group_posts_select" ON community_group_posts;
DROP POLICY IF EXISTS "community_group_posts_insert" ON community_group_posts;
DROP POLICY IF EXISTS "community_group_posts_update" ON community_group_posts;
DROP POLICY IF EXISTS "community_group_posts_delete" ON community_group_posts;

CREATE POLICY "community_group_posts_select" ON community_group_posts
FOR SELECT TO authenticated, admin
USING (
  auth.uid() = user_id OR
  group_id IN (
    SELECT group_id FROM community_group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "community_group_posts_insert" ON community_group_posts
FOR INSERT TO authenticated, admin
WITH CHECK (
  auth.uid() = user_id AND
  group_id IN (
    SELECT group_id FROM community_group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "community_group_posts_update" ON community_group_posts
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_group_posts_delete" ON community_group_posts
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_groups_select" ON community_groups;
DROP POLICY IF EXISTS "community_groups_insert" ON community_groups;
DROP POLICY IF EXISTS "community_groups_update" ON community_groups;
DROP POLICY IF EXISTS "community_groups_delete" ON community_groups;

CREATE POLICY "community_groups_select" ON community_groups
FOR SELECT TO authenticated, admin
USING (
  created_by = auth.uid() OR
  id IN (
    SELECT group_id FROM community_group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "community_groups_insert" ON community_groups
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "community_groups_update" ON community_groups
FOR UPDATE TO authenticated, admin
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "community_groups_delete" ON community_groups
FOR DELETE TO authenticated, admin
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_messages_select" ON community_messages;
DROP POLICY IF EXISTS "community_messages_insert" ON community_messages;
DROP POLICY IF EXISTS "community_messages_update" ON community_messages;
DROP POLICY IF EXISTS "community_messages_delete" ON community_messages;

CREATE POLICY "community_messages_select" ON community_messages
FOR SELECT TO authenticated, admin
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "community_messages_insert" ON community_messages
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "community_messages_update" ON community_messages
FOR UPDATE TO authenticated, admin
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "community_messages_delete" ON community_messages
FOR DELETE TO authenticated, admin
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "community_success_stories_select" ON community_success_stories;
DROP POLICY IF EXISTS "community_success_stories_insert" ON community_success_stories;
DROP POLICY IF EXISTS "community_success_stories_update" ON community_success_stories;
DROP POLICY IF EXISTS "community_success_stories_delete" ON community_success_stories;

CREATE POLICY "community_success_stories_select" ON community_success_stories
FOR SELECT TO authenticated, admin
USING (auth.uid() = user_id);

CREATE POLICY "community_success_stories_insert" ON community_success_stories
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_success_stories_update" ON community_success_stories
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_success_stories_delete" ON community_success_stories
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "expectation_discussions_select" ON expectation_discussions;
DROP POLICY IF EXISTS "expectation_discussions_insert" ON expectation_discussions;
DROP POLICY IF EXISTS "expectation_discussions_update" ON expectation_discussions;
DROP POLICY IF EXISTS "expectation_discussions_delete" ON expectation_discussions;

CREATE POLICY "expectation_discussions_select" ON expectation_discussions
FOR SELECT TO authenticated, admin
USING (auth.uid() = user_id);

CREATE POLICY "expectation_discussions_insert" ON expectation_discussions
FOR INSERT TO authenticated, admin
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expectation_discussions_update" ON expectation_discussions
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expectation_discussions_delete" ON expectation_discussions
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestone_badges_select" ON milestone_badges;
DROP POLICY IF EXISTS "milestone_badges_insert" ON milestone_badges;
DROP POLICY IF EXISTS "milestone_badges_update" ON milestone_badges;
DROP POLICY IF EXISTS "milestone_badges_delete" ON milestone_badges;

CREATE POLICY "milestone_badges_select" ON milestone_badges
FOR SELECT TO authenticated, admin, anon
USING (true);

CREATE POLICY "milestone_badges_insert" ON milestone_badges
FOR INSERT TO admin
WITH CHECK (true);

CREATE POLICY "milestone_badges_update" ON milestone_badges
FOR UPDATE TO admin
USING (true)
WITH CHECK (true);

CREATE POLICY "milestone_badges_delete" ON milestone_badges
FOR DELETE TO admin
USING (true);

DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
DROP POLICY IF EXISTS "user_badges_insert" ON user_badges;
DROP POLICY IF EXISTS "user_badges_update" ON user_badges;
DROP POLICY IF EXISTS "user_badges_delete" ON user_badges;

CREATE POLICY "user_badges_select" ON user_badges
FOR SELECT TO authenticated, admin
USING (auth.uid() = user_id);

CREATE POLICY "user_badges_insert" ON user_badges
FOR INSERT TO admin
WITH CHECK (true);

CREATE POLICY "user_badges_update" ON user_badges
FOR UPDATE TO authenticated, admin
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_badges_delete" ON user_badges
FOR DELETE TO authenticated, admin
USING (auth.uid() = user_id);

GRANT ALL ON community_connections TO service_role;
GRANT ALL ON community_group_members TO service_role;
GRANT ALL ON community_group_posts TO service_role;
GRANT ALL ON community_groups TO service_role;
GRANT ALL ON community_messages TO service_role;
GRANT ALL ON community_success_stories TO service_role;
GRANT ALL ON expectation_discussions TO service_role;
GRANT ALL ON milestone_badges TO service_role;
GRANT ALL ON user_badges TO service_role;
