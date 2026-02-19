# SHADOW KYC - Full Feature Implementation Plan

## What Already Exists
- ✅ User/Tenant Login & Signup (with unique IDs)
- ✅ Session creation (6-digit code)
- ✅ Document upload gate (DocumentUpload.jsx)
- ✅ Live session: UserCamera.jsx (client) + TenantMonitor.jsx (tenant)
- ✅ Video upload analysis (tenant side)
- ✅ Profile modal
- ✅ Theme toggle (dark/light)

## What Needs to Be Built

### Phase 1: Backend API Extensions (main.py)
1. Session history store + endpoints
2. Support ticket store + endpoints
3. Notification store + endpoints
4. Application status store + endpoints
5. Tenant decision endpoint

### Phase 2: User Dashboard Features (Home.jsx - user role)
Currently user only has "Join Session". Need to add:
1. Start Live KYC Session (already exists)
2. Upload Documents link
3. Application Status Tracking
4. Raise Query / Support
5. Previous Session History
6. Notifications
7. Profile & Settings (already exists)

### Phase 3: Tenant Dashboard Features (Home.jsx - tenant role)
Currently tenant has "Create Session" + "Upload Video". Need to add:
1. Active Sessions panel
2. Pending Verifications
3. Document Review Panel
4. Verification History
5. Reports panel

### Phase 4: Tenant Live Session Enhancements (TenantMonitor.jsx)
1. Document Viewer Panel
2. 7-Layer Output as individual boxes (NO charts)
3. Overall Risk Summary Box
4. Suspicious Frame Evidence Display
5. Real-Time Monitoring Alerts
6. Final Decision System (Approve/Reject/Manual Review/Visit Branch)
7. AI Suggestion Panel

### Phase 5: User Session Cleanup (UserCamera.jsx)
1. Ensure NO AI outputs visible
2. Simple instructions only
3. Session End Screen
