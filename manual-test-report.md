# 🧪 Manual Testing Report for Admin Functionality

## Test Environment
- **URL**: https://youtube.platformmakers.org
- **Admin Credentials**: 01034424668 / admin1234
- **Browser**: Chrome/Firefox (JavaScript-enabled)
- **Date**: Testing to be performed

## 🔍 Expected Behavior Based on Code Analysis

### **Step 1: Homepage Access**
- **Expected**: React app loads with loading screen, then shows main YouTube URL input interface
- **Look for**: 
  - "Loading Lilys.AI Clone..." message while JavaScript loads
  - Login button/link in navigation
  - Clean blue/purple gradient background

### **Step 2: Login Process**
- **Expected**: Login form with phone number and password fields
- **Form Elements**:
  - Phone number input with format validation (01XXXXXXXXX)
  - Password input with show/hide toggle
  - "Sign In" button
  - "Sign up" and "Forgot password" links

### **Step 3: Admin Dashboard Access**
- **After Login Expected**:
  - Redirect to `/dashboard`
  - Sidebar navigation with:
    - Dashboard
    - Upload  
    - History
    - Settings
    - **"시스템 프롬프트"** (Admin only!)
  - User avatar in top-right with role display

### **Step 4: Settings Page (/settings)**
- **Available Toggle Switches**:
  - ✅ **Email Notifications** (`emailNotifications`)
  - ✅ **Auto Save** (`autoSave`) 
  - Language dropdown (한국어/English)
- **Admin-Only Section**: "시스템 프롬프트 관리" card with "프롬프트 관리" button
- **Save Button**: "환경설정 저장" button

### **Step 5: System Prompts Page (/admin/prompts)**
- **Expected Features**:
  - Table showing all system prompts
  - "새 프롬프트 추가" button
  - Each prompt row has:
    - Order controls (up/down arrows)
    - Name and category
    - Toggle switch for Active/Inactive
    - Edit and Delete buttons
- **Prompt Categories**:
  - 요약 (Summary)
  - 핵심 포인트 (Key Points) 
  - 분석 (Analysis)
  - 번역 (Translation)
  - 사용자 정의 (Custom)

## 📋 Manual Test Checklist

### ✅ Phase 1: Access & Login
- [ ] Navigate to https://youtube.platformmakers.org
- [ ] Verify site loads with React app (not static page)
- [ ] Find and click login button/link
- [ ] Enter admin credentials: 01034424668 / admin1234
- [ ] Verify successful login and redirect

### ✅ Phase 2: Navigation & Sidebar
- [ ] Check if sidebar shows admin-specific "시스템 프롬프트" menu item
- [ ] Verify user role shows as "관리자" (Admin) in account info
- [ ] Test navigation to different pages (Dashboard, Upload, History)

### ✅ Phase 3: Settings Page Testing  
- [ ] Navigate to Settings page
- [ ] Find toggle switches for:
  - [ ] Email Notifications (이메일 알림 받기)
  - [ ] Auto Save (자동 저장)
- [ ] Toggle each switch ON/OFF
- [ ] Click "환경설정 저장" (Save Settings) button
- [ ] Verify success toast message appears
- [ ] Check if settings persist after page refresh

### ✅ Phase 4: System Prompts Testing
- [ ] Click "시스템 프롬프트" in sidebar OR navigate to /admin/prompts
- [ ] Verify admin prompts page loads with table
- [ ] Test "새 프롬프트 추가" (Add New Prompt) button
- [ ] Try toggling active/inactive switches on existing prompts
- [ ] Test edit button on existing prompts
- [ ] Verify prompt categories dropdown works
- [ ] Test save functionality

### ✅ Phase 5: API Integration Testing
- [ ] Check browser Developer Tools → Network tab during operations
- [ ] Verify API calls are made to:
  - `/api/auth/me` (profile loading)
  - `/api/auth/preferences` (settings save)
  - `/api/prompts/admin` (prompts loading)
  - `/api/prompts/:id` (prompt updates)

## 🚨 Potential Issues to Watch For

### Backend API Issues
- **404 Errors**: API endpoints may not be implemented yet
- **Authentication Failures**: JWT token issues
- **Database Errors**: PostgreSQL connection issues

### Frontend Issues  
- **JavaScript Errors**: Check browser console for React errors
- **Route Issues**: 404s on admin routes if not properly configured
- **State Issues**: Settings not persisting, user role not loading

### Common Problems
1. **Loading Screen Stuck**: JavaScript not loading properly
2. **Login Fails**: Backend authentication API not working
3. **Admin Menu Missing**: User role not set to 'admin' in database
4. **Settings Don't Save**: API endpoints returning errors
5. **Prompts Page Empty**: Database not seeded with prompts

## 📊 Success Criteria

### ✅ **Functional Requirements Met:**
1. Admin can login successfully with provided credentials
2. "시스템 프롬프트" menu appears for admin users
3. Settings toggle switches work and save properly  
4. System prompts page loads and shows prompt management interface
5. All CRUD operations on prompts work correctly

### ✅ **User Experience Quality:**
1. No JavaScript errors in console
2. Smooth navigation between pages
3. Responsive design works on different screen sizes
4. Toast messages provide clear feedback
5. Loading states show during API calls

## 🛠️ If Issues Are Found

### Debug Steps:
1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Monitor API call responses
3. **Verify Database**: Ensure admin user exists with correct role
4. **Test Backend**: Direct API testing with Postman/curl
5. **Check Server Logs**: Backend server console for errors

### Quick Fixes:
1. **Clear Browser Cache**: Force reload to get latest JavaScript
2. **Check Server Status**: Ensure backend is running on correct port
3. **Database Seeding**: Run database migrations and seeders
4. **API Keys**: Verify Gemini/OpenAI keys are configured
5. **Environment Variables**: Check .env configuration

---

## 📸 Screenshots to Capture
1. Homepage loading state
2. Login form
3. Dashboard with admin sidebar
4. Settings page with toggle switches
5. System prompts management page
6. Any error states encountered

---

*This manual test plan is generated based on code analysis of the React application structure and expected admin functionality.*