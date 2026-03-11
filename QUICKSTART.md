# Quick Start Guide

Get the LLM Message Workflow System running in 5 minutes!

## ⚡ Fastest Path (Just Want to See It Work)

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/llm-message-workflow.git
cd llm-message-workflow
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment

1. Copy the example environment file:
   ```bash
   # On macOS/Linux:
   cp .env.example .env
   
   # On Windows (PowerShell):
   Copy-Item .env.example .env
   ```

2. Open the `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```
   Get your API key from: https://platform.openai.com/api-keys

### Step 4: Start the Server
```bash
npm start
```

You should see:
```
✅ Server running on http://localhost:3000
📧 Email watcher initialized (start via dashboard)
```

### Step 5: Open the Dashboard

Open your browser and go to: **http://localhost:3000**

### Step 6: Run Your First Workflow

Click the **"Run Workflow"** button on the dashboard.

This will:
- Process 5 sample messages from `data/inputs.json`
- Show real-time processing steps
- Save results to `output/results.json`

**That's it! You're running!** 🎉

---

## 🎯 What Just Happened?

The system processed 5 customer support messages through this pipeline:

```
Message → Classification → Enrichment → Routing → Escalation → Output
```

View the results:
- **In the dashboard**: Click "View Results" button
- **In the file**: Open `output/results.json`

Each result includes:
- Message category (Bug, Billing, Feature Request, etc.)
- Priority level (Low, Medium, High)
- Routing destination (Engineering, Billing, Product team)
- Escalation flag (if urgent)
- Extracted entities (amounts, dates, invoice numbers, etc.)

---

## 📧 Optional: Enable Email Processing

Want to see the system automatically process emails? Follow these steps:

### 1. Install MailHog (Test Email Server)

**Windows:**
```powershell
.\install-mailhog.ps1
```

**macOS:**
```bash
brew install mailhog
```

**Linux:**
```bash
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
chmod +x MailHog_linux_amd64
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
```

### 2. Start MailHog

**Windows:**
```powershell
& "$env:USERPROFILE\mailhog\mailhog.exe"
```

**macOS/Linux:**
```bash
mailhog
```

Leave this running. It will show:
```
[HTTP] Binding to address: 0.0.0.0:8025
[SMTP] Binding to address: 0.0.0.0:1025
```

### 3. Start Email Watcher

1. Make sure your application is still running (`npm start`)
2. Open the dashboard: http://localhost:3000
3. Click the **"Start Email Watcher"** button

You'll see: ✅ Email Watcher Active

### 4. Send a Test Email

**Option A: Use MailHog Web UI**
1. Open http://localhost:8025
2. You can view any emails (none yet)

**Option B: Configure an Email Client**
Configure Outlook, Thunderbird, or any email client:
- **SMTP Server**: localhost
- **Port**: 1025
- **No authentication needed**

**Option C: Use a Simple Script**

Create a file `send-test-email.ps1`:
```powershell
$smtp = New-Object Net.Mail.SmtpClient("localhost", 1025)
$msg = New-Object Net.Mail.MailMessage
$msg.From = "customer@example.com"
$msg.To.Add("support@yourcompany.com")
$msg.Subject = "Urgent: Production database is down!"
$msg.Body = "Our production database stopped responding 10 minutes ago. Multiple customers are reporting errors. This is affecting invoice #INV-2024-8765. Please help immediately!"
$smtp.Send($msg)
Write-Host "Test email sent!"
```

Run it:
```powershell
.\send-test-email.ps1
```

### 5. Watch the Magic!

- Check the dashboard - you'll see real-time processing steps
- View results in `output/results.json`
- The email is automatically classified, enriched, routed, and escalated!

---

## 📊 Optional: Enable Google Sheets Export

Want results automatically saved to Google Sheets? 

See the detailed guide: **[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)**

It takes about 5 minutes to set up.

---

## 🎮 Dashboard Controls

The web dashboard at http://localhost:3000 has these controls:

| Button | What It Does |
|--------|--------------|
| **Run Workflow** | Process all messages in `data/inputs.json` |
| **View Results** | Display processed results in a table |
| **Start Email Watcher** | Begin monitoring MailHog for new emails |
| **Stop Email Watcher** | Stop monitoring emails |

---

## 🧪 Testing Different Message Types

Edit `data/inputs.json` to test different scenarios:

### Example: Billing Issue
```json
{
  "id": "test_billing_001",
  "content": "I was charged twice for invoice #INV-2024-1234. Please refund $299.99 to my account.",
  "timestamp": "2026-03-11T10:00:00Z",
  "channel": "email",
  "source": "Email"
}
```

### Example: Bug Report
```json
{
  "id": "test_bug_001",
  "content": "The login button shows error code ERR-AUTH-500 when I try to sign in. This happened today at 2pm.",
  "timestamp": "2026-03-11T14:00:00Z",
  "channel": "email",
  "source": "Email"
}
```

### Example: Feature Request
```json
{
  "id": "test_feature_001",
  "content": "It would be great if you could add dark mode to the dashboard. Many users have requested this.",
  "timestamp": "2026-03-11T11:00:00Z",
  "channel": "chat",
  "source": "Chat"
}
```

Then run the workflow again to see how the system handles different message types!

---

## 🔧 Common Issues

### "OpenAI API key not configured"
➡️ Add your API key to the `.env` file and restart the server

### "Port 3000 already in use"
➡️ Change `PORT=3001` in `.env` file, or stop other apps using port 3000

### Dashboard shows "Cannot connect"
➡️ Make sure `npm start` is running and shows "Server running on..."

### Email watcher won't start
➡️ Make sure MailHog is running (http://localhost:8025 should work)

### Google Sheets not working
➡️ See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for setup

---

## 📚 Next Steps

Once you're comfortable with the basics:

1. **Read [README.md](README.md)** - Complete documentation
2. **Check [ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the system design
3. **Review [PROMPT_DOCUMENTATION.md](PROMPT_DOCUMENTATION.md)** - Learn about the AI prompts
4. **Try the API** - Use `curl` or Postman to send messages programmatically

---

## 🎯 API Quick Reference

Process a single message:
```bash
curl -X POST http://localhost:3000/process \
  -H "Content-Type: application/json" \
  -d '{"id":"test","content":"Your message here","timestamp":"2026-03-11T10:00:00Z","channel":"email"}'
```

Run batch workflow:
```bash
curl -X POST http://localhost:3000/workflow/run
```

Get results:
```bash
curl http://localhost:3000/workflow/results
```

---

## ✅ You're All Set!

You now have a working AI-powered message triage system. Explore the features, test different messages, and check out the other documentation files to learn more!

Need help? Check the [Troubleshooting section in README.md](README.md#-troubleshooting)
