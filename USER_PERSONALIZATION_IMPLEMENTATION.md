# User-Specific Data Display & Mock Data Implementation

## Overview

This document describes the comprehensive implementation of user-specific data display with mock data fallback for the Engunity AI Projects Dashboard.

## Features Implemented

### 1. **User Context Integration** ✅

The dashboard now integrates with the Supabase authentication system to:
- Load user profile information (name, email, role, organization)
- Display personalized greetings and user avatars
- Show role-specific information and permissions

**File**: [`frontend/src/hooks/useUserContext.ts`](frontend/src/hooks/useUserContext.ts)

```typescript
export interface UserContext {
  user_id: string;
  email: string;
  name: string;
  role: UserRole; // Owner | Admin | Contributor | Viewer
  organization_id: string;
  token: string;
  avatar?: string;
  initials: string;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

### 2. **Mock Data Generator** ✅

A comprehensive mock data system that generates realistic project, task, and insight data for demo/testing purposes.

**File**: [`frontend/src/lib/mockData.ts`](frontend/src/lib/mockData.ts)

**Key Functions**:
- `generateMockProjects()` - Creates realistic project data
- `generateMockTasks()` - Creates task lists with various statuses
- `generateMockInsights()` - Generates AI insights and recommendations
- `generateMockDashboard()` - Complete personalized dashboard
- `toggleMockDataMode()` - Switch between live and demo data
- `shouldUseMockData()` - Check current data mode

### 3. **User Profile Card** ✅

A prominent card displaying user information and quick stats.

**Location**: [`frontend/src/app/dashboard/projects/page.tsx`](frontend/src/app/dashboard/projects/page.tsx:317-397)

**Features**:
- User avatar with initials
- Online status indicator
- Role badge (color-coded by role)
- Email and organization ID
- Data mode indicator (Live Data vs Demo Mode)
- Quick stats: Projects, Active, At Risk, My Tasks, Overdue, Completed This Week

### 4. **Data Mode Toggle** ✅

Easy switching between real backend data and mock demo data.

**Features**:
- Visual indicator of current mode
- One-click toggle button
- Persistent setting (localStorage)
- Automatic fallback to mock data if backend is unavailable

### 5. **Personalized Dashboard** ✅

The dashboard now shows user-specific information:

#### **User-Specific Stats**
- Total projects (filtered by permissions)
- Active projects the user has access to
- Projects at risk
- Tasks assigned to the user
- Overdue tasks for the user
- Tasks completed by the user this week

#### **Personalized AI Insights**
Displays AI-generated insights specific to the user's:
- Workload
- Pending reviews
- Performance opportunities
- Timeline risks

#### **Upcoming Deadlines**
Shows tasks assigned to the user with approaching deadlines:
- Task title
- Days until due
- Due date
- Priority level (color-coded)

### 6. **Role-Based Visibility** ✅

Different roles see different information:

#### **Owner/Admin**
- Full access to all organization projects
- Can see budget and financial data
- Can see all team members and assignments
- Full AI insights and analytics

#### **Contributor**
- See projects they're assigned to
- See their own tasks
- Limited budget visibility
- Filtered AI insights

#### **Viewer**
- Read-only access
- No budget information
- Limited analytics (rounded health scores)
- Banner indicating viewer mode

**File**: [`backend/app/services/permissions.py`](backend/app/services/permissions.py)

### 7. **Loading & Error States** ✅

Comprehensive state management:

#### **Loading State**
- Animated spinner
- "Loading your dashboard..." message

#### **Not Authenticated**
- Lock icon
- "Authentication Required" message
- Login button link

#### **Error Handling**
- Graceful fallback to mock data if backend fails
- Console warnings for debugging
- Error messages for users

## Architecture

### Frontend Flow

```
User Login
    ↓
useUserContext Hook
    ↓
Load Dashboard (projects/page.tsx)
    ↓
Check shouldUseMockData()
    ↓
┌──────────────────────────────┐
│ Mock Data Mode?              │
├──────────────────────────────┤
│ YES → generateMockDashboard()│
│  NO → getPersonalizedDashboard()
│       ↓                      │
│   API Call Failed?           │
│       ↓                      │
│   YES → Fallback to Mock     │
└──────────────────────────────┘
    ↓
Display User Profile Card
    ↓
Display Personalized Insights
    ↓
Display Upcoming Deadlines
    ↓
Render Main Dashboard Content
```

### Backend Integration

The frontend is ready to integrate with these backend endpoints:

#### **GET /api/v1/projects**
```typescript
Authorization: Bearer <token>
Response: { projects: Project[], total: number }
```

#### **POST /api/v1/ai/personalized-dashboard**
```typescript
Authorization: Bearer <token>
Body: {
  user_id: string,
  role: string,
  organization_id: string,
  include_health: boolean,
  include_tasks: boolean,
  include_insights: boolean
}
Response: PersonalizedDashboard
```

**Schemas**: [`backend/app/schemas/project.py`](backend/app/schemas/project.py)

## Usage Guide

### For Users

#### **Viewing Your Personalized Dashboard**

1. Log in to the application
2. Navigate to the Projects Dashboard
3. Your personalized information will automatically load
4. See your name, role, and quick stats at the top

#### **Switching Between Live and Demo Mode**

1. Look for the "Live Data" or "Demo Mode" indicator in your profile card
2. Click "Switch to Demo" or "Switch to Live" button
3. The page will reload with the selected data mode

#### **Understanding Your Role**

- **Owner** (Purple badge): Full access to everything
- **Admin** (Blue badge): Manage projects, limited organization settings
- **Contributor** (Green badge): Work on assigned tasks and projects
- **Viewer** (Gray badge): Read-only access

### For Developers

#### **Enabling Mock Data Mode**

```typescript
import { toggleMockDataMode } from '@/lib/mockData';

// Toggle mode
const isNowMockMode = toggleMockDataMode();
```

#### **Generating Custom Mock Data**

```typescript
import { generateMockProjects, generateMockTasks } from '@/lib/mockData';

const projects = generateMockProjects(10, userId, orgId);
const tasks = generateMockTasks(20, projectId, userId);
```

#### **Checking User Permissions**

```typescript
import { usePermission } from '@/hooks/useUserContext';

const canEdit = usePermission('projects', 'write');
const canDelete = usePermission('projects', 'delete');
```

## Data Structures

### PersonalizedDashboard

```typescript
interface PersonalizedDashboard {
  user: {
    name: string;
    role: string;
    organization_id: string;
  };
  visible_projects: Project[];
  personal_insights: AIInsight[];
  recommendations: Recommendation[];
  stats: {
    total_projects: number;
    active_projects: number;
    at_risk_projects: number;
    assigned_tasks: number;
    overdue_tasks: number;
    completed_this_week: number;
  };
  upcoming_deadlines: Array<{
    task_id: string;
    title: string;
    due_date: string;
    days_until: number;
    priority: string;
  }>;
}
```

### Project

```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Planning' | 'On Track' | 'At Risk' | 'Overdue' | 'Completed' | 'Paused' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  visibility: 'Private' | 'Team' | 'Public';
  owner_id: string;
  organization_id: string;
  progress: number;
  spent?: number;
  budget?: number;
  team_member_count: number;
  task_count: number;
  milestone_count: number;
  health_score?: number;
  risk_score?: number;
}
```

## Backend Implementation Guide

### 1. Personalized Dashboard Endpoint

Create endpoint: `POST /api/v1/ai/personalized-dashboard`

```python
from app.schemas.project import PersonalizedDashboardRequest, PersonalizedDashboardResponse
from app.services.permissions import PermissionService

@router.post("/ai/personalized-dashboard", response_model=PersonalizedDashboardResponse)
async def get_personalized_dashboard(
    request: PersonalizedDashboardRequest,
    current_user: User = Depends(get_current_user)
):
    # Get user's accessible projects
    all_projects = await get_all_projects(request.organization_id)

    # Filter by permissions
    filtered_projects = PermissionService.filter_projects_for_user(
        all_projects,
        current_user
    )

    # Get user's tasks
    user_tasks = await get_user_tasks(current_user.id)

    # Generate AI insights
    insights = await generate_personalized_insights(
        current_user,
        filtered_projects,
        user_tasks
    )

    # Calculate stats
    stats = calculate_user_stats(filtered_projects, user_tasks)

    # Get upcoming deadlines
    deadlines = get_upcoming_deadlines(user_tasks, limit=5)

    return PersonalizedDashboardResponse(
        user={"name": current_user.name, "role": current_user.role, ...},
        visible_projects=filtered_projects,
        personal_insights=insights,
        recommendations=generate_recommendations(current_user),
        stats=stats,
        upcoming_deadlines=deadlines
    )
```

### 2. Permission Filtering

Already implemented in [`backend/app/services/permissions.py`](backend/app/services/permissions.py)

```python
class PermissionService:
    @staticmethod
    def filter_projects_for_user(projects, user):
        """Filter projects based on user role and permissions"""
        # Implementation provided

    @staticmethod
    def mask_project_data(project, role):
        """Hide sensitive data based on role"""
        # Viewers don't see budget info
        # Implementation provided
```

### 3. AI Insights Generation

Create service: `app/services/ai/personalization.py`

```python
async def generate_personalized_insights(user, projects, tasks):
    insights = []

    # Workload analysis
    assigned_tasks = [t for t in tasks if t.assignee_id == user.id]
    if len(assigned_tasks) > 10:
        insights.append({
            "type": "warning",
            "title": "High Task Overload",
            "description": f"You have {len(assigned_tasks)} tasks...",
            "impact": "high"
        })

    # Deadline analysis
    overdue = [t for t in assigned_tasks if is_overdue(t)]
    if overdue:
        insights.append({
            "type": "warning",
            "title": "Overdue Tasks",
            "description": f"{len(overdue)} tasks are overdue...",
            "impact": "high"
        })

    return insights
```

## Configuration

### Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>

# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/engunity
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=<your-groq-key>
JWT_SECRET=<your-secret>
```

### LocalStorage Keys

- `engunity_use_mock_data` - Boolean flag for mock mode
- `engunity_mock_config` - JSON config for mock data settings

## Testing

### Manual Testing

#### Test User Login
1. Log in with different roles (Owner, Admin, Contributor, Viewer)
2. Verify correct permissions and data visibility

#### Test Mock Data Mode
1. Toggle to Demo Mode
2. Verify mock data displays correctly
3. Toggle back to Live Data
4. Verify real data loads (or fallback to mock if backend down)

#### Test Role-Based Visibility
1. Log in as **Viewer**
   - Should see "Viewer Mode" banner
   - No budget information visible
   - Limited analytics
2. Log in as **Contributor**
   - See only assigned tasks
   - See projects they're part of
3. Log in as **Owner**
   - See everything

### Automated Testing

```typescript
// Test mock data generation
import { generateMockProjects } from '@/lib/mockData';

test('generates correct number of projects', () => {
  const projects = generateMockProjects(5, 'user-123', 'org-456');
  expect(projects).toHaveLength(5);
  expect(projects[0].owner_id).toBe('user-123');
  expect(projects[0].organization_id).toBe('org-456');
});

// Test permission filtering
import { PermissionService } from '@/services/permissions';

test('filters projects for viewer', () => {
  const projects = [...allProjects];
  const filtered = PermissionService.filter_projects_for_user(
    projects,
    { role: 'Viewer' }
  );
  // Verify budget info is hidden
  expect(filtered[0].budget).toBeUndefined();
});
```

## Performance Considerations

### Caching
- User context cached in React state
- Mock data config stored in localStorage
- API responses can be cached with SWR or React Query

### Lazy Loading
- Dashboard data loads after user authentication
- Components render progressively
- Skeleton loaders for better UX

### Optimization
- Memoize expensive calculations with `useMemo`
- Debounce data mode toggles
- Batch API requests where possible

## Security

### Authentication
- All API requests include Bearer token
- User context validated on every request
- Supabase handles session management

### Authorization
- Role-based access control enforced server-side
- Frontend permissions are UI hints only
- Backend must validate all actions

### Data Privacy
- Sensitive data masked based on role
- Viewers don't see financial information
- Budget details hidden from non-owners

## Future Enhancements

### Phase 2
- [ ] Real-time updates with WebSockets
- [ ] Custom dashboard layouts
- [ ] Exportable reports (PDF, Excel)
- [ ] Advanced filtering and sorting
- [ ] Bookmark favorite projects

### Phase 3
- [ ] Mobile app with same personalization
- [ ] Notification preferences
- [ ] Custom AI insight rules
- [ ] Team collaboration features
- [ ] Activity timeline

## Troubleshooting

### Issue: User data not loading
**Solution**: Check Supabase connection and authentication state

### Issue: Mock data not persisting
**Solution**: Verify localStorage is enabled in browser

### Issue: Backend API errors
**Solution**: Check CORS settings and API_BASE_URL

### Issue: Role permissions not working
**Solution**: Verify user metadata in Supabase includes 'role' field

## Summary

This implementation provides:

✅ **User-specific data display** - Show only relevant information per user
✅ **Mock data fallback** - Demo mode for testing and presentations
✅ **Role-based visibility** - Different views for Owner/Admin/Contributor/Viewer
✅ **Personalized insights** - AI recommendations tailored to each user
✅ **Graceful error handling** - Automatic fallback if backend unavailable
✅ **Easy data mode toggle** - Switch between live and demo with one click
✅ **Comprehensive documentation** - Complete guide for users and developers

## Files Modified/Created

### Created
- `frontend/src/lib/mockData.ts` - Mock data generator
- `backend/app/schemas/project.py` - Project schemas
- `backend/app/services/permissions.py` - Permission service
- `USER_PERSONALIZATION_IMPLEMENTATION.md` - This documentation

### Modified
- `frontend/src/app/dashboard/projects/page.tsx` - Main dashboard
- `frontend/src/hooks/useUserContext.ts` - User context hook
- `frontend/src/lib/api/projects.ts` - API client

## Contact

For questions or issues with this implementation, please contact the Engunity AI development team.

---

**Last Updated**: 2025-01-10
**Version**: 1.0.0
**Author**: Claude (Anthropic AI)
