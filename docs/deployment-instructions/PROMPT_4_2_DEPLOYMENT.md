# Prompt 4.2: Community Hub - Deployment Instructions

**Feature**: Tag-based community discovery and connections
**Status**: ✅ Code complete, ready for database migration
**Date**: October 26, 2025

---

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Admin permissions for SQL execution
- [ ] Staging environment access for testing
- [ ] Multiple test user accounts (for connection testing)

---

## Deployment Steps

### Step 1: Database Migration

**Location**: `docs/sql-fixes/400_community_hub.sql`

1. Open Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of `400_community_hub.sql`
6. Paste into SQL editor
7. Click "Run" to execute

**What this creates**:
- 7 tables for community features:
  - `user_tags` - User profile tags
  - `community_connections` - Friend/mentor relationships
  - `community_messages` - Direct messaging
  - `community_success_stories` - Public success stories
  - `community_groups` - Discussion groups
  - `community_group_members` - Group membership
  - `community_group_posts` - Group posts
- 12 indexes for performance
- 2 RPC functions:
  - `find_similar_users()` - Tag-based similarity matching
  - `get_user_connection_stats()` - User statistics aggregation

**Expected output**:
```
Success: No rows returned
```

This is normal - the script creates tables and functions but returns no data.

---

### Step 2: Verify Database Setup

**Check tables exist**:
```sql
SELECT * FROM user_tags LIMIT 5;
SELECT * FROM community_connections LIMIT 5;
SELECT * FROM community_messages LIMIT 5;
SELECT * FROM community_success_stories LIMIT 5;
SELECT * FROM community_groups LIMIT 5;
SELECT * FROM community_group_members LIMIT 5;
SELECT * FROM community_group_posts LIMIT 5;
```

Expected: Empty tables (no data yet)

**Test find_similar_users() function**:
```sql
SELECT * FROM find_similar_users('your-user-uuid-here', 20);
```

Expected: Empty result (no tags added yet):
```
0 rows returned
```

**Test get_user_connection_stats() function**:
```sql
SELECT * FROM get_user_connection_stats('your-user-uuid-here');
```

Expected: Stats object with all zeroes:
```
total_connections | pending_requests | mentors | mentees | buddies | unread_messages
0                 | 0                | 0       | 0       | 0       | 0
```

---

### Step 3: Deploy Frontend to Staging

**Branch**: staging (or create feature branch)
**Changes committed**:
- `src/components/transition/CommunityHub.tsx` (new component - 565 lines)
- `src/components/transition/TransitionDashboard.tsx` (integration)
- `docs/implementation-logs/PROMPT_4_2_COMMUNITY_HUB.md` (comprehensive docs)
- `docs/deployment-instructions/PROMPT_4_2_DEPLOYMENT.md` (this file)
- `docs/sql-fixes/400_community_hub.sql` (database schema)

**Commands**:
```bash
# Ensure you're on staging branch
git checkout staging

# Verify changes
git status

# If changes not committed, commit them:
git add src/components/transition/CommunityHub.tsx
git add src/components/transition/TransitionDashboard.tsx
git add docs/implementation-logs/PROMPT_4_2_COMMUNITY_HUB.md
git add docs/deployment-instructions/PROMPT_4_2_DEPLOYMENT.md
git add docs/sql-fixes/400_community_hub.sql
git commit -m "feat: add Community Hub with tag-based discovery to TransitionDashboard

- Created CommunityHub component with 4-tab interface
- Implemented tag-based user discovery system
- Added 5 tag categories (vehicle, timeframe, career, destination, lifestyle)
- Built connection management (friend/mentor/buddy)
- Created direct messaging system
- Added success stories feed
- Implemented community groups
- Created 7 database tables with proper relationships
- Added 2 RPC functions for similarity matching and stats
- Positioned after RealityCheck for logical flow
- Updated implementation log and deployment instructions

Completes Prompt 4.2 implementation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to staging
git push origin staging
```

**Netlify will automatically**:
- Detect the push to staging branch
- Build the frontend (`npm run build`)
- Deploy to staging environment
- Run post-build checks

---

### Step 4: Test in Staging Environment

**Staging URL**: https://wheels-wins-staging.netlify.app

#### Test Checklist

**Basic Functionality**:
- [ ] Navigate to Transition Dashboard page
- [ ] Verify CommunityHub section appears (after RealityCheck)
- [ ] Component loads without errors
- [ ] 4 tabs visible: Discover, Connections, Stories, Groups

---

### Tab 1: Discover (Tag Management & Similar Users)

**Empty State**:
- [ ] Verify "No tags yet" message displays
- [ ] "Add your first tag" instructions visible
- [ ] Similar users section empty

**Add First Tag**:
- [ ] Click "+ Add Tag" button
- [ ] Dialog opens with tag form
- [ ] Select category: "Vehicle Type" 🚐
- [ ] Dropdown shows 8 vehicle options:
  - [ ] Unimog 🚐
  - [ ] Sprinter Van 🚐
  - [ ] Class A Motorhome 🚐
  - [ ] Class B Van 🚐
  - [ ] Class C RV 🚐
  - [ ] Fifth Wheel 🚐
  - [ ] Travel Trailer 🚐
  - [ ] Truck Camper 🚐
- [ ] Select "Unimog 🚐"
- [ ] Click "Add Tag" button
- [ ] Toast notification: "Tag Added"
- [ ] Dialog closes
- [ ] Tag badge appears with:
  - [ ] "Vehicle Type" label
  - [ ] "Unimog 🚐" value
  - [ ] Remove button (X icon)

**Add Multiple Tags** (5 categories):
- [ ] Add tag - Departure Timeframe: "Within 3 months" ⏰
- [ ] Add tag - Previous Career: "Tech/IT" 💼
- [ ] Add tag - Destination Preference: "National Parks" 🏕️
- [ ] Add tag - Lifestyle: "Couple" 👥
- [ ] Verify all 5 tags display as separate badges
- [ ] Each badge shows category + value + remove button

**Tag Categories Display**:
Test all 5 category icons and colors:
- [ ] 🚐 Vehicle Type (blue text)
- [ ] ⏰ Departure Timeframe (green text)
- [ ] 💼 Previous Career (purple text)
- [ ] 🏕️ Destination Preference (orange text)
- [ ] 👥 Lifestyle (pink text)

**Remove Tag**:
- [ ] Click X button on any tag
- [ ] Tag badge disappears
- [ ] No error in console
- [ ] Toast notification confirms removal

**Similar Users Discovery** (requires second test user):

Setup Second User:
- [ ] Open incognito window or second browser
- [ ] Log in as different user
- [ ] Add same tags: Unimog, Within 3 months, Tech/IT
- [ ] Return to first user account

Back to First User:
- [ ] Reload CommunityHub
- [ ] Similar users section now shows second user
- [ ] User card displays:
  - [ ] Profile image (or default avatar)
  - [ ] Full name or nickname
  - [ ] Email (if available)
  - [ ] "3 common tags" badge with blue background
  - [ ] List of matching tags with category icons
  - [ ] "Connect" button
- [ ] Hover over user card → subtle shadow effect

**Connect with Similar User**:
- [ ] Click "Connect" button on user card
- [ ] Dialog opens with connection type selector
- [ ] Three options available:
  - [ ] Friend 👥 - "Connect as travel buddies"
  - [ ] Mentor 🎯 - "I can help with their transition"
  - [ ] Mentee 📚 - "I'd like guidance from them"
- [ ] Select "Friend 👥"
- [ ] Optional message field visible
- [ ] Enter message: "Hey! We have similar setups, let's connect!"
- [ ] Click "Send Request" button
- [ ] Toast notification: "Connection request sent"
- [ ] Dialog closes
- [ ] User card now shows "Request Sent" badge (gray)

---

### Tab 2: Connections (Relationship Management)

**Stats Overview**:
- [ ] Four stat cards display:
  - [ ] Total Connections (count with blue badge)
  - [ ] Pending Requests (count with yellow badge)
  - [ ] Mentors (count with green badge)
  - [ ] Messages (count with purple badge)
- [ ] All stats initially 0

**Accept Connection Request** (from second user's perspective):

Switch to Second User:
- [ ] Navigate to CommunityHub → Connections tab
- [ ] "Pending Requests" section shows 1 request
- [ ] Request card displays:
  - [ ] First user's name
  - [ ] "Friend request" label
  - [ ] Message: "Hey! We have similar setups, let's connect!"
  - [ ] Two buttons: "Accept" (green) and "Reject" (red)
- [ ] Click "Accept" button
- [ ] Toast: "Connection accepted"
- [ ] Request card disappears from pending
- [ ] "Total Connections" stat increments to 1
- [ ] "My Connections" section shows first user with "Friend" badge

Back to First User:
- [ ] Reload Connections tab
- [ ] "Total Connections" stat shows 1
- [ ] "My Connections" section shows second user
- [ ] Connection card displays:
  - [ ] User name
  - [ ] "Friend" badge (blue)
  - [ ] "Message" button
  - [ ] "View Profile" button

**Connection Types**:
Test all three connection types display correctly:
- [ ] Friend badge: Blue background, 👥 icon
- [ ] Mentor badge: Green background, 🎯 icon
- [ ] Mentee badge: Purple background, 📚 icon

**Reject Connection**:
- [ ] Create third connection request
- [ ] As recipient, click "Reject" button
- [ ] Toast: "Connection request rejected"
- [ ] Request disappears
- [ ] Connection not added

---

### Tab 3: Stories (Success Stories Feed)

**Empty State**:
- [ ] "No stories yet" message displays
- [ ] "Share Your Success Story" button visible

**Share Success Story**:
- [ ] Click "Share Your Success Story" button
- [ ] Dialog opens with story form
- [ ] Fields visible:
  - [ ] Title (required) - "My Journey to Full-Time RV Life"
  - [ ] Story content (textarea, required) - "After 18 months of planning..."
  - [ ] Transition duration (months) - 18
  - [ ] Departure date (optional) - Select date
  - [ ] Public toggle (default: checked)
- [ ] Fill in all fields
- [ ] Click "Share Story" button
- [ ] Toast: "Success story shared"
- [ ] Dialog closes
- [ ] Story card appears in feed

**Story Card Display**:
- [ ] Title displayed prominently (text-xl)
- [ ] Story content truncated with "Read more..." if >200 chars
- [ ] Metadata section shows:
  - [ ] Author name
  - [ ] Post date (relative: "2 minutes ago")
  - [ ] Transition duration badge (blue): "18 months"
  - [ ] Departure date badge (green) if provided
- [ ] Like button with heart icon
- [ ] Like count (initially 0)
- [ ] Public/Private indicator

**Like Story**:
- [ ] Click like button (heart icon)
- [ ] Heart icon fills with color
- [ ] Like count increments to 1
- [ ] Toast: "Story liked"
- [ ] Click again to unlike
- [ ] Heart icon returns to outline
- [ ] Like count decrements to 0

**Read More**:
- [ ] For long stories (>200 chars)
- [ ] Click "Read more..." link
- [ ] Full story expands
- [ ] "Read less" link appears
- [ ] Click "Read less"
- [ ] Story collapses back to truncated view

**Multiple Stories**:
- [ ] Create 3-5 stories with different users
- [ ] Stories display in reverse chronological order (newest first)
- [ ] Each story has unique content
- [ ] Like counts independent per story

**Privacy Toggle**:
- [ ] Create private story (toggle off)
- [ ] Only author can see private story
- [ ] Other users don't see it in feed
- [ ] Author sees "Private" badge on their story

---

### Tab 4: Groups (Discussion Forums)

**Empty State**:
- [ ] "No groups yet" message displays
- [ ] "Create Group" button visible

**Create Group**:
- [ ] Click "Create Group" button
- [ ] Dialog opens with group form
- [ ] Fields visible:
  - [ ] Name (required) - "Unimog Owners"
  - [ ] Description - "Share tips and experiences"
  - [ ] Topic (required) - "Vehicle Specific"
  - [ ] Public toggle (default: checked)
- [ ] Fill in fields
- [ ] Click "Create Group" button
- [ ] Toast: "Group created"
- [ ] Dialog closes
- [ ] Group card appears

**Group Card Display**:
- [ ] Group name displayed prominently (text-lg)
- [ ] Description text (gray-600)
- [ ] Topic badge (blue)
- [ ] Member count badge (purple): "1 member"
- [ ] Public/Private indicator
- [ ] "Join" button for non-members
- [ ] "View" button if already member

**Join Group**:
- [ ] Switch to second user
- [ ] Click "Join" button on group
- [ ] Toast: "Joined group"
- [ ] Button changes to "View"
- [ ] Member count increments to 2
- [ ] Switch back to first user
- [ ] Verify member count updated to 2

**View Group**:
- [ ] Click "View" button
- [ ] Group detail view loads
- [ ] Shows group info (name, description, members)
- [ ] Post feed visible (empty initially)
- [ ] "Create Post" button available

**Create Group Post**:
- [ ] Click "Create Post" button
- [ ] Dialog opens with post form
- [ ] Content field (textarea, required)
- [ ] Enter: "What's your favorite Unimog modification?"
- [ ] Click "Post" button
- [ ] Toast: "Post created"
- [ ] Post appears in group feed
- [ ] Post card shows:
  - [ ] Author name and avatar
  - [ ] Post content
  - [ ] Post date (relative)
  - [ ] Reply count (0 initially)
  - [ ] "Reply" button

**Reply to Post**:
- [ ] Click "Reply" button
- [ ] Reply form appears below post
- [ ] Enter reply: "I love the custom storage solutions!"
- [ ] Click "Submit" button
- [ ] Reply appears under post
- [ ] Reply count increments to 1

**Multiple Groups**:
- [ ] Create 3 groups with different topics
- [ ] Each group has independent member count
- [ ] Each group has independent post feed
- [ ] User can join/leave each group independently

---

### Step 5: Send Direct Message

**From Connections Tab**:
- [ ] Navigate to Connections tab
- [ ] Click "Message" button on connection card
- [ ] Message dialog opens with fields:
  - [ ] Recipient name displayed (read-only)
  - [ ] Subject field (optional)
  - [ ] Message content (textarea, required)
- [ ] Enter subject: "Unimog Questions"
- [ ] Enter message: "Hi! I saw you also have a Unimog. What model year?"
- [ ] Click "Send Message" button
- [ ] Toast: "Message sent"
- [ ] Dialog closes

**Receive Message** (second user):
- [ ] Switch to second user
- [ ] "Messages" stat increments to 1
- [ ] Red notification badge appears
- [ ] Click on connection with message
- [ ] Click "Message" button or notification
- [ ] Inbox view shows message:
  - [ ] Sender name
  - [ ] Subject: "Unimog Questions"
  - [ ] Message preview
  - [ ] Unread indicator (bold text or badge)
  - [ ] Timestamp

**Reply to Message**:
- [ ] Click on message to open
- [ ] Full message content displays
- [ ] Reply field available
- [ ] Enter reply: "Mine's a 2015 U1700! What about yours?"
- [ ] Click "Reply" button
- [ ] Toast: "Reply sent"
- [ ] Message marked as read
- [ ] Unread count decrements

**Message Thread**:
- [ ] Switch back to first user
- [ ] Message stat shows new message (1)
- [ ] Click to view message
- [ ] Thread displays with both messages:
  - [ ] Original message
  - [ ] Reply below
  - [ ] Chronological order
  - [ ] Author indicators
  - [ ] Timestamps

---

### Step 6: Database Verification (Post-Testing)

After completing UI tests, verify database state:

**User Tags**:
```sql
SELECT
  tag_category,
  tag_value,
  created_at
FROM user_tags
WHERE user_id = 'your-user-uuid'
ORDER BY created_at ASC;
```

Expected: 5 tags for first user, 3 for second user

**Similar Users Query**:
```sql
SELECT * FROM find_similar_users('first-user-uuid', 20);
```

Expected: Returns second user with matching_tags = 3

**Connection Stats**:
```sql
SELECT * FROM get_user_connection_stats('first-user-uuid');
```

Expected:
```
total_connections: 1
pending_requests: 0
mentors: 0
mentees: 0
buddies: 1
unread_messages: 0 (or 1 if unread message exists)
```

**Connections**:
```sql
SELECT
  user_id,
  connected_user_id,
  connection_type,
  status
FROM community_connections
WHERE user_id = 'first-user-uuid' OR connected_user_id = 'first-user-uuid';
```

Expected: 1 accepted friend connection

**Messages**:
```sql
SELECT
  sender_id,
  recipient_id,
  subject,
  message,
  is_read
FROM community_messages
WHERE sender_id = 'first-user-uuid' OR recipient_id = 'first-user-uuid'
ORDER BY created_at DESC;
```

Expected: Messages sent in testing

**Success Stories**:
```sql
SELECT
  user_id,
  title,
  story,
  likes_count,
  is_public
FROM community_success_stories
WHERE is_public = TRUE
ORDER BY created_at DESC;
```

Expected: Public stories created in testing

**Groups**:
```sql
SELECT
  name,
  topic,
  member_count,
  is_public
FROM community_groups
ORDER BY created_at DESC;
```

Expected: Groups created in testing

**Group Membership**:
```sql
SELECT
  g.name,
  gm.user_id,
  gm.role
FROM community_group_members gm
JOIN community_groups g ON g.id = gm.group_id
WHERE gm.user_id = 'first-user-uuid';
```

Expected: Groups joined by first user

---

### Step 7: Tag Matching Algorithm Verification

**Test tag overlap calculation**:

Setup:
- [ ] User A has tags: [Unimog, Within 3 months, Tech/IT, National Parks, Couple]
- [ ] User B has tags: [Unimog, Within 3 months, Tech/IT] (3 matches)
- [ ] User C has tags: [Unimog, 6-12 months, Finance, Beaches, Solo] (1 match)
- [ ] User D has tags: [Sprinter Van, 1-2 years, Healthcare] (0 matches)

Expected similar users order for User A:
1. User B (3 matching tags)
2. User C (1 matching tag)
3. User D (not returned - 0 matches filtered out)

**Verify with SQL**:
```sql
SELECT
  user_id,
  matching_tags
FROM find_similar_users('user-a-uuid', 20)
ORDER BY matching_tags DESC;
```

Expected:
```
user-b-uuid | 3
user-c-uuid | 1
```

---

### Step 8: Integration Testing

**With Other Components**:

1. **With TransitionTimeline**:
   - [ ] Add mentor connection
   - [ ] Create milestone: "Connect with 3 mentors"
   - [ ] Mark complete when 3 mentor connections established
   - [ ] Verify both systems track independently

2. **With FinancialBuckets**:
   - [ ] Share success story mentioning budget strategies
   - [ ] Navigate to FinancialBuckets
   - [ ] Implement strategies mentioned in story
   - [ ] Return to community
   - [ ] Like and comment on similar stories

3. **Cross-Component User Flow**:
   - [ ] User discovers similar RVers via tags
   - [ ] Connects and messages about vehicle setup
   - [ ] Learns about useful modifications
   - [ ] Navigate to VehicleModifications
   - [ ] Add modifications suggested by community
   - [ ] Return to community
   - [ ] Share success story about helpful connections

---

### Step 9: Mobile Responsive Testing

**Mobile devices or narrow browser window** (<768px):
- [ ] 4 tabs stack nicely
- [ ] Tab labels remain readable
- [ ] Tag badges wrap to multiple lines if needed
- [ ] User cards stack vertically (1 column)
- [ ] Connection cards full width
- [ ] Story cards full width, readable
- [ ] Group cards full width
- [ ] Dialogs scale appropriately
- [ ] Forms remain usable
- [ ] No horizontal scroll

**Tablet** (768px - 1024px):
- [ ] User cards may show 2 columns (grid-cols-2)
- [ ] Layout adapts smoothly
- [ ] All content readable

**Desktop** (>1024px):
- [ ] User cards show 3 columns (grid-cols-3)
- [ ] Full-width layout in dashboard (lg:col-span-3)
- [ ] Optimal spacing and readability

---

### Step 10: Performance Validation

**Load time checks**:
- [ ] Initial component render <500ms
- [ ] Tag addition <300ms
- [ ] Similar users query <1s
- [ ] Connection request <400ms
- [ ] Message send <400ms
- [ ] Story creation <500ms
- [ ] Group creation <400ms

**RPC Function Performance**:
- [ ] find_similar_users() with 100 tags <2s
- [ ] get_user_connection_stats() <500ms

**Resource checks** (Chrome DevTools):
- [ ] Network tab - all Supabase queries succeed
- [ ] Console - no errors or warnings
- [ ] Performance tab - no jank during interactions
- [ ] Memory - no leaks after adding many tags

---

## Rollback Plan (If Issues Found)

### Frontend Rollback
```bash
# Revert last commit
git revert HEAD
git push origin staging

# Or revert specific commit
git log --oneline  # Find commit hash
git revert <commit-hash>
git push origin staging
```

### Database Rollback
```sql
-- Drop tables (will lose all data!)
DROP TABLE IF EXISTS community_group_posts CASCADE;
DROP TABLE IF EXISTS community_group_members CASCADE;
DROP TABLE IF EXISTS community_groups CASCADE;
DROP TABLE IF EXISTS community_success_stories CASCADE;
DROP TABLE IF EXISTS community_messages CASCADE;
DROP TABLE IF EXISTS community_connections CASCADE;
DROP TABLE IF EXISTS user_tags CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS find_similar_users(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_connection_stats(UUID);

-- Or disable feature via RLS policy (keeps data)
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON user_tags;
-- Repeat for all 7 tables
```

**Note**: Only use rollback if critical issues prevent basic app functionality. Minor bugs should be fixed forward.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Tag matching algorithm validated
- [ ] Multiple users tested connections
- [ ] Code reviewed by team
- [ ] Privacy and security verified

### Steps
1. **Merge staging to main**:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   ```

2. **Run same SQL migration on production database**:
   - Open production Supabase project
   - Execute `400_community_hub.sql`
   - Verify with same queries as staging

3. **Monitor production deployment**:
   - Netlify auto-deploys from main branch
   - Watch build logs for errors
   - Check production URL after deployment
   - Run smoke tests on production

4. **Post-deployment monitoring** (first 24 hours):
   - Check error tracking (Sentry, if configured)
   - Monitor database query performance (especially RPC functions)
   - Watch for user reports
   - Review analytics for feature usage
   - Monitor similar users query times

---

## Known Limitations

1. **Real-time Updates**: Connection status changes don't update in real-time (requires page refresh)

2. **Message Pagination**: All messages loaded at once (may slow with many messages)

3. **Tag Limit**: No enforced limit on tags per user (could affect similar users query performance)

4. **Group Posts Pagination**: All posts loaded at once per group

5. **Search**: No search functionality for users, groups, or stories

6. **Notifications**: No push notifications for new messages or connection requests

---

## Future Enhancements (Not in Scope)

- Real-time WebSocket updates for connections and messages
- Push notifications for new messages/requests
- Advanced search (users, groups, stories)
- Tag suggestions based on popular tags
- Group moderation tools
- Private messaging with attachments
- Message read receipts
- User blocking functionality
- Report inappropriate content
- Story comments and replies
- Group event planning
- User badges and achievements
- Connection recommendations based on location
- Integration with external social platforms

---

## Security Considerations

**RLS Policies Applied**:
- Users can only see/modify their own tags
- Connection requests visible to both parties
- Messages visible to sender and recipient only
- Private stories only visible to author
- Group posts visible to group members
- Public groups visible to all, private groups to members only

**Verify RLS Working**:
```sql
-- Try to access another user's tags (should return 0 rows)
SELECT * FROM user_tags WHERE user_id = 'other-user-uuid';

-- Try to read another user's private messages (should return 0 rows)
SELECT * FROM community_messages
WHERE recipient_id = 'other-user-uuid'
  AND sender_id != 'your-user-uuid';
```

Expected: 0 rows (RLS prevents unauthorized access)

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_4_2_COMMUNITY_HUB.md`
**SQL Schema**: `docs/sql-fixes/400_community_hub.sql`
**Component**: `src/components/transition/CommunityHub.tsx`

---

**Deployment Prepared**: October 26, 2025
**Status**: Ready for staging deployment
