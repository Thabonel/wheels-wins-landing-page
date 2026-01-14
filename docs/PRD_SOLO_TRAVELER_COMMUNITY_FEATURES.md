# Product Requirements Document: Solo Traveler Community Features

**Product**: Wheels & Wins Solo Traveler Community Platform
**Version**: 1.0
**Date**: January 8, 2026
**Status**: Draft for Review
**Owner**: Product Team

---

## Executive Summary

### Vision
Create an inclusive, psychology-informed community platform that addresses the distinct needs of solo RV travelers through empowerment-based safety resources for women and activity-based connection opportunities for men, while maintaining privacy, choice, and inclusivity for all users.

### Problem Statement
Solo RV travelers face unique challenges:
- **Women (70-84%)** cite safety as their top concern, but existing resources often use fear-based messaging that increases anxiety rather than building confidence
- **Men** face an epidemic of loneliness (friendships down 51% since 1990) and lack structured opportunities for connection that align with how men naturally bond
- **Trans/Non-binary travelers** are frequently excluded or made uncomfortable by binary gender systems

### Solution Approach
**NOT** gender-segregated sections (legal/ethical problems, excludes trans users)
**YES** to opt-in personalized content + user-created community groups + activity-based matching

### Key Principles
1. **Opt-in, not forced** - All personalization is voluntary
2. **Empowerment, not fear** - Build confidence, don't increase anxiety
3. **Activity-first** - Connection through shared interests and doing
4. **Inclusive by default** - Trans/non-binary users supported from day one
5. **Privacy-first** - Gender hidden by default, user controls sharing
6. **Community-led** - Users create groups, platform enables

---

## Research Foundation

### 1. Women's Solo Travel Psychology

#### Statistical Reality
- **88%** of women felt safety threatened while solo traveling
- **64%** experienced unwanted attention or harassment
- **41%** changed accommodations mid-trip due to safety concerns
- **However**: After 10+ trips, safety concern drops from **78% to 59%** (24% reduction)
- **85%** of solo travelers are women, average age 47

#### What Works (Evidence-Based)
| Approach | Impact | Source |
|----------|--------|--------|
| **Empowerment messaging** | Builds confidence, reduces anxiety (p < .001) | Journal of Travel Research, 2023 |
| **Practical skills training** | Verbal de-escalation, situational awareness | Self-defense research |
| **Statistical context** | Solo travel safer than urban living | Crime statistics |
| **Community support** | Trusted networks, buddy systems | Girls Love Travel case study |
| **Fear-based warnings** | Increases reactance, reinforces victimhood ❌ | Psychology of fear appeals |

#### Platform Examples
- **Girls Love Travel**: Women-only network, 7 continents, groups of 6-10, 93% satisfaction
- **Worldpackers**: Safety features (verified hosts, emergency support), 93% user satisfaction
- **Solo Female Travelers Club**: Empowerment-focused, practical checklists, skill-building

#### Design Implications
- Use empowerment language: "Build confidence" not "Stay safe"
- Provide statistical reality: "Campgrounds have exceptionally low crime rates"
- Focus on skills: Verbal de-escalation, mechanical basics, emergency prep
- Offer community: Women's network for connection, not just safety
- Avoid: Fear-based warnings, victim mentality, "stranger danger" messaging

---

### 2. Men's Friendship Psychology

#### The Loneliness Epidemic
- Men with **NO** close friends: 3% (1990) → **15%** (2021) - **5x increase**
- Men with **6+ close friends**: 55% (1990) → **27%** (2021) - **51% drop**
- Men are **4x more likely** to die by suicide than women
- Friendships often fade when shared activities end (work, sports, clubs)

#### Activity-Based Bonding ("Shoulder-to-Shoulder")
**Critical Pattern**: Male bonding happens **side-by-side**, not face-to-face

| Face-to-Face (Less Effective) | Shoulder-to-Shoulder (More Effective) |
|-------------------------------|---------------------------------------|
| "Let's talk about feelings" | "Let's fix this RV together" |
| Direct eye contact required | Side-by-side, no eye contact pressure |
| Social performance anxiety | Shared focus on task |
| Forced vulnerability | Natural vulnerability through reliance |

**Philosophy**: "Starts shoulder-to-shoulder, becomes heart-to-heart over time"

#### Best Activities for Male Bonding
1. **Outdoor Adventures**: Hiking, fishing, kayaking, mountain biking
2. **Skill-Building**: RV repair, mechanical work, outdoor cooking, navigation
3. **Sports**: Cycling groups, pickup games, running clubs
4. **Creative Projects**: Photography, woodworking, vehicle upgrades
5. **Veterans Groups**: Military camaraderie, service projects (Team RWB model)

#### Platform Examples
- **Meetup**: Activity-based matching, interest groups, structured events (successful)
- **Team Red, White & Blue**: Veteran connections through physical activities (successful)
- **Bumble BFF**: Same-gender matching "executed terribly" - optimized for straight cis women only (failed)

#### Design Implications
- Frame as "activities" not "socializing"
- No pressure to "talk about feelings"
- Focus on shared tasks and interests
- Small groups (4-8) build stronger bonds
- Veterans-specific options (common RV demographic)

---

### 3. Inclusive Design Requirements

#### Critical Pitfalls to Avoid

**Design Failures from Other Platforms**:
1. **Betterment (2019)**: Binary gender field alienated trans users → product abandonment
2. **Bumble BFF**: "Optimized for straight cisgender women only" → exclusion lawsuits
3. **Generic platforms**: Photo verification doesn't verify safety (theater)
4. **Hidden reporting**: Users can't find how to report (buried in menus)
5. **No response loop**: Report and never hear back → distrust

#### Legal & Ethical Considerations
- "Intent doesn't matter - **consequences do**" (Legal counsel, 2024)
- Gender-segregated features can constitute **discrimination** under civil rights law
- Must accommodate trans/non-binary users from day one (not afterthought)
- **1.6%** of adults, **5%+** of under-30 users identify as trans/non-binary
- "If it's not inclusive, people can't sign up. **You're losing customers.**" (Product research)

#### Inclusive Design Requirements
| ❌ Do NOT | ✅ DO |
|----------|------|
| Offer "Other" as gender option | Offer "Prefer to self-describe" + text field |
| Force gender selection | Make gender **completely optional** |
| Assume binary gender | Support non-binary, genderfluid, agender, etc. |
| Share gender by default | Hide gender by default, user opts in |
| Gender-gate features | Personalize via opt-in preferences |

---

## Product Overview

### Target Users

#### Primary Personas

**1. Sarah, 52, Solo RV Traveler (Women's Safety Focus)**
- **Background**: Recently divorced, new to solo travel, anxious about safety
- **Needs**: Practical safety skills, community support, empowerment (not fear)
- **Behavior**: Reads reviews extensively, joins women's groups, seeks reassurance
- **Quote**: "I want to feel confident, not scared. Give me skills, not warnings."

**2. Mike, 58, Retired Veteran (Men's Connection Focus)**
- **Background**: Full-time RVer, divorced, struggling with loneliness
- **Needs**: Activity-based connection, no pressure to "open up," camaraderie
- **Behavior**: Joins activity groups (hiking, RV repair), bonds through doing
- **Quote**: "I don't want to sit in a circle and talk. Let's fix something together."

**3. Alex, 34, Non-binary Solo Traveler (Inclusive Design Focus)**
- **Background**: Digital nomad, tired of being excluded by binary systems
- **Needs**: Privacy, inclusivity, ability to connect without forced disclosure
- **Behavior**: Avoids platforms with mandatory gender, values opt-in privacy
- **Quote**: "I just want to find people who share my interests. Why do I need to disclose my gender?"

#### Secondary Personas
- Couples traveling together (existing "couple" travel style)
- Families with accessibility needs
- LGBTQ+ travelers seeking safe communities
- International travelers (future: multi-language support)

---

## Core Features & Requirements

### Phase 1: Inclusive Foundation (Weeks 1-2)

#### 1.1 Profile Schema Extensions

**New Database Columns** (`profiles` table):

```sql
-- Gender & Identity (ALL OPTIONAL)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_identity TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_custom TEXT; -- for "self-describe"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns_custom TEXT;

-- Enhanced Travel Information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[]; -- array of interest tags
-- Note: travel_style already exists but needs to be converted to TEXT[]

-- Privacy & Personalization Preferences (JSONB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{
  "show_personalized_safety": false,
  "show_personalized_community": false,
  "share_gender_with_groups": false
}'::jsonb;
```

**Gender Identity Options** (NEVER "Other"):
- Woman
- Man
- Non-binary
- Genderqueer
- Agender
- Genderfluid
- Two-Spirit
- Prefer to self-describe (→ text input)
- Prefer not to say (default)

**Pronouns Options**:
- she/her
- he/him
- they/them
- she/they
- he/they
- any pronouns
- Prefer to self-describe (→ text input)
- Prefer not to say (default)

**Interests Tags** (for activity-based matching):
- Outdoor: hiking, fishing, kayaking, mountain biking, birdwatching, stargazing
- Skills: RV repair, mechanical work, outdoor cooking, photography, navigation
- Social: veterans community, LGBTQ+ travelers, 50+ travelers, accessibility
- Creative: woodworking, writing, art, music

#### 1.2 Profile Form UI Updates

**Location**: `src/components/profile/ProfileIdentity.tsx`

**Requirements**:
- Add gender identity field (optional, with info tooltip)
- Add pronouns field (optional)
- Convert travel_style from dropdown to multi-select checkboxes
- Add interests multi-select (categorized)
- All fields clearly marked as "Optional"
- Tooltip explaining: "This helps us provide relevant community features and safety resources. Your gender is private by default - you control who sees it."

**Acceptance Criteria**:
- [ ] User can skip all new fields (truly optional)
- [ ] "Self-describe" option shows text input
- [ ] Mobile-responsive layout (fields stack on small screens)
- [ ] Form saves successfully with partial data
- [ ] No validation errors for empty optional fields
- [ ] Tooltips explain purpose without fear-based language

#### 1.3 Privacy Settings UI

**Location**: `src/components/settings/PrivacySettings.tsx`

**Default Privacy Settings** (secure by default):
```typescript
{
  profile_visibility: 'community', // not 'public'
  location_precision: 'city', // not 'exact'
  location_delay: 24, // hours
  age_display: 'range', // "50s" not "52"
  gender_visible: false, // HIDDEN by default
  pronouns_visible: true, // visible for respectful communication
  show_current_location: false,
  allow_direct_messages: 'connections_only'
}
```

**Content Preferences** (user opts in):
- [ ] "Show personalized safety resources" (default: OFF)
  - Tooltip: "Get safety tips relevant to your travel style and identity"
- [ ] "Show relevant community groups" (default: OFF)
  - Tooltip: "Discover groups matching your interests"
- [ ] "Share gender with community groups" (default: OFF)
  - Tooltip: "Allows gender-specific groups to appear in your recommendations"

**Acceptance Criteria**:
- [ ] All new settings default to most private option
- [ ] Clear explanations for each setting
- [ ] Changes save immediately with confirmation toast
- [ ] User can revert to defaults with one click

---

### Phase 2: Safety Resources Hub (Weeks 3-4)

#### 2.1 Universal Safety Page

**Location**: `src/pages/Safety.tsx`
**Route**: `/safety` (public, always visible)

**Content Sections** (universal - everyone sees these):

1. **Situational Awareness**
   - Trust your instincts (with examples)
   - Environmental scanning techniques
   - Exit strategy planning
   - Communication protocols (check-ins)

2. **Verbal De-escalation**
   - Conflict resolution techniques
   - Setting boundaries assertively
   - Saying "no" effectively
   - Getting help without escalation

3. **RV & Campground Safety**
   - Choosing safe locations (reviews, lighting, neighbors)
   - Securing your RV (locks, alarms, cameras)
   - Emergency preparedness (first aid, fire, weather)
   - Wildlife awareness (proper food storage)

4. **Emergency Resources**
   - Emergency contacts (911, poison control, roadside assistance)
   - Medical resources (urgent care locator, telehealth)
   - Legal resources (RV-specific legal aid)
   - Mental health hotlines (988 Suicide & Crisis, Veterans Crisis Line)

5. **Technology Tools**
   - Location sharing apps (Life360, Find My Friends)
   - Emergency notification apps (Noonlight, bSafe)
   - Offline maps (Google Maps offline, Maps.me)
   - Communication devices (satellite messengers, PLBs)

**Content Tone**:
- ✅ **Empowering**: "Build confidence in your ability to handle situations"
- ✅ **Practical**: "Here's how to do X in scenario Y"
- ✅ **Statistical**: "Campgrounds have exceptionally low crime rates compared to urban areas"
- ❌ **Fear-based**: NO "stranger danger," "you could be attacked," victim mentality

**Acceptance Criteria**:
- [ ] Content reviewed by safety expert (not just AI-generated)
- [ ] Statistics verified and cited
- [ ] Mobile-optimized (travelers access on phones)
- [ ] Printable/downloadable version available
- [ ] Search functionality to find specific topics

#### 2.2 Personalized Safety Content (Opt-In)

**Location**: `src/components/safety/PersonalizedSafetyCard.tsx`

**Trigger Logic**:
```typescript
// Only show if:
user.content_preferences.show_personalized_safety === true
AND user.gender_identity !== null
```

**Women's Additional Resources** (if gender_identity === 'Woman'):
- "You're Not Alone" - Statistics showing 85% of solo travelers are women
- "Experience Builds Confidence" - Data on fear reduction after 10+ trips
- "Statistical Reality" - Crime rates in campgrounds vs cities
- "Women's Safety Network" - Link to join women-only groups
- "Practical Skills Workshops" - RV maintenance, verbal self-defense
- "24/7 Support Resources" - Domestic violence hotline, RAINN, crisis text

**Men's Additional Resources** (if gender_identity === 'Man'):
- "Men's Mental Health Matters" - Loneliness epidemic statistics
- "Mental Health Resources" - 988 hotline, Veterans Crisis Line
- "Activity-Based Connection" - Link to activity groups (no pressure to talk)
- "Veterans Support" - Link to veteran community groups

**Non-Binary/Other Additional Resources**:
- "LGBTQ+ Traveler Safety" - Resources specific to queer travelers
- "Community Support" - Link to LGBTQ+ RV groups
- "Legal Resources" - Know your rights, discrimination reporting

**Acceptance Criteria**:
- [ ] Content only shows if user explicitly opts in
- [ ] No content shown if gender_identity is blank
- [ ] Language is empowering, not fear-based
- [ ] All crisis hotline numbers verified and current
- [ ] Links to communities are functional

---

### Phase 3: Community Groups System (Weeks 5-6)

#### 3.1 Database Schema

**New Tables**:

```sql
-- Community Groups
CREATE TABLE community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL, -- 'open', 'gender-specific', 'age-specific', 'interest-based'
  access_criteria JSONB, -- {"gender": ["Woman"], "min_age": 18, "interests": ["hiking"]}
  created_by UUID REFERENCES profiles(id),
  moderators UUID[] DEFAULT ARRAY[]::UUID[],
  member_count INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public', -- 'public', 'unlisted', 'private'
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Memberships
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'removed'
  role TEXT DEFAULT 'member', -- 'member', 'moderator', 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group Posts
CREATE TABLE group_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'discussion', -- 'discussion', 'event', 'resource', 'question'
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Events
CREATE TABLE group_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- 'hike', 'meetup', 'workshop', 'repair_session', 'rally'
  location_name TEXT,
  location_city TEXT,
  location_state TEXT,
  coordinates POINT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  max_attendees INTEGER,
  attendee_count INTEGER DEFAULT 0,
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'all'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Attendees
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES group_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going', -- 'going', 'maybe', 'not_going'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
```

#### 3.2 Group Access Control Logic

**Service**: `src/services/groupAccessService.ts`

**Access Control Rules**:

1. **Open Groups** - Anyone can join immediately
2. **Interest-Based Groups** - Match based on user's interests array
3. **Gender-Specific Groups** - Require:
   - User has opted in to "share_gender_with_groups"
   - User has gender_identity set (not blank)
   - User's gender matches group's criteria
4. **Age-Specific Groups** - Check min_age and max_age criteria
5. **Approval-Required Groups** - Join request goes to moderators

**Error Messages** (user-friendly):
- "This group requires sharing your gender. Enable this in Privacy Settings."
- "This group is for [gender] travelers. Your profile shows [gender]."
- "This group is for travelers 50+ years old."
- "Your join request has been sent to the moderators."

**Acceptance Criteria**:
- [ ] User cannot join gender-specific group without opt-in
- [ ] Clear error messages explain why user can't join
- [ ] No error messages reveal user's private data
- [ ] Users can leave groups at any time
- [ ] Moderators can approve/reject pending members

#### 3.3 Pre-Seeded Groups

**Platform will seed these groups initially**:

1. **Women's Solo RV Travel Network**
   - Type: gender-specific (Woman)
   - Focus: Safety, empowerment, community support
   - Content: Campground recommendations, skill workshops, buddy system

2. **Men's Outdoor Adventure Group**
   - Type: interest-based (hiking, fishing, biking)
   - Focus: Activity-based bonding, no pressure to "talk feelings"
   - Content: Group hikes, fishing trips, RV repair sessions

3. **LGBTQ+ RV Travelers**
   - Type: open (self-selected)
   - Focus: Safe spaces, queer-friendly campgrounds, community
   - Content: Pride rallies, safe travel routes, legal resources

4. **Veterans RV Community**
   - Type: interest-based (veterans)
   - Focus: Camaraderie, service projects, mental health support
   - Content: Group activities, VA resources, peer support

5. **50+ Solo Travelers**
   - Type: age-specific (50+)
   - Focus: Mature travelers, health considerations, slower travel
   - Content: Accessibility tips, medical resources, relaxed pace trips

6. **Full-Time RV Living**
   - Type: open
   - Focus: Mail forwarding, domicile, taxes, healthcare
   - Content: Practical advice, legal tips, cost-of-living comparisons

**Acceptance Criteria**:
- [ ] All seeded groups have engaging descriptions
- [ ] Each group has initial content (welcome post)
- [ ] Moderators assigned (platform staff initially)
- [ ] Groups appear in search and recommendations

---

### Phase 4: Activity-Based Matching (Weeks 7-8)

#### 4.1 Activity Events System

**Location**: `src/pages/Activities.tsx`

**Event Categories**:
1. **Outdoor Adventures**: Hiking, fishing, kayaking, mountain biking, birdwatching
2. **Skills & Learning**: RV repair, outdoor cooking, navigation, photography, first aid
3. **Sports**: Cycling, running clubs, pickup games, yoga
4. **Creative**: Photography walks, woodworking, writing workshops, art
5. **Veterans**: Service projects, memorial hikes, skill-sharing
6. **Projects**: Group RV upgrades, campground improvements, trail maintenance

**Event Creation Form Requirements**:
- Activity type (dropdown from categories)
- Difficulty level (beginner/intermediate/advanced/all levels)
- Group size (2-20, recommend 4-8 for bonding)
- Date & time (with timezone auto-detection)
- Location (city, campground name, coordinates)
- Access control (open/approval-required/group-members-only)
- Description (what to expect, what to bring)
- Skill level required (optional)

**Discovery & Matching**:
- Show events matching user's interests
- Filter by location (within X miles of current location)
- Filter by difficulty level
- Filter by date range
- Sort by: upcoming, distance, popularity

**Acceptance Criteria**:
- [ ] Users can create events easily (< 2 minutes)
- [ ] Events show on map view
- [ ] Users can RSVP (going/maybe/not going)
- [ ] Event creator can see attendee list
- [ ] Notifications for new events matching interests
- [ ] Past events show attendance count (social proof)

#### 4.2 Shoulder-to-Shoulder Design Patterns

**For Men's Activity Events** (recommended, not enforced):
- Frame as "doing" not "socializing" - "RV Repair Workshop" not "Men's Support Group"
- No pressure to share feelings - Focus on the task/activity
- Small groups (4-8 people) - Easier to bond
- Structured activity - Clear goal reduces social anxiety
- Side-by-side positioning - Literal shoulder-to-shoulder (working on engine, hiking trail)

**Example Event Templates**:
- "RV Maintenance Workshop" - Learn oil changes, tire rotation (doing)
- "Group Hike: 5-mile moderate trail" - Physical activity, side-by-side
- "Fishing Trip: Local lake" - Shared interest, relaxed pace
- "Photography Walk: Sunset at [campground]" - Creative, low pressure
- "Veterans Coffee & Trail Cleanup" - Service project, camaraderie

**Acceptance Criteria**:
- [ ] Event templates available for quick creation
- [ ] Language emphasizes activity, not "socializing"
- [ ] Group size defaults to 4-8 for connection events
- [ ] Veterans-specific event type available
- [ ] No "therapy" or "support group" language (use "connection through activity")

---

### Phase 5: Safety & Reporting System (Weeks 9-10)

#### 5.1 Reporting System (Max 2 Clicks)

**Location**: `src/components/safety/ReportModal.tsx`

**Trigger Points** (report button visible everywhere):
- Every user profile (3-dot menu → Report User)
- Every message/chat (long-press → Report Message)
- Every post/comment (3-dot menu → Report Post)
- Every group (group settings → Report Group)
- Every event (event page → Report Event)

**Report Flow** (optimized for speed):

**Click 1**: Report button
**Click 2**: Select reason
- Harassment or bullying
- Safety concern (threatening behavior)
- Inappropriate content (sexual, violent)
- Spam or scam
- Impersonation
- Threats of violence
- Other (text field)

**Optional**: Add details (not required)

**Immediate Action** (before review):
- "Block This User Immediately" button (user takes control)
- User blocked: Can't message, can't see profile, can't join same groups

**SLA Promise** (shown in modal):
- **Critical safety issues**: Reviewed within 1 hour
- **Harassment/threats**: Reviewed within 4 hours
- **Other issues**: Reviewed within 24 hours
- **You'll be notified** when we take action

**Acceptance Criteria**:
- [ ] Report button is EASY to find (not buried in menus)
- [ ] Takes max 2 clicks to submit report
- [ ] User can block immediately (doesn't wait for review)
- [ ] User receives confirmation notification
- [ ] User receives resolution notification (action taken)
- [ ] Report includes context (screenshot, message content, timestamp)

#### 5.2 Moderation Dashboard

**Location**: `src/pages/admin/Moderation.tsx`

**Features Required**:
- Real-time report queue (auto-refreshes)
- SLA timer (color-coded: green <1hr, yellow <4hr, red >4hr)
- Report details (content, context, reporter, reported user)
- Moderation actions:
  - Warn user (send warning message)
  - Suspend user (temporary, with duration)
  - Ban user (permanent, with reason)
  - Delete content
  - No action (false report)
- Report history (per user, per moderator)
- Transparency notifications (auto-sent to reporter)

**Moderation Guidelines** (in-app):
- Harassment: 7-day suspension, permanent on repeat
- Threats: Immediate permanent ban + law enforcement contact
- Spam: Delete content, warn first time, suspend on repeat
- False reports: Track but don't penalize (encourage reporting)

**Acceptance Criteria**:
- [ ] Dashboard shows reports sorted by SLA urgency
- [ ] Moderator can take action in <1 minute per report
- [ ] Reporter receives notification within SLA time
- [ ] Ban appeals process exists (support ticket)
- [ ] Moderator actions logged for accountability

#### 5.3 User Transparency

**What reporters see**:
- "Your report has been received" (immediate)
- "We're reviewing your report about [user]" (within SLA)
- "We've taken action on your report. [User] has been [warned/suspended/banned]" (after resolution)

**What reported users see** (if not banned):
- "You've received a warning for [reason]"
- "Your account has been suspended for [duration] due to [reason]"
- "You can appeal this decision by contacting support"

**Acceptance Criteria**:
- [ ] All notifications are respectful (not accusatory)
- [ ] Clear reasons provided (not vague "violation of TOS")
- [ ] Appeal process clearly explained
- [ ] Users can view their own moderation history

---

## Non-Functional Requirements

### Performance
- Page load time: <3 seconds on 3G connection
- Search/filter results: <500ms
- Real-time updates (group posts): <2 second lag
- Image uploads: <5 seconds for 5MB image
- Map rendering: <2 seconds for 50 markers

### Accessibility (WCAG 2.1 AA)
- [ ] Keyboard navigation for all features
- [ ] Screen reader compatibility (ARIA labels)
- [ ] Minimum contrast ratio 4.5:1
- [ ] Touch targets minimum 44x44px
- [ ] Text resize up to 200% without loss of functionality
- [ ] Alt text for all images
- [ ] Captions for video content

### Security
- [ ] All gender/identity data encrypted at rest
- [ ] Opt-in sharing enforced (no data leaks)
- [ ] Rate limiting on API endpoints (prevent scraping)
- [ ] HTTPS only (no HTTP fallback)
- [ ] Content Security Policy headers
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)

### Privacy (GDPR/CCPA Compliance)
- [ ] Right to access data (export all user data)
- [ ] Right to deletion (full account deletion)
- [ ] Right to correct data (edit all profile fields)
- [ ] Consent management (opt-in preferences)
- [ ] Data minimization (don't collect unnecessary data)
- [ ] Purpose limitation (data used only for stated purpose)

### Scalability
- Support for 10,000 concurrent users (Phase 1 target)
- Database queries optimized for <100ms response
- CDN for static assets (images, CSS, JS)
- Lazy loading for images and components
- Pagination for lists (groups, events, posts)

### Internationalization (Future)
- Content in English (Phase 1)
- Future: Spanish, French, German translations
- UTF-8 encoding for all content
- Date/time formatting per user's locale
- Currency conversion (if needed for paid features)

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Enable users to complete profile with optional identity fields

**Deliverables**:
- Database migration: Add gender_identity, pronouns, interests, content_preferences
- ProfileIdentity.tsx: Add new form fields
- PrivacySettings.tsx: Add content preferences toggles
- Testing: All fields optional, saves successfully

**Success Criteria**:
- [ ] 50% of active users complete new profile fields
- [ ] <5% support tickets about new fields (clear UX)
- [ ] No accessibility violations (automated testing)

### Phase 2: Safety Hub (Weeks 3-4)
**Goal**: Provide universal safety content + opt-in personalized resources

**Deliverables**:
- Safety.tsx: Universal safety page (5 sections)
- PersonalizedSafetyCard.tsx: Conditional content by gender
- Content review by safety expert
- Mobile optimization

**Success Criteria**:
- [ ] 30% of users visit safety page within first month
- [ ] 15% of users opt in to personalized safety content
- [ ] 90%+ satisfaction rating (post-visit survey)

### Phase 3: Community Groups (Weeks 5-6)
**Goal**: Enable users to create/join interest-based groups

**Deliverables**:
- Database migrations: community_groups, group_memberships, group_posts
- Community.tsx: Group discovery page
- CreateGroup.tsx: Group creation form
- groupAccessService.ts: Access control logic
- 6 pre-seeded groups

**Success Criteria**:
- [ ] 100+ groups created by users in first month
- [ ] 500+ group memberships in first month
- [ ] 20%+ of users join at least one group

### Phase 4: Activity Events (Weeks 7-8)
**Goal**: Enable activity-based connection through events

**Deliverables**:
- Database migrations: group_events, event_attendees
- Activities.tsx: Event discovery page
- CreateActivityEvent.tsx: Event creation form
- Event templates for quick creation

**Success Criteria**:
- [ ] 50+ events created in first month
- [ ] 200+ event RSVPs in first month
- [ ] 60%+ attendance rate (people who RSVP actually show up)

### Phase 5: Safety & Reporting (Weeks 9-10)
**Goal**: Robust reporting system with fast moderation

**Deliverables**:
- ReportModal.tsx: 2-click reporting UI
- Moderation.tsx: Admin moderation dashboard
- Notification system: Reporter + reported user transparency
- Moderation guidelines documentation

**Success Criteria**:
- [ ] 95%+ of reports reviewed within SLA time
- [ ] <1% false positive bans (wrongly banned users)
- [ ] 80%+ reporter satisfaction (follow-up survey)

---

## Success Metrics

### Adoption Metrics (Phase 1-2)
- **Profile Completion**: 50% of users fill out new optional fields
- **Opt-In Rate**: 15-20% opt in to personalized content
- **Safety Page Visits**: 30% of users visit within first month

### Engagement Metrics (Phase 3-4)
- **Group Creation**: 100+ user-created groups in first month
- **Group Membership**: 20% of users join at least one group
- **Event Creation**: 50+ events in first month
- **Event Attendance**: 60% attendance rate (RSVP → show up)

### Safety Metrics (Phase 5)
- **Report Response Time**: 95% of reports reviewed within SLA
- **User Trust**: 80% feel safe using the platform (survey)
- **False Positive Rate**: <1% wrongly banned users
- **Reporter Satisfaction**: 80% satisfied with moderation outcome

### Community Health Metrics (Ongoing)
- **Cross-Group Participation**: Users join multiple interest types (not just gender-specific)
- **Repeat Event Attendance**: Users attend 2+ events per month
- **User Retention**: 70% of users active after 3 months
- **Support Tickets**: <2% of users contact support about community features

### Inclusive Design Metrics
- **Trans/Non-Binary Adoption**: 1.6%+ of users identify as trans/non-binary (matches population)
- **Gender Privacy**: 60%+ of users keep gender private (default respected)
- **Self-Describe Usage**: 5%+ of users choose "self-describe" option
- **Opt-In Respect**: 0 reports of forced gender sharing

---

## Risks & Mitigation

### Risk 1: Low Adoption of Optional Fields
**Impact**: Personalization doesn't work without user data
**Probability**: Medium
**Mitigation**:
- Clear value proposition: "Get better recommendations"
- Privacy assurance: "Your data is private by default"
- Incentive: Show preview of personalized content before opt-in
- A/B test messaging to increase opt-in rate

### Risk 2: Gender-Specific Groups Become Toxic
**Impact**: Women's groups harassed, men's groups become "incel" spaces
**Probability**: Medium (precedent from other platforms)
**Mitigation**:
- Strong moderation (1-hour SLA for safety issues)
- Pre-seeded groups with platform moderators
- Clear community guidelines (pinned in every group)
- Zero-tolerance for harassment (immediate permanent ban)
- Private groups (not visible to non-members)

### Risk 3: Legal Challenges to Gender-Specific Groups
**Impact**: Discrimination lawsuit, legal costs
**Probability**: Low (if implemented correctly)
**Mitigation**:
- Groups are USER-CREATED, not platform-imposed
- No forced segregation (opt-in only)
- Trans-inclusive language ("Women and non-binary femme travelers")
- Legal review before launch
- Terms of Service: Platform not liable for user-created group criteria

### Risk 4: Moderation Doesn't Scale
**Impact**: Reports pile up, users lose trust
**Probability**: High (if user base grows quickly)
**Mitigation**:
- Hire moderation team before launch (not after)
- Automated flagging (AI detects likely violations)
- Community moderation (group moderators handle group issues)
- Tiered SLA (critical = 1hr, non-critical = 24hr)
- Self-service tools (users can block without waiting for moderation)

### Risk 5: Users Don't Understand Opt-In System
**Impact**: Confusion, support tickets, poor UX
**Probability**: Medium
**Mitigation**:
- Clear onboarding flow: "Here's how personalization works"
- Tooltips on every setting
- Help documentation: "Why am I seeing/not seeing this content?"
- User testing before launch (fix confusing UX)

---

## Open Questions for Stakeholders

### Product Decisions
1. **Scope**: Should we launch all 5 phases together, or MVP with Phase 1-2 only?
2. **Timeline**: Is 10 weeks acceptable, or do we need faster launch?
3. **Verification**: Add identity verification (photo ID, video call), or keep honor-system?
4. **Paid Features**: Should some groups/events be premium-only, or keep all free?

### Resource Decisions
1. **Moderation**: Can we commit to 1-hour SLA for critical reports? (Requires 24/7 coverage)
2. **Content Creation**: Who writes initial safety content? (In-house vs hire expert)
3. **Legal Review**: Budget for legal review of gender-specific features?
4. **Customer Support**: Additional support staff for community feature questions?

### Technical Decisions
1. **Real-Time**: Do group posts need real-time updates (WebSockets), or polling (simpler)?
2. **Search**: Elasticsearch for advanced search, or PostgreSQL full-text search (cheaper)?
3. **Image Storage**: Continue with Supabase Storage, or upgrade to CDN (faster)?
4. **Analytics**: Add analytics tracking for personalized content (Mixpanel, Amplitude)?

---

## Appendix A: Competitive Analysis

### Girls Love Travel (Women-Only Network)
**What They Do Well**:
- Empowerment-focused messaging (not fear-based)
- Small group sizes (6-10) for deeper connection
- Verified members (reduces scams)
- Active moderation (quick response to harassment)

**What We Can Do Better**:
- Include all genders (not just women)
- Activity-based bonding (not just "female bonding")
- Mobile-first design (they're desktop-heavy)
- Integration with RV-specific features (trip planning, campground reviews)

### Meetup (Activity-Based Groups)
**What They Do Well**:
- Activity-first approach (reduces social anxiety)
- User-created groups (platform enables, users build)
- Event RSVP system (shows social proof)
- Broad interest categories

**What We Can Do Better**:
- RV-traveler-specific (not general population)
- Built-in safety features (reporting, moderation)
- Personalization (recommend events by interests)
- Mobile experience (Meetup app is clunky)

### Bumble BFF (Friendship Matching)
**What They Did Wrong** (learn from mistakes):
- Binary gender system (excluded trans users)
- Same-gender matching "executed terribly"
- "Optimized for straight cisgender women only"
- No activity-based matching (just profiles)

**How We Avoid**:
- Gender is optional + inclusive options
- Activity-based matching (shared interests, not gender)
- Trans/non-binary users supported from day one
- Focus on DOING things together, not just "making friends"

---

## Appendix B: Content Guidelines

### Safety Content Tone
**DO**:
- Use empowering language: "Build confidence," "Develop skills," "Take control"
- Provide statistics: "Campgrounds have exceptionally low crime rates"
- Focus on skills: "Here's how to verbally de-escalate"
- Normalize solo travel: "85% of solo travelers are women"

**DON'T**:
- Fear-based warnings: "You could be attacked," "Stranger danger"
- Victim mentality: "Women are vulnerable," "Protect yourself"
- Patronizing tone: "Ladies, make sure you..."
- Unverified claims: "Always travel in pairs" (not practical for solo travelers)

### Community Guidelines (For All Groups)
1. **Respect**: Treat all members with respect, regardless of gender, identity, age, background
2. **No Harassment**: Zero tolerance for bullying, threats, sexual harassment
3. **Privacy**: Don't share others' locations, personal info without consent
4. **Authenticity**: Be yourself, no catfishing or impersonation
5. **Activity-Focus**: Keep posts relevant to group's purpose
6. **No Spam**: No unsolicited advertising, MLM schemes, scams
7. **Inclusivity**: Use gender-inclusive language ("folks" not "guys")
8. **Reporting**: Report issues to moderators (don't engage with trolls)

---

## Appendix C: Technical Architecture

### Database Schema Summary
- `profiles`: Extended with gender_identity, pronouns, interests, content_preferences
- `community_groups`: User-created groups with access criteria
- `group_memberships`: User-group relationships with status
- `group_posts`: Content within groups
- `group_events`: Activity events (location, date, attendees)
- `event_attendees`: RSVP tracking
- `reports`: Moderation queue (user/content/group reports)
- `moderation_actions`: Audit log of moderator actions

### API Endpoints (Backend)

**Profile Management**:
- `PATCH /api/v1/profile` - Update profile (including new fields)
- `GET /api/v1/profile/:userId` - Get user profile (respects privacy settings)

**Groups**:
- `POST /api/v1/groups` - Create group
- `GET /api/v1/groups` - List groups (filtered, paginated)
- `GET /api/v1/groups/:groupId` - Get group details
- `POST /api/v1/groups/:groupId/join` - Join group (checks access criteria)
- `DELETE /api/v1/groups/:groupId/leave` - Leave group
- `GET /api/v1/groups/:groupId/posts` - Get group posts
- `POST /api/v1/groups/:groupId/posts` - Create post in group

**Events**:
- `POST /api/v1/events` - Create event
- `GET /api/v1/events` - List events (filtered by location, interests, date)
- `GET /api/v1/events/:eventId` - Get event details
- `POST /api/v1/events/:eventId/rsvp` - RSVP to event
- `GET /api/v1/events/:eventId/attendees` - Get attendee list

**Reporting**:
- `POST /api/v1/reports` - Submit report
- `GET /api/v1/reports/:reportId` - Get report status (reporter only)
- `GET /api/v1/admin/reports` - Get moderation queue (admin only)
- `POST /api/v1/admin/reports/:reportId/action` - Take moderation action (admin only)

### Frontend Components

**New Components**:
- `src/components/profile/GenderIdentityField.tsx` - Gender selection with inclusive options
- `src/components/profile/PronounsField.tsx` - Pronouns selection
- `src/components/profile/InterestsSelector.tsx` - Multi-select interests
- `src/components/settings/ContentPreferences.tsx` - Opt-in toggles
- `src/pages/Safety.tsx` - Universal safety hub
- `src/components/safety/PersonalizedSafetyCard.tsx` - Conditional content
- `src/pages/Community.tsx` - Group discovery
- `src/components/community/GroupCard.tsx` - Group preview card
- `src/components/community/GroupDiscovery.tsx` - Personalized recommendations
- `src/components/community/CreateGroup.tsx` - Group creation form
- `src/pages/Activities.tsx` - Event discovery
- `src/components/activities/EventCard.tsx` - Event preview card
- `src/components/activities/CreateActivityEvent.tsx` - Event creation form
- `src/components/safety/ReportModal.tsx` - Reporting UI
- `src/pages/admin/Moderation.tsx` - Admin moderation dashboard

**Modified Components**:
- `src/components/profile/ProfileIdentity.tsx` - Add new fields
- `src/components/settings/PrivacySettings.tsx` - Add content preferences

---

## Appendix D: Testing Plan

### Unit Tests
- [ ] Profile form validation (optional fields, self-describe)
- [ ] Privacy settings persistence (defaults, user changes)
- [ ] Group access control logic (gender, age, interests)
- [ ] Event RSVP logic (going/maybe/not going)
- [ ] Report submission (required fields, context capture)

### Integration Tests
- [ ] Profile update flow (frontend → backend → database)
- [ ] Group creation → join → post → leave flow
- [ ] Event creation → RSVP → attendance tracking
- [ ] Report → moderation action → notification flow

### E2E Tests
- [ ] User completes profile with new fields
- [ ] User opts in to personalized content, sees relevant content
- [ ] User creates group, another user joins
- [ ] User creates event, another user RSVPs
- [ ] User reports content, moderator takes action

### Accessibility Tests
- [ ] Keyboard navigation (all forms, buttons, links)
- [ ] Screen reader compatibility (ARIA labels, headings)
- [ ] Contrast ratio (text, buttons, links)
- [ ] Touch targets (44x44px minimum)

### Security Tests
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (tokens on forms)
- [ ] Privacy leak tests (gender data not exposed when user opted out)

### Performance Tests
- [ ] Page load time (<3s on 3G)
- [ ] Search results (<500ms)
- [ ] Image upload (<5s for 5MB)
- [ ] Database queries (<100ms)

### User Acceptance Testing
- [ ] 10 women solo travelers test safety features
- [ ] 10 men solo travelers test activity events
- [ ] 5 non-binary users test inclusive design
- [ ] Survey feedback: 80%+ satisfaction required to launch

---

## Sign-Off

**Product Manager**: ___________________ Date: ___________

**Engineering Lead**: ___________________ Date: ___________

**Design Lead**: ___________________ Date: ___________

**Legal Review**: ___________________ Date: ___________

**Security Review**: ___________________ Date: ___________

---

**Document Version History**:
- v1.0 (2026-01-08): Initial draft
- Future versions: Track changes, approvals, implementation updates
