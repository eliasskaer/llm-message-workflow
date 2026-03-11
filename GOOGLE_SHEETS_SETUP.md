# Google Sheets Setup Guide

**⏱️ Time Required:** 5-10 minutes  
**Difficulty:** Beginner-friendly  
**Optional:** Yes - results still save to `output/results.json` if you skip this

---

## Why Set This Up?

Without Google Sheets:
- ✅ Results save to `output/results.json`
- ❌ Harder to view and analyze results
- ❌ No shareable link

With Google Sheets:
- ✅ Results save to both JSON and Google Sheets
- ✅ Beautiful table format
- ✅ Easy to share with team
- ✅ Sortable, filterable, searchable

---

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. ✏️ Name it: **"AI Message Workflow Results"** (or any name you prefer)
4. 📝 Rename **Sheet1** to **"Results"** (important - must be exact)
   - Right-click on the Sheet1 tab → Rename → Type "Results"
5. 📋 Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1abc123XYZ-this_is_the_sheet_id/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       Copy this part only!
   ```
   
**✅ Keep this tab open - you'll need it in Step 3**

---

## Step 2: Set Up Google Cloud Service Account

### What is a Service Account?
It's like creating a "robot user" that your application uses to access Google Sheets automatically. Don't worry, it's secure and easy to set up!

### 2.1 - Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account (same one you used for the sheet)

### 2.2 - Create a Project

**If you already have a project:**
- Select it from the dropdown at the top
- Skip to step 2.3

**If you need to create a new project:**
1. Click the project dropdown at the top (next to "Google Cloud")
2. Click **New Project**
3. Name: `llm-workflow` (or any name)
4. Click **Create**
5. Wait 10 seconds for it to be created, then select it from the dropdown

### 2.3 - Enable Google Sheets API

1. In the left sidebar, click **APIs & Services** → **Library**
   - Or search "APIs" in the search bar at top
2. Search for: **"Google Sheets API"**
3. Click **Google Sheets API** (should be first result)
4. Click the blue **Enable** button
5. ✅ Wait for it to enable (takes 5 seconds)

### 2.4 - Create Service Account

1. In the left sidebar, click **IAM & Admin** → **Service Accounts**
   - If you don't see it, use the ☰ menu icon to expand the sidebar
2. Click **+ CREATE SERVICE ACCOUNT** (at the top)
3. Fill in:
   - **Service account name:** `message-workflow-bot`
   - **Service account ID:** (auto-fills, leave it)
   - **Description:** Optional (e.g., "Bot for writing workflow results to Google Sheets")
4. Click **CREATE AND CONTINUE**
5. ⚠️ **Important:** Skip the permissions section
   - Just click **CONTINUE** (don't grant any roles)
6. Click **DONE**

### 2.5 - Generate JSON Key

1. You'll see your new service account in the list
2. Click on the **email address** of the service account you just created
   - Looks like: `message-workflow-bot@your-project.iam.gserviceaccount.com`
3. Click the **KEYS** tab (at the top)
4. Click **ADD KEY** → **Create new key**
5. Choose **JSON** (should be selected by default)
6. Click **CREATE**
7. 💾 A JSON file will download automatically
   - **Don't lose this file!** You'll need it in Step 4

### 2.6 - Copy Service Account Email

1. Still on the service account page, copy the email address:
   ```
   message-workflow-bot@your-project.iam.gserviceaccount.com
   ```
2. **✅ Keep this email - you need it for Step 3!**

---

## Step 3: Share Your Google Sheet with the Bot

This is THE most important step! Without this, you'll get permission errors.

1. Go back to your Google Sheet (from Step 1)
2. Click the blue **Share** button (top right corner)
3. In the "Add people and groups" field:
   - Paste the **service account email** from Step 2.6
   - It looks like: `message-workflow-bot@your-project.iam.gserviceaccount.com`
4. Make sure permission is set to **Editor** (not Viewer!)
5. ⚠️ **Important:** Uncheck "Notify people"
   - It's a bot, not a person - no need to send an email
6. Click **Share** or **Send**

**✅ Your sheet is now accessible to your application!**

---

## Step 4: Configure Environment Variables

### 4.1 - Prepare the JSON Key

1. Open the JSON file you downloaded in Step 2.5
   - Use Notepad, VS Code, or any text editor
2. The file looks like this:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-123",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "message-workflow-bot@your-project.iam.gserviceaccount.com",
     ...
   }
   ```
3. **Select ALL the text** in the file (Ctrl+A)
4. **Copy it** (Ctrl+C)

### 4.2 - Update .env File

1. Open the `.env` file in your project root folder
2. Find these two lines:
   ```env
   GOOGLE_SHEET_ID=
   GOOGLE_SERVICE_ACCOUNT_JSON=
   ```
3. Update them:
   ```env
   GOOGLE_SHEET_ID=your_sheet_id_from_step_1
   GOOGLE_SERVICE_ACCOUNT_JSON=paste_entire_json_here
   ```

**⚠️ CRITICAL FORMATTING RULES:**
- The JSON must be **on ONE line** (no line breaks!)
- Don't add any quotes around the JSON
- Don't modify the JSON content
- It should look like: `GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":...}`

**Example:**
```env
GOOGLE_SHEET_ID=1abc123XYZ_your_actual_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"llm-workflow-123","private_key_id":"abc123xyz","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...your key here...\n-----END PRIVATE KEY-----\n","client_email":"message-workflow-bot@llm-workflow-123.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/message-workflow-bot%40llm-workflow-123.iam.gserviceaccount.com"}
```

4. **Save the file** (Ctrl+S)

---

## Step 5: Test the Integration

### 5.1 - Restart the Server

If your server is already running:
1. Press **Ctrl+C** to stop it
2. Restart it:
   ```bash
   npm start
   ```

You should see in the logs:
```
✅ Google Sheets configured
   Sheet ID: 1abc123XYZ...
```

**If you see this error instead:**
```
❌ Google Sheets configuration error: ...
```
→ Go to [Troubleshooting](#troubleshooting) below

### 5.2 - Run the Workflow

**Option A: Using the Dashboard**
1. Open http://localhost:3000
2. Click **"Run Workflow"** button
3. Wait for processing to complete

**Option B: Using API**
```bash
curl -X POST http://localhost:3000/workflow/run
```

**Option C: Using Postman**
- Method: POST
- URL: http://localhost:3000/workflow/run
- Click Send

### 5.3 - Verify Results

**Check the Console Output:**
```
✅ Processed 5 messages successfully
📊 Google Sheets updated: 5 rows written
   View at: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID
```

**Check Your Google Sheet:**
1. Go back to your Google Sheet
2. Refresh the page (F5)
3. You should see a table with headers and 5 rows of data!

**Expected Sheet Format:**

| Request ID | Source | Category | Priority | Confidence | Destination Queue | Escalated | Summary | Entities | Processing Time |
|---|---|---|---|---|---|---|---|---|---|
| request_001 | Email | Bug Report | High | 0.95 | Engineering | NO | Customer reports... | error_code: ERR-403 | 2.3s |

**✅ Success! Google Sheets integration is working!**

---

## Troubleshooting

### ❌ Error: "The caller does not have permission"

**Cause:** The service account doesn't have access to your sheet

**Fix:**
1. Go to your Google Sheet
2. Click **Share** (top right)
3. Add the service account email: `message-workflow-bot@your-project.iam.gserviceaccount.com`
4. Make sure permission is **Editor** (not Viewer!)
5. Click **Share**
6. Restart your server and try again

---

### ❌ Error: "Unable to parse range: Results!A1"

**Cause:** Your sheet tab is not named "Results"

**Fix:**
1. Go to your Google Sheet
2. Right-click the sheet tab at the bottom
3. Click **Rename**
4. Type exactly: `Results` (capital R, case-sensitive)
5. Press Enter
6. Try again

---

### ❌ Error: "Requested entity was not found"

**Cause:** Wrong Sheet ID in `.env`

**Fix:**
1. Go to your Google Sheet
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1abc123XYZ789/edit
                                           ^^^^^^^^^^^^^^
                                           This part only!
   ```
3. Update `GOOGLE_SHEET_ID` in `.env` file
4. Restart server and try again

---

### ❌ Error: "Could not parse service account JSON"

**Cause:** JSON formatting is broken in `.env`

**Common mistakes:**
- ❌ JSON split across multiple lines
- ❌ Extra quotes around the JSON
- ❌ Modified or truncated JSON

**Fix:**
1. Open the downloaded JSON file again
2. Select ALL text (Ctrl+A)
3. Copy (Ctrl+C)
4. Open `.env` file
5. Replace the `GOOGLE_SERVICE_ACCOUNT_JSON=` line with:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON=paste_here_as_one_line
   ```
6. The entire JSON should be on ONE line
7. Save and restart server

**Correct format:**
```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...entire JSON...}
```

**Wrong format:**
```env
GOOGLE_SERVICE_ACCOUNT_JSON={
  "type": "service_account",
  ...
}
```

---

### ⚠️ Warning: "Google Sheets not configured - results saved to file only"

**Cause:** This is NOT an error - it just means Google Sheets is not set up

**When you see this:**
- Results still save to `output/results.json` ✅
- Everything else works fine ✅
- Google Sheets integration is optional

**To enable it:**
- Follow steps 1-5 above

---

### ❌ Error: "API key not valid" or "API has not been used"

**Cause:** Google Sheets API not enabled correctly

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown
3. Go to **APIs & Services** → **Library**
4. Search: "Google Sheets API"
5. Click on it
6. Make sure it says **"API enabled"**
7. If not, click **Enable**
8. Wait 30 seconds, then try again

---

### 🤔 Still Having Issues?

**Check these common problems:**

1. **Wrong Google account?**
   - Make sure you're using the same Google account for:
     - Creating the sheet
     - Google Cloud Console
     - Sharing the sheet

2. **Typo in service account email?**
   - Copy-paste the email from the Google Cloud Console
   - Don't type it manually

3. **JSON key expired?**
   - Service account keys don't expire by default
   - If you deleted and recreated the service account, generate a new key

4. **Network/firewall blocking Google APIs?**
   - Make sure your computer can access: `https://sheets.googleapis.com`
   - Test: Open that URL in your browser (should see response, not a blocked page)

---

## What Data Gets Saved to Google Sheets?

For each processed message, the sheet saves:

| Column | Description | Example |
|--------|-------------|---------|
| Request ID | Unique message identifier | request_001 |
| Source | Where message came from | Email, Chat, Web Form |
| Category | Message classification | Bug Report, Billing, Feature Request |
| Priority | Urgency level | Low, Medium, High |
| Confidence | AI confidence score (0-1) | 0.95 |
| Destination Queue | Routing target | Engineering, Billing, Product |
| Escalated | Whether escalation triggered | YES/NO |
| Summary | Brief 2-3 sentence summary | Customer reports 403 error... |
| Entities | Extracted data | error_code: ERR-403, amount: $299 |
| Processing Time | How long it took | 2.3 seconds |

---

## Privacy & Security Notes

**Your credentials are safe:**
- ✅ The JSON key file only grants access to Google Sheets (not Gmail, Drive, etc.)
- ✅ The service account can only access sheets you explicitly share with it
- ✅ The `.env` file should be in `.gitignore` (never committed to Git)
- ✅ You can revoke access anytime by deleting the service account

**Best practices:**
- 🔒 Don't share the JSON key file with anyone
- 🔒 Don't commit `.env` to version control (it's already in `.gitignore`)
- 🔒 If the key is compromised, delete the service account and create a new one
- 🔒 Use this for development/testing - production should use more secure methods

---

## Alternative: Skip Google Sheets Entirely

If you don't want to set up Google Sheets integration:

**Option 1: Leave it blank**
```env
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

**Option 2: Comment it out**
```env
# GOOGLE_SHEET_ID=
# GOOGLE_SERVICE_ACCOUNT_JSON=
```

**What happens:**
- ✅ Everything still works
- ✅ Results save to `output/results.json`
- ✅ Dashboard still shows results
- ✅ No errors or warnings
- ℹ️ You just won't have the Google Sheets view

---

## Need Help?

**Check these resources:**
- [Google Cloud Console](https://console.cloud.google.com/) - Manage your project
- [Google Sheets API Documentation](https://developers.google.com/sheets/api) - Official docs
- [README.md](README.md#-troubleshooting) - Main troubleshooting guide
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide

**Double-check your setup:**
1. ✅ Google Sheet created and "Results" tab exists
2. ✅ Google Sheets API enabled in Google Cloud
3. ✅ Service account created and JSON key downloaded
4. ✅ Service account email added as Editor on your sheet
5. ✅ Sheet ID copied correctly to `.env`
6. ✅ JSON key pasted correctly to `.env` (one line, no modifications)
7. ✅ Server restarted after updating `.env`

If all checkboxes are ✅ and it still doesn't work, check the console output for specific error messages and reference the troubleshooting section above.


3. **This is perfectly fine for the assessment!**
   - JSON file is sufficient to show your work
   - Google Sheets is a bonus, not required

---

## For Submission

If you include Google Sheets:

1. **Share the sheet** with the Valsoft reviewers (share link in your submission email)
2. Set permission to **Viewer** (not Editor)
3. They can see the results in real-time
4. This makes a great impression during demo!

**Share Link:**
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing
```

---

## Need Help?

- Google Sheets API docs: https://developers.google.com/sheets/api
- Service Account guide: https://cloud.google.com/iam/docs/service-accounts

If Google Sheets setup is taking too long, skip it! The JSON output is sufficient for the assessment.
