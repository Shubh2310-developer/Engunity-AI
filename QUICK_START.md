# 🚀 Quick Start Guide - Projects Dashboard

## **Status: ✅ LIVE & RUNNING**

Your personalized projects dashboard is now live at:
**http://localhost:3000/dashboard/projects**

---

## 📱 **Access Your Dashboard**

### **Option 1: With User Login** (Recommended)
1. Open: http://localhost:3000
2. Log in with your Supabase credentials
3. Navigate to Projects section
4. See your personalized dashboard with user-specific data

### **Option 2: Demo Mode** (For Testing)
1. Open: http://localhost:3000/dashboard/projects
2. If not logged in, you'll see a loading state
3. The system will automatically use mock data
4. Click "Switch to Demo" to explicitly enable demo mode

---

## 🎯 **Key Features Available Now**

### **1. User Profile Card** ⭐
Located at the top of the page:
- Your name and avatar
- Role badge (Owner/Admin/Contributor/Viewer)
- Quick stats (6 metrics)
- Data mode indicator
- Toggle button

### **2. Personalized AI Insights** 🤖
- Tailored recommendations for you
- Workload analysis
- Task priorities
- Risk warnings

### **3. Upcoming Deadlines** ⏰
- Your tasks with due dates
- Priority indicators
- Days until due
- Click to view details

### **4. Data Mode Toggle** 🔄
- **Live Data** (Green) - Real backend data
- **Demo Mode** (Orange) - Mock/test data
- One-click switching
- Persists between sessions

---

## 🔧 **Quick Actions**

### **Switch Data Modes**
```
1. Look for data mode indicator in profile card
2. Click "Switch to Demo" or "Switch to Live"
3. Page reloads with new data mode
```

### **View by Role**
Different roles see different information:
- **Owner**: Everything (full access)
- **Admin**: All projects, limited settings
- **Contributor**: Assigned tasks only
- **Viewer**: Read-only + banner

### **Check Server Status**
```bash
# Server should be running
# Check terminal for: ✓ Compiled /dashboard/projects
```

---

## 💡 **Understanding Visual Indicators**

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green pulse | Live backend data |
| 🟠 Orange pulse | Demo/mock data |
| 🟣 Purple badge | Owner role |
| 🔵 Blue badge | Admin role |
| 🟢 Green badge | Contributor role |
| ⚪ Gray badge | Viewer role |

---

## 📊 **Dashboard Sections**

### **Top Section**
- User profile with avatar
- Role and organization
- Quick stats overview
- Data mode controls

### **Insights Section**
- AI-generated recommendations
- Personal task analysis
- Performance opportunities
- Risk alerts

### **Deadlines Section**
- Your upcoming tasks
- Due dates and priorities
- Days remaining
- Status indicators

### **Main Dashboard**
- Project overview
- Repositories, datasets, experiments
- Team collaboration
- AI-powered analytics

---

## 🔐 **Login & Authentication**

### **If Not Logged In**
You'll see:
- "Authentication Required" message
- Link to log in
- Or automatic mock data fallback

### **After Login**
System automatically:
- Loads your user profile
- Fetches your projects
- Generates personalized insights
- Shows upcoming deadlines

---

## 🎨 **Customization Options**

### **Available in Profile Card**
1. **View Projects** - Click to filter by status
2. **Switch Data Mode** - Toggle live/demo
3. **Quick Stats** - See your metrics at a glance

### **Available in Settings** (Future)
- Custom dashboard layout
- Notification preferences
- Data sync settings
- Export options

---

## 🐛 **Troubleshooting**

### **Issue: Page shows loading forever**
**Solution**:
```javascript
// Open browser console (F12)
// Clear localStorage
localStorage.clear();
location.reload();
```

### **Issue: "Not logged in" message**
**Solution**:
- Log in through Supabase authentication
- Or use demo mode for testing

### **Issue: No data showing**
**Solution**:
- Click "Switch to Demo" for mock data
- Or ensure backend is running on port 8000

### **Issue: Wrong user data**
**Solution**:
- Log out and log back in
- Check Supabase user metadata
- Refresh the page

---

## 📱 **Mobile Access**

The dashboard is fully responsive:
- ✅ Works on phones and tablets
- ✅ Touch-friendly interactions
- ✅ Optimized layouts
- ✅ Fast loading

---

## 🎓 **For Developers**

### **Toggle Mock Data in Code**
```typescript
import { toggleMockDataMode } from '@/lib/mockData';
const isMock = toggleMockDataMode();
```

### **Generate Mock Data**
```typescript
import { generateMockDashboard } from '@/lib/mockData';
const dashboard = generateMockDashboard(userContext);
```

### **Check User Permissions**
```typescript
import { usePermission } from '@/hooks/useUserContext';
const canEdit = usePermission('projects', 'write');
```

---

## 📚 **More Information**

- **Full Documentation**: [USER_PERSONALIZATION_IMPLEMENTATION.md](USER_PERSONALIZATION_IMPLEMENTATION.md)
- **Implementation Details**: [IMPLEMENTATION_SUCCESS.md](IMPLEMENTATION_SUCCESS.md)
- **Backend Integration**: See backend/app/schemas/project.py

---

## ✅ **What's Working**

- ✅ User authentication integration
- ✅ Personalized dashboards
- ✅ Role-based visibility
- ✅ Mock data fallback
- ✅ Data mode toggle
- ✅ AI insights
- ✅ Upcoming deadlines
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design

---

## 🎉 **Enjoy Your Dashboard!**

Your personalized projects dashboard is ready to use.

**Access it now**: http://localhost:3000/dashboard/projects

---

*Need help? Check the full documentation or contact support.*
