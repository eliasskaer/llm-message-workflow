# LLM Message Workflow System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991.svg)](https://openai.com/)

An intelligent message classification and routing system powered by LLM (Large Language Models) that automatically categorizes, enriches, routes, and escalates customer messages.

> **🚀 New to this project?** Start with the **[QUICKSTART.md](QUICKSTART.md)** guide to get running in 5 minutes!

## 📖 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Endpoints](#-api-endpoints)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **🤖 LLM-Powered Classification** - Automatically categorizes messages using GPT-4
- **🔬 Smart Enrichment** - Extracts entities, sentiment, and key information
- **🚦 Intelligent Routing** - Routes messages to appropriate teams/queues
- **⚠️ Auto-Escalation** - Detects urgent issues and escalates automatically
- **📧 Email Integration** - Monitors email inbox and auto-processes new messages (via MailHog)
- **🎨 Web Dashboard** - Real-time visualization of message processing
- **📊 Google Sheets Export** - Optional integration to save results to Google Sheets
- **🔄 Batch Processing** - Process multiple messages from JSON file
- **📡 REST API** - HTTP endpoints for integration with other systems

## 📁 Project Structure

```
├── src/
│   ├── app.js          # Express server + workflow orchestration
│   ├── classifier.js   # LLM classification module
│   ├── enricher.js     # LLM enrichment module
│   ├── router.js       # Routing logic
│   ├── escalation.js   # Escalation logic
│   ├── emailWatcher.js # Email monitoring module (MailHog integration)
│   └── googleSheets.js # Google Sheets integration
├── public/
│   ├── index.html      # Web dashboard UI
│   ├── app.js          # Dashboard JavaScript
│   └── styles.css      # Dashboard styling
├── data/
│   └── inputs.json     # Sample input messages
├── output/
│   └── results.json    # Workflow output results
├── prompts/
│   ├── classificationPrompt.js  # Classification prompt template
│   └── enrichmentPrompt.js      # Enrichment prompt template
├── .env                # Environment configuration
├── install-mailhog.ps1 # MailHog installation script (Windows)
└── package.json        # Project dependencies
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **OpenAI API key** (Required - get from https://platform.openai.com/api-keys)
- **MailHog** (Optional - for email integration testing)
- **Google Sheets** (Optional - for enhanced output storage)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/llm-message-workflow.git
cd llm-message-workflow
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and add your OpenAI API key:
     ```
     OPENAI_API_KEY=sk-your-actual-api-key-here
     ```
     Get your API key from: https://platform.openai.com/api-keys
   - **Optional:** Configure Google Sheets integration (see [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md))
   - Other settings can be left at defaults

### Running the Application

#### Quick Start (Basic Mode)

1. **Start the server**:
```bash
npm start
```

2. **Open the Web Dashboard**:
   - Navigate to `http://localhost:3000` in your browser
   - You'll see the interactive dashboard with controls to:
     - Run workflow on sample messages
     - View processing results in real-time
     - Start/stop email watcher

3. **Process sample messages**:
   - Click the **"Run Workflow"** button in the dashboard, OR
   - Use API: `POST http://localhost:3000/workflow/run`

#### Advanced Mode (With Email Integration)

To enable automatic email processing:

1. **Install MailHog** (test email server):
   ```powershell
   # Windows - Run in PowerShell:
   .\install-mailhog.ps1
   ```
   
   For macOS/Linux:
   ```bash
   # macOS with Homebrew:
   brew install mailhog
   
   # Linux:
   wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
   chmod +x MailHog_linux_amd64
   sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
   ```

2. **Start MailHog**:
   ```powershell
   # Windows:
   & "$env:USERPROFILE\mailhog\mailhog.exe"
   
   # macOS/Linux:
   mailhog
   ```
   
   MailHog will start:
   - **SMTP Server**: localhost:1025 (for sending emails)
   - **Web UI**: http://localhost:8025 (to view emails)

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Enable Email Watcher**:
   - Open the dashboard at `http://localhost:3000`
   - Click **"Start Email Watcher"** button
   - The system will now automatically process any emails sent to MailHog!

5. **Test it**:
   - Send a test email to MailHog (any address works, e.g., support@test.com)
   - Watch the dashboard for real-time processing
   - Check `output/results.json` for saved results

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Web Dashboard
```
GET /
```
Interactive web interface for monitoring and controlling the workflow system.

### Process Single Message
```
POST /process
Content-Type: application/json

{
  "id": "msg_001",
  "content": "Your message here",
  "timestamp": "2026-03-10T10:30:00Z",
  "channel": "email"
}
```
Processes a single message through the complete workflow and returns results immediately.

### Run Workflow on All Input Messages
```
POST /workflow/run
```

This will:
- Read all messages from `data/inputs.json`
- Process each message through the complete workflow
- Save results to `output/results.json`
- Save results to Google Sheets (if configured - see [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md))
- Return summary of processed messages

### Get Workflow Results
```
GET /workflow/results
```
Returns all processed messages from the current session.

### Email Watcher Control

**Start email monitoring:**
```
POST /email/start
```
Starts monitoring MailHog for new emails. Requires MailHog to be running on localhost:8025.

**Stop email monitoring:**
```
POST /email/stop
```
Stops the email watcher.

**Get email watcher status:**
```
GET /email/status
```
Returns current status of email watcher (running/stopped) and processed email count.

### Real-Time Activity Feed
```
GET /activity
```
Returns recent processing activity for dashboard updates (live feed of workflow steps).

## 🔄 Workflow Process

Each message goes through 4 stages:

1. **Classification** 📋
   - Categorizes message (TECHNICAL_SUPPORT, BILLING, SALES, COMPLAINT, GENERAL_INQUIRY)
   - Determines urgency level (LOW, MEDIUM, HIGH, CRITICAL)
   - Provides confidence score

2. **Enrichment** 🔬
   - Analyzes sentiment
   - Extracts entities (products, dates, amounts)
   - Identifies red flags
   - Suggests actions

3. **Routing** 🚦
   - Routes to appropriate team/queue
   - Sets priority level
   - Determines if auto-response needed

4. **Escalation** ⚠️
   - Checks escalation criteria
   - Determines escalation level (TIER_2, TIER_3, MANAGER)
   - Assigns to specialized agents if needed

## 📝 Sample Input

See `data/inputs.json` for example messages. You can add your own messages following this format:

```json
{
  "id": "unique_id",
  "content": "Message text",
  "timestamp": "ISO-8601 timestamp",
  "channel": "email|chat|phone|social_media"
}
```

## 🔧 Configuration

Edit `.env` to configure:

- **`OPENAI_API_KEY`** - Your OpenAI API key (REQUIRED)
- **`LLM_MODEL`** - Model to use (default: gpt-4)
- **`LLM_TEMPERATURE`** - Temperature for LLM (default: 0.3)
- **`PORT`** - Server port (default: 3000)
- **`CONFIDENCE_THRESHOLD`** - Minimum confidence for classification (default: 0.7)
- **`GOOGLE_SHEET_ID`** - Your Google Sheet ID (optional)
- **`GOOGLE_SERVICE_ACCOUNT_JSON`** - Service account credentials (optional)

## 📊 Output Format

Results are saved in `output/results.json` with complete details including:
- Original message (id, content, timestamp, source)
- Classification results (category, priority, confidence, reasoning)
- Enrichment metadata (sentiment, entities, core issue, red flags)
- Routing decision (destination queue, team, SLA)
- Escalation status (flag, level, reason, final queue)
- Processing timestamps

## 🎯 Usage Examples

### Example 1: Basic Workflow (No Email)

```bash
# 1. Start server
npm start

# 2. Open browser
# Navigate to: http://localhost:3000

# 3. Click "Run Workflow" button
# This processes all messages in data/inputs.json

# 4. View results
# Check output/results.json or click "View Results" in dashboard
```

### Example 2: Email Integration

```powershell
# 1. Start MailHog (in one terminal)
& "$env:USERPROFILE\mailhog\mailhog.exe"

# 2. Start application (in another terminal)
npm start

# 3. Open dashboard and start email watcher
# Navigate to: http://localhost:3000
# Click "Start Email Watcher"

# 4. Send test email (use any email client configured to use localhost:1025)
# Or use MailHog web UI: http://localhost:8025

# 5. Watch real-time processing in dashboard!
```

### Example 3: API Integration

```bash
# Process a single message via API
curl -X POST http://localhost:3000/process \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_001",
    "content": "Our billing system charged me twice for the same invoice #INV-2024-5678. Please refund $500.",
    "timestamp": "2026-03-11T10:00:00Z",
    "channel": "email"
  }'
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Problem: "Error: OpenAI API key not configured"
**Solution:** 
- Open the `.env` file
- Add your OpenAI API key: `OPENAI_API_KEY=sk-your-key-here`
- Restart the server

#### Problem: Email watcher says "Mailhog not available"
**Solution:**
- Make sure MailHog is running (see [QUICKSTART.md](QUICKSTART.md) for installation)
- Check MailHog is accessible at: http://localhost:8025
- Verify MailHog is listening on port 8025

#### Problem: Google Sheets integration not working
**Solution:**
- Verify `GOOGLE_SHEET_ID` is set in `.env`
- Verify `GOOGLE_SERVICE_ACCOUNT_JSON` is properly formatted (must be one line, no line breaks)
- Make sure the service account email has **Editor** access to your Google Sheet
- See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed setup instructions

#### Problem: "Cannot find module" errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Problem: Port 3000 already in use
**Solution:**
- Change the port in `.env`: `PORT=3001`
- Or stop the conflicting process:
  ```powershell
  # Windows - Find and kill process on port 3000
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

#### Problem: LLM responses are inconsistent
**Solution:**
- Try adjusting `LLM_TEMPERATURE` in `.env` (lower = more deterministic)
- Check prompt templates in `prompts/` directory
- Verify you're using GPT-4 model (set `LLM_MODEL=gpt-4` in `.env`)

#### Problem: Dashboard not loading
**Solution:**
- Clear browser cache and reload
- Check browser console for errors (F12)
- Verify server is running on correct port
- Try accessing directly: `http://localhost:3000`

## 📚 Additional Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and architecture details
- **[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)** - Complete Google Sheets setup guide
- **[PROMPT_DOCUMENTATION.md](PROMPT_DOCUMENTATION.md)** - LLM prompt engineering details
- **[SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md)** - Assessment verification checklist

## 🎓 How It Works

1. **Message Ingestion**: Messages arrive via API, email (MailHog), or batch file
2. **Classification**: GPT-4 analyzes the message and assigns category + priority
3. **Enrichment**: GPT-4 extracts entities, sentiment, and identifies red flags
4. **Routing**: Rule-based system routes to appropriate team/queue
5. **Escalation Check**: Automated rules determine if escalation is needed
6. **Output**: Results saved to JSON, Google Sheets, and displayed in real-time dashboard

## 🚀 Production Considerations

This is a demonstration project. For production use, consider:

- **Database**: Replace JSON file storage with PostgreSQL/MongoDB
- **Message Queue**: Use RabbitMQ or AWS SQS for async processing
- **Authentication**: Add API keys or OAuth for security
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Error Handling**: Add retry logic and dead letter queues
- **Monitoring**: Integrate with DataDog, New Relic, or similar
- **Scaling**: Deploy behind load balancer with multiple instances
- **Email**: Replace MailHog with real SMTP/IMAP integration (SendGrid, Mailgun, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🤝 Support

For issues or questions:
- Check the [documentation files](#-additional-documentation)
- Open an issue on GitHub
- Review the [troubleshooting section](#-troubleshooting)

## 🛠️ Development

**To modify prompts:**
- Edit `prompts/classificationPrompt.js` for classification logic
- Edit `prompts/enrichmentPrompt.js` for enrichment logic

**To adjust routing rules:**
- Edit `src/router.js`

**To modify escalation criteria:**
- Edit `src/escalation.js`

---

Made with ❤️ using Node.js and OpenAI GPT-4
