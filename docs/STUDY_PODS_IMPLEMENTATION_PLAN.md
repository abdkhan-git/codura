# Study Pods - Complete Implementation Plan

## Vision & Core Concept

Study Pods are collaborative micro-communities that combine:
- **Discord study server** - Real-time collaboration
- **LeetCode group feature** - Shared problem solving
- **Accountability system** - Progress tracking & motivation

### Key Goals:
✅ Encourage peer learning and motivation
✅ Maintain data integrity (pod progress, members, roles)
✅ Support real-time features efficiently
✅ Scalable and modular for future growth

---

## Current Implementation Status

### ✅ **Phase 1: Foundation (COMPLETED)**
- [x] Database schema (all tables exist)
- [x] RLS policies (fixed infinite recursion)
- [x] Pod creation API
- [x] Member management system
- [x] Pod search/filtering API
- [x] Real member count (not hardcoded)
- [x] Basic pod card UI
- [x] Pod listing page

### 🚧 **Phase 2: Core Features (IN PROGRESS)**

---

## Feature Implementation Roadmap

## A. Pod Creation and Membership ✅ (MOSTLY DONE)

### Completed:
- ✅ Create pod with name, description, visibility
- ✅ Roles system (Owner, Moderator, Member)
- ✅ Pod settings (subject, skill level, max members)
- ✅ Public/private pods
- ✅ Approval required option

### TODO:
- [ ] Invite members by username/email
- [ ] Invite code generation and sharing
- [ ] Browse public pods (✅ exists, needs enhancement)
- [ ] Join pod workflow
- [ ] Pod settings page (rename, edit, delete)

#### API Endpoints Needed:
```
POST /api/study-pods/[id]/invite        - Send invites
POST /api/study-pods/[id]/join          - Join pod
POST /api/study-pods/[id]/leave         - Leave pod
PATCH /api/study-pods/[id]              - Update settings
DELETE /api/study-pods/[id]             - Delete pod
GET /api/study-pods/[id]/invite-code    - Generate invite code
POST /api/study-pods/join-by-code       - Join via code
```

---

## B. Shared Problem Sets 🔴 (NOT STARTED)

### Features:
1. **Assign Problems**
   - Pod owners/mods assign problems to group
   - Set deadlines for problems
   - Add notes/context to assignments

2. **Problem Pool**
   - Shared repository of problems
   - Tagged by difficulty, topic
   - Integration with main problems database

3. **Progress Tracking**
   - Each member's status per problem
   - States: Not Started / In Progress / Solved
   - Completion timestamps
   - Solution sharing (optional)

4. **Weekly Challenges**
   - Auto-curated problem sets
   - Refresh weekly/custom schedule
   - Leaderboard for challenges

### Database Schema Needed:
```sql
-- Already exists: study_pod_sessions with problems_covered field
-- Need to add:

CREATE TABLE pod_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ,
  notes TEXT,
  is_challenge BOOLEAN DEFAULT false,
  challenge_week INTEGER,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE pod_problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_problem_id UUID REFERENCES pod_problems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'solved')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  solution_shared BOOLEAN DEFAULT false,
  notes TEXT
);
```

#### API Endpoints:
```
POST /api/study-pods/[id]/problems/assign    - Assign problem
GET /api/study-pods/[id]/problems            - Get all pod problems
GET /api/study-pods/[id]/problems/progress   - Get progress for all members
PATCH /api/study-pods/[id]/problems/[pid]    - Update problem (deadline, notes)
DELETE /api/study-pods/[id]/problems/[pid]   - Remove problem
POST /api/study-pods/[id]/challenges/weekly  - Create weekly challenge
```

---

## C. Collaboration Tools 🔴 (NOT STARTED)

### 1. Discussion Threads
- Per-problem discussions
- General pod chat
- Threaded replies
- Rich text + code blocks
- Reactions

### 2. Hint Exchange System
- Members leave hints (not full solutions)
- Spoiler-tag hints
- Upvote helpful hints

### 3. Pod Notes
- Shared Markdown notes per problem/topic
- Version history
- Collaborative editing

### 4. Code Share/Review (Future)
- Real-time collaborative editor
- Code review comments
- Diff view

### Database Schema:
```sql
CREATE TABLE pod_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id),
  thread_type TEXT CHECK (thread_type IN ('general', 'problem', 'topic')),
  title TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pod_discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES pod_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  parent_message_id UUID REFERENCES pod_discussion_messages(id),
  is_hint BOOLEAN DEFAULT false,
  is_spoiler BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pod_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id),
  topic TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pod_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES pod_notes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### API Endpoints:
```
POST /api/study-pods/[id]/discussions         - Create discussion
GET /api/study-pods/[id]/discussions          - List discussions
POST /api/study-pods/[id]/discussions/[did]/messages - Post message
GET /api/study-pods/[id]/discussions/[did]/messages  - Get messages

POST /api/study-pods/[id]/notes               - Create note
GET /api/study-pods/[id]/notes                - List notes
PATCH /api/study-pods/[id]/notes/[nid]        - Update note
GET /api/study-pods/[id]/notes/[nid]/versions - Get version history
```

---

## D. Accountability and Progress 🟡 (PARTIALLY DONE)

### Completed:
- ✅ Basic pod member tracking
- ✅ Member roles stored
- ✅ Session attendance tracking (table exists)

### TODO:
1. **Pod Leaderboard**
   - Sort by: solved problems, XP, streaks, contributions
   - Filter by time period (week, month, all-time)
   - Visual rankings with badges

2. **Pod Analytics Dashboard**
   - Problems solved this week/month
   - Most active hours/days
   - Member activity heatmap
   - Progress charts

3. **Goals System**
   - Collective goals (e.g., "Finish 10 DP problems")
   - Individual member goals
   - Goal progress tracking
   - Celebrations when goals met

4. **Streak Reminders**
   - Track inactive members
   - Automated reminders
   - Pod-wide streak tracking

### Database Schema:
```sql
CREATE TABLE pod_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  goal_type TEXT CHECK (goal_type IN ('problems_solved', 'sessions_attended', 'custom')),
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  timeframe TEXT, -- 'weekly', 'monthly', 'custom'
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE pod_member_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  week_start DATE,
  problems_solved INTEGER DEFAULT 0,
  hints_given INTEGER DEFAULT 0,
  discussions_participated INTEGER DEFAULT 0,
  sessions_attended INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### API Endpoints:
```
GET /api/study-pods/[id]/leaderboard         - Get leaderboard
GET /api/study-pods/[id]/analytics           - Get analytics dashboard
POST /api/study-pods/[id]/goals              - Create goal
GET /api/study-pods/[id]/goals               - List goals
PATCH /api/study-pods/[id]/goals/[gid]       - Update goal progress
```

---

## E. Real-Time and Notifications 🔴 (NOT STARTED)

### Features:
1. **Live Collaboration**
   - Member joins/leaves notifications
   - Problem solved notifications
   - New comment notifications

2. **Push Notifications**
   - Assigned problems
   - New challenges
   - Milestones reached
   - Session reminders

3. **Activity Feed**
   - Central timeline of pod events
   - Filter by type
   - Real-time updates

### Technology Stack:
- **WebSockets**: Use Supabase Realtime or Socket.io
- **Push API**: Browser notifications
- **Database**: Use existing `study_pod_activities` table

### Implementation:
```typescript
// Use Supabase Realtime subscriptions
const channel = supabase
  .channel(`pod:${podId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'study_pod_activities',
    filter: `pod_id=eq.${podId}`
  }, (payload) => {
    // Handle new activity
  })
  .subscribe();
```

#### API Endpoints:
```
GET /api/study-pods/[id]/activities          - Get activity feed
POST /api/study-pods/[id]/activities         - Create activity (internal)
GET /api/study-pods/[id]/notifications       - Get member notifications
PATCH /api/notifications/[nid]/read          - Mark as read
```

---

## F. Gamification 🔴 (NOT STARTED)

### 1. XP System
- **Problem solved**: 10-50 XP (based on difficulty)
- **Hint given**: 5 XP
- **Discussion participation**: 2 XP
- **Session attendance**: 15 XP
- **Goal completed**: 50 XP

### 2. Pod Levels
- Pods level up collectively
- Level 1: 0-100 XP
- Level 2: 100-300 XP
- Level 3: 300-600 XP
- Level 4: 600-1000 XP
- Level 5+: +500 XP per level

### 3. Achievements
- "Top Helper" - Most hints given
- "Problem Setter" - Most problems assigned
- "Consistency King" - Longest streak
- "Speed Runner" - Fastest problem solver
- "Discussion Leader" - Most discussion posts

### Database Schema:
```sql
CREATE TABLE pod_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pod_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  xp_reward INTEGER DEFAULT 0
);

CREATE TABLE pod_member_achievements (
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  achievement_id UUID REFERENCES pod_achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pod_id, user_id, achievement_id)
);
```

---

## G. AI/Automation Layer 🔴 (FUTURE)

### 1. AI Study Companion
- Suggests next problems based on weak areas
- Analyzes pod member skill gaps
- Recommends optimal study paths

### 2. Pod Summaries
- Weekly recaps with GPT
- Progress summaries
- Achievement highlights
- Next week suggestions

### 3. Auto-Tagging
- NLP to detect topics in discussions
- Auto-categorize problems
- Smart search within pod content

---

## Priority Implementation Order

### **Sprint 1: Core Functionality** (Week 1-2)
1. ✅ Pod creation (DONE)
2. ✅ Member management basics (DONE)
3. [ ] Join/Leave pod workflow
4. [ ] Invite system (by username)
5. [ ] Pod detail page with members list

### **Sprint 2: Problem Management** (Week 3-4)
1. [ ] Assign problems to pod
2. [ ] Problem progress tracking
3. [ ] Problem list view in pod
4. [ ] Weekly challenges

### **Sprint 3: Collaboration** (Week 5-6)
1. [ ] Discussion threads
2. [ ] Pod notes system
3. [ ] Hint exchange

### **Sprint 4: Accountability** (Week 7-8)
1. [ ] Leaderboard
2. [ ] Analytics dashboard
3. [ ] Goals system
4. [ ] Streak tracking

### **Sprint 5: Real-time & Polish** (Week 9-10)
1. [ ] Real-time notifications
2. [ ] Activity feed
3. [ ] Push notifications
4. [ ] UI polish

### **Sprint 6: Gamification** (Week 11-12)
1. [ ] XP system
2. [ ] Pod levels
3. [ ] Achievements

---

## Technical Architecture

### Database Design Principles:
- ✅ All tables use UUID for foreign keys
- ✅ Proper CASCADE on deletes
- ✅ RLS policies for security
- ✅ Indexes on frequently queried columns
- ✅ JSONB for flexible metadata

### API Design:
- RESTful endpoints
- Consistent error handling
- Detailed error messages in development
- Rate limiting (future)
- Caching strategy (future)

### Frontend Architecture:
- Server components where possible
- Client components for interactivity
- Real-time with Supabase subscriptions
- Optimistic UI updates
- Loading states everywhere

---

## Next Immediate Steps

1. **Create pod detail page** (`app/study-pods/[id]/page.tsx`)
2. **Implement join/leave workflow**
3. **Add invite system**
4. **Create problem assignment feature**
5. **Build leaderboard**

---

## Success Metrics

### User Engagement:
- Daily active pods
- Problems solved per pod
- Discussion participation rate
- Session attendance rate

### Learning Outcomes:
- Problem completion rate improvement
- Skill level progression
- Streak maintenance

### Platform Health:
- Pod creation rate
- Member retention in pods
- Average pod size
- Pod activity duration

---

## Conclusion

Study Pods is a comprehensive feature that requires careful implementation in phases. The foundation is solid with proper database schema and RLS policies. Focus should be on building core features first (problem management, discussions, leaderboards) before adding advanced features like AI and gamification.

**Current Status**: Foundation complete, ready for Sprint 1 completion and Sprint 2 start.
