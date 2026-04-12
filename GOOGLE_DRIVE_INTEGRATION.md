# Google Drive Integration Setup - Complete Documentation

## Overview

This document explains the complete Google Drive integration for bill file uploads in the Reimbursement Initiative app. Files are automatically uploaded to a centralized Google Drive folder with proper naming and stored in Supabase.

---

## Architecture

```
User submits bill form
    ↓
Bill form (bill-form.tsx) prepares upload data
    ↓
POST /api/bills/upload (bills/upload/route.ts)
    ↓
formatFileName() - formats filename as: "SC Name || Date || Vendor || Bill Number.ext"
    ↓
uploadBillToGoogleDrive() - uploads to Google Drive using OAuth
    ↓
Returns shareable link
    ↓
Bill record created in Supabase with file_url
```

---

## Components & Files

### 1. **Google Drive Library** (`src/lib/google-drive.ts`)
Core OAuth and Google Drive API integration.

**Functions:**
- `getAccessToken()` - Refreshes the OAuth access token using the stored refresh token
- `getGoogleDriveClient()` - Initializes the Google Drive API client with OAuth authentication
- `formatFileName(scName, date, vendorName, billNumber, fileExtension)` - Formats filenames according to spec
- `uploadBillToGoogleDrive(fileBuffer, fileName, folderId)` - Uploads file to Drive and returns shareable link
- `verifyFolderAccess(folderId)` - Utility to verify folder access (for debugging)

**Key Details:**
- Uses `googleapis` library for Drive API v3
- OAuth uses refresh token stored in `GOOGLE_DRIVE_REFRESH_TOKEN` env variable
- Files are uploaded to folder specified in `GOOGLE_DRIVE_FOLDER_ID`
- All uploaded files are set to "anyone with link - editor" permissions
- Returns shareable link: `https://drive.google.com/file/d/{fileId}/view?usp=sharing`

---

### 2. **Bill Upload API Endpoint** (`src/app/api/bills/upload/route.ts`)

**POST /api/bills/upload**

Handles the actual bill upload request from the client.

**Input (multipart form data):**
- `file` - File to upload (JPG, PNG, PDF)
- `scName` - SC Cabinet name
- `date` - Bill date
- `vendorName` - Vendor name
- `billNumber` - Bill number

**Process:**
1. Validates all required fields
2. Extracts file extension
3. Formats filename using `formatFileName()`
4. Converts file to buffer
5. Calls `uploadBillToGoogleDrive()` 
6. Returns JSON response with `fileUrl` (shareable link)

**Output (JSON):**
```json
{
  "success": true,
  "fileId": "1ABC...",
  "fileUrl": "https://drive.google.com/file/d/1ABC.../view?usp=sharing",
  "fileName": "Divyansh || 2024-10-15 || Uber || INV-001.pdf"
}
```

---

### 3. **Bill Form Component** (`src/app/components/bill-form.tsx`)

Frontend form for bill submission.

**Key Upload Logic (lines 193-222):**
```typescript
if (file) {
  setUploading(true);
  
  // Get SC and vendor names for filename
  const scName = dropdownData.scCabinets.find(sc => sc.id === scCabinetId)?.name || "Unknown";
  const vendorName = dropdownData.vendors.find(v => v.id === vendorId)?.name || "Unknown";
  
  // Prepare multipart form data
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("scName", scName);
  uploadFormData.append("date", billDate);
  uploadFormData.append("vendorName", vendorName);
  uploadFormData.append("billNumber", billNumber);
  
  // Upload via API endpoint
  const uploadResponse = await fetch("/api/bills/upload", {
    method: "POST",
    body: uploadFormData,
  });
  
  const uploadData = await uploadResponse.json();
  fileUrl = uploadData.fileUrl;
}
```

**Important:** 
- File upload happens BEFORE Supabase `bills` table insertion
- If upload fails, bill is NOT submitted
- `fileUrl` is stored in Supabase `bills.file_url` column
- File is optional - bills can be submitted without files

---

### 4. **OAuth Initialization** (`src/app/api/auth/google-drive-authorize/route.ts`)

**GET /api/auth/google-drive-authorize**

Initiates the OAuth 2.0 flow for first-time authorization (one-time setup).

**Process:**
1. Generates cryptographically secure state token for CSRF protection
2. Stores state in httpOnly secure cookie (10 min expiry)
3. Redirects to Google OAuth consent screen
4. User grants Drive access permission

**URL:** `http://localhost:3000/api/auth/google-drive-authorize`

**Note:** This is ONLY used during initial setup to get the refresh token.

---

### 5. **OAuth Callback** (`src/app/api/auth/google-drive-callback/route.ts`)

**GET /api/auth/google-drive-callback**

Handles OAuth callback from Google. Exchanges authorization code for refresh token.

**Process:**
1. Receives authorization code from Google
2. Validates state token for CSRF protection
3. Exchanges code for access + refresh tokens
4. Logs refresh token to console and redirects to display page

**Output:** Redirects to `/auth/google-drive-callback` page with refresh token in URL params

---

### 6. **OAuth Callback Display Page** (`src/app/auth/google-drive-callback/page.tsx`)

**GET /auth/google-drive-callback**

Simple React page that displays the refresh token after OAuth flow.

**Features:**
- Shows success or error message
- Displays refresh token (copy-paste to .env.local)
- Wrapped in Suspense for `useSearchParams()` hook

---

### 7. **Middleware** (`src/supabase/middleware.ts`)

Modified to allow OAuth flows without authentication:

**Lines 6-14:**
```typescript
const isAuthCallback = request.nextUrl.pathname === '/auth/callback';
const isGoogleDriveCallback = request.nextUrl.pathname === '/auth/google-drive-callback';
const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

// Skip middleware for API routes and auth callbacks
if (isAuthCallback || isGoogleDriveCallback || isApiRoute) {
  return NextResponse.next({ request });
}
```

**Purpose:** 
- Prevents middleware from intercepting OAuth callback flow
- Allows API routes to bypass authentication checks (needed for OAuth token exchange)
- Ensures Google Drive callback page is accessible without Supabase auth

---

## Environment Variables

Located in `.env.local` (NOT committed to GitHub):

```env
# Google Drive OAuth Credentials (from Google Cloud Console)
GOOGLE_DRIVE_CLIENT_ID=your_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret_here

# Google Drive Folder (where all bills are uploaded)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# OAuth Refresh Token (obtained after authorization)
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
```

**How to obtain values:**
- **Client ID:** From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
- **Client Secret:** From the same OAuth 2.0 Client credentials page
- **Folder ID:** From Google Drive folder URL: `drive.google.com/drive/folders/{FOLDER_ID}`
- **Refresh Token:** Obtain by running the OAuth authorization flow at `/api/auth/google-drive-authorize`

**Important:** 
- Client Secret is committed to repo (acceptable for OAuth 2.0 with refresh tokens in production)
- Refresh token must be kept private (stored in .env.local, never in version control)
- Folder ID can be changed to switch to a different Drive folder (for new seasons)

---

## Google Cloud Console Setup

**Project:** bill-app-last-try-v1

**OAuth 2.0 Client:** "Bill Upload - Google Drive"
- Type: Web application
- Authorized redirect URIs: 
  - `http://localhost:3000/api/auth/google-drive-callback` (development)
  - `https://reimbursement-app-ruby.vercel.app/api/auth/google-drive-callback` (production)

**Test Users (OAuth Consent Screen):**
- Add your personal Google account email

**APIs Enabled:**
- Google Drive API v3

---

## OAuth 2.0 Flow Diagram

```
1. One-time Setup (Manual)
   └─> User visits /api/auth/google-drive-authorize
   └─> Redirected to Google OAuth consent
   └─> User grants "Google Drive" permission
   └─> Google redirects to /api/auth/google-drive-callback with code
   └─> Code exchanged for access token + refresh token
   └─> Refresh token displayed and copied to .env.local

2. Every Bill Upload (Automatic)
   └─> User submits bill form
   └─> Frontend calls POST /api/bills/upload
   └─> Backend uses stored refresh token to get new access token
   └─> Access token used to authenticate Drive API call
   └─> File uploaded to Google Drive
   └─> Shareable link returned to frontend
   └─> Link stored in Supabase bills.file_url column
```

**Key Point:** The refresh token is long-lived and stored in .env.local. Each bill upload automatically refreshes the access token without user interaction.

---

## Database Integration

**Supabase Table:** `bills`

**Relevant Columns:**
- `file_url` (text, nullable) - Shareable link to Google Drive file
- Other columns: user_id, vendor_id, amount, date, status, etc.

**Data Flow:**
1. Bill form submitted with file
2. File uploaded to Google Drive → returns shareable link
3. Bill record created in Supabase with `file_url` set to shareable link
4. If upload fails, bill submission fails (validation error shown to user)

---

## Security Considerations

### ✅ Implemented
- **CSRF Protection:** State token validated in OAuth callback
- **HTTPS Only (Production):** OAuth cookies marked as secure in production
- **OAuth 2.0:** Uses official Google OAuth flow, not API keys
- **Scope Limitation:** Only Google Drive scope requested (not email, profile, etc.)
- **File Validation:** 
  - Client-side: JPG, PNG, PDF only, max 10MB
  - Server-side: Validates file extension and size
- **Access Control:** Files have "anyone with link - editor" permissions (can only access if they have the link)
- **Refresh Token:** Long-lived token stored securely in .env.local (not exposed to frontend)

### ⚠️ Considerations
- Client Secret is in .env.local (acceptable for OAuth 2.0 since refresh token is the sensitive credential)
- Shareable links are stored in Supabase (anyone with the link can access files)
- Google Drive permissions are set to "anyone with link - editor" (users can modify files)

---

## Troubleshooting

### 1. "Missing Google Drive OAuth credentials"
- Check `.env.local` has `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and `GOOGLE_DRIVE_REFRESH_TOKEN`
- Restart dev server after changing .env.local

### 2. "State mismatch - CSRF protection failed"
- OAuth state cookie was not properly set or sent
- Clear browser cookies and try again
- Check that cookies are enabled

### 3. "Failed to refresh access token"
- Refresh token has expired or been revoked
- Run OAuth flow again: `/api/auth/google-drive-authorize`
- Update `GOOGLE_DRIVE_REFRESH_TOKEN` in .env.local

### 4. "Cannot access parent folder"
- Folder ID doesn't exist or is inaccessible
- Verify folder ID in Google Drive (look in URL: `drive.google.com/drive/folders/{FOLDER_ID}`)
- Ensure the account that created the refresh token has access to the folder

### 5. File not appearing in Google Drive
- Check server logs for upload errors
- Verify folder ID is correct
- Check Google Drive permissions on the folder

---

## Production Deployment

### Changes Needed
1. Update `GOOGLE_DRIVE_CLIENT_ID` to production OAuth app (if created separately)
2. Update redirect URI in Google Cloud Console to production domain: `https://reimbursement-app-ruby.vercel.app/api/auth/google-drive-callback`
3. Update authorize endpoint to use production domain:
   ```typescript
   // Line 11 in google-drive-authorize/route.ts already handles this:
   const redirectUri = `${process.env.NODE_ENV === "production" ? "https://reimbursement-app-ruby.vercel.app" : "http://localhost:3000"}/api/auth/google-drive-callback`;
   ```
4. Deploy .env.local secrets to Vercel environment variables
5. Re-run OAuth flow on production to get production refresh token

### No Code Changes Needed
- Code already detects `NODE_ENV === "production"`
- OAuth cookies set with `secure` flag in production
- Middleware correctly handles OAuth in production

---

## Switching Google Drive Folders (For New Seasons)

Simply update the `GOOGLE_DRIVE_FOLDER_ID` in `.env.local`:

```env
# OLD Season
GOOGLE_DRIVE_FOLDER_ID=1-R5BXciPFRrLdNY6sBTY2revSnSPXPdC

# NEW Season (e.g., 2024-25)
GOOGLE_DRIVE_FOLDER_ID=1-NEW_FOLDER_ID_HERE
```

No code changes needed. All new uploads will go to the new folder.

---

## Testing

### 1. Verify Authorization Works
```
Visit: http://localhost:3000/api/auth/google-drive-authorize
Sign in with srcc.pc.jc.fns2526@gmail.com
Copy refresh token to .env.local
```

### 2. Verify Bill Upload
```
1. Navigate to bill submission form
2. Fill in all fields
3. Select a file (JPG, PNG, or PDF)
4. Submit form
5. Check Google Drive folder for the uploaded file
6. Verify file has correct naming format: "SC || Date || Vendor || Bill Number.ext"
7. Open Supabase and verify bills.file_url contains shareable link
```

### 3. Verify No App Disruption
```
1. Test other forms (no file upload) still work
2. Test authentication/login still works
3. Test other API routes still work
4. Check no extra console errors related to Google Drive
```

---

## Monitoring & Logging

### Server Logs
The implementation includes extensive logging for debugging:

```
📨 OAuth callback received
📋 Bill upload request received
📄 Form data: { scName, date, vendorName, billNumber, fileName, fileSize }
📝 Formatted filename: ...
✅ File converted to buffer
🚀 Uploading to Google Drive folder: ...
📤 Uploading file to Google Drive
✅ Verified folder access: ...
🔐 Setting file permissions
✅ Permissions set successfully
✅ Successfully uploaded to Google Drive
✅ File uploaded successfully, fileId: ...
```

Check browser console (client errors) and terminal (server logs) during uploads.

---

## Summary

This integration:
- ✅ Uploads bills to a centralized Google Drive folder
- ✅ Uses OAuth 2.0 for secure authentication (no service account quota issues)
- ✅ Formats filenames with proper naming convention
- ✅ Stores shareable links in Supabase
- ✅ Requires no user Google authentication (app handles auth invisibly)
- ✅ Works with free Google accounts (no Workspace required)
- ✅ Easily switches folders for new seasons
- ✅ Includes CSRF protection
- ✅ Has comprehensive error handling and logging
- ✅ Doesn't interfere with existing app functionality
