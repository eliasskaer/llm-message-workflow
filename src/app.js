/**
 * Main Application
 * Express server with workflow orchestration
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const { classifyMessage } = require('./classifier');
const { enrichMessage } = require('./enricher');
const { routeMessage } = require('./router');
const { checkEscalation } = require('./escalation');
const { writeResultsToSheet } = require('./googleSheets');
const EmailWatcher = require('./emailWatcher');

const app = express();
const PORT = process.env.PORT || 3000;

// Store recent processing activity for real-time UI updates
const processingActivity = [];
const MAX_ACTIVITY_ITEMS = 50;

function addActivity(activity) {
  processingActivity.unshift({
    ...activity,
    timestamp: new Date().toISOString()
  });
  // Keep only recent items
  if (processingActivity.length > MAX_ACTIVITY_ITEMS) {
    processingActivity.length = MAX_ACTIVITY_ITEMS;
  }
}

// Initialize email watcher
const emailWatcher = new EmailWatcher({
  pollingInterval: 10000 // Check every 10 seconds
});

// Handle new email messages
emailWatcher.on('newMessage', async (message) => {
  console.log(`\n🤖 Auto-processing email: ${message.id}`);
  
  addActivity({
    type: 'email_received',
    messageId: message.id,
    message: `📨 New email received from ${message.from || 'unknown'}`,
    details: message.subject
  });
  
  try {
    const result = await processMessage(message, true); // Pass true for activity tracking
    
    // Save to results file
    const outputPath = path.join(__dirname, '../output/results.json');
    let results = [];
    try {
      const data = await fs.readFile(outputPath, 'utf-8');
      results = JSON.parse(data);
    } catch (e) {
      // File doesn't exist yet
    }
    results.push(result);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    // Update Google Sheets with all results
    try {
      await writeResultsToSheet(results);
      console.log(`✅ Email processed: ${result.category} → ${result.destinationQueue}`);
      console.log(`📊 Google Sheets updated successfully`);
    } catch (sheetsError) {
      console.error(`✅ Email processed: ${result.category} → ${result.destinationQueue}`);
      console.error(`❌ Google Sheets Error: ${sheetsError.message}`);
      console.error(`   Make sure the service account has edit access to the sheet`);
    }
  } catch (error) {
    console.error(`❌ Error processing email: ${error.message}`);
  }
});

// Middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Process a single message through the workflow
 * @param {Object} message - The message object to process
 * @param {Boolean} trackActivity - Whether to track activity for real-time UI updates
 * @returns {Promise<Object>} Processed result
 */
async function processMessage(message, trackActivity = false) {
  console.log(`📨 Processing: ${message.id}`);

  try {
    if (trackActivity) {
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'classify',
        message: `🔍 Classifying message...`,
        details: message.content?.substring(0, 50) + '...'
      });
    }
    
    // Step 1: Classify the message
    const classification = await classifyMessage(message.content);
    
    if (trackActivity) {
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'classify_complete',
        message: `✅ Classification: ${classification.category}`,
        details: `Priority: ${classification.priority}, Confidence: ${classification.confidence}`
      });
      
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'enrich',
        message: `🔬 Enriching message...`,
        details: 'Extracting metadata and analyzing content'
      });
    }

    // Step 2: Enrich with additional metadata
    const enrichment = await enrichMessage(message.content, classification);
    
    if (trackActivity) {
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'enrich_complete',
        message: `✅ Enrichment complete`,
        details: enrichment.coreIssue
      });
      
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'route',
        message: `🚦 Routing message...`,
        details: `Based on category: ${classification.category}`
      });
    }

    // Step 3: Route to appropriate queue
    const processedMessage = {
      ...message,
      classification,
      enrichment
    };
    const routing = routeMessage(processedMessage);
    
    if (trackActivity) {
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'route_complete',
        message: `✅ Routed to: ${routing.destinationQueue}`,
        details: `Team: ${routing.team}, Priority: ${classification.priority}`
      });
      
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'escalation_check',
        message: `⚠️ Checking escalation criteria...`,
        details: 'Analyzing priority and content'
      });
    }

    // Step 4: Check for escalation
    const escalation = checkEscalation({
      message,
      classification,
      enrichment,
      routing
    });

    // Determine final destination queue (escalated or original)
    const finalDestination = escalation.shouldEscalate 
      ? escalation.escalationQueue 
      : routing.destinationQueue;
    
    if (trackActivity) {
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'escalation_complete',
        message: escalation.shouldEscalate ? `🚨 Escalation: ${finalDestination}` : `✅ No escalation needed`,
        details: escalation.shouldEscalate ? escalation.reasons.join(', ') : `Proceeding to ${finalDestination}`
      });
      
      addActivity({
        type: 'processing_step',
        messageId: message.id,
        step: 'save_results',
        message: `💾 Saving results...`,
        details: 'Writing to file and Google Sheets'
      });
    }

    // Compile final result with all required fields
    const result = {
      // Original request data
      requestId: message.id,
      source: message.source,
      receivedAt: message.timestamp,
      
      // Classification results
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      classificationReasoning: classification.reasoning,
      
      // Enrichment results
      coreIssue: enrichment.coreIssue,
      extractedIdentifiers: enrichment.extractedIdentifiers,
      urgencySignals: enrichment.urgencySignals,
      
      // Routing decision
      destinationQueue: finalDestination,
      team: routing.team,
      sla: routing.sla,
      routedAt: routing.routedAt,
      
      // Escalation status
      escalationFlag: escalation.shouldEscalate,
      escalationReasons: escalation.reasons,
      requiresHumanReview: escalation.requiresHumanReview,
      
      // Human-readable summary for receiving team
      summary: enrichment.humanReadableSummary,
      
      // Metadata
      processedAt: new Date().toISOString(),
      status: 'completed'
    };

    console.log(`✅ ${message.id} → ${finalDestination} ${escalation.shouldEscalate ? '🚨' : ''}`);
    
    if (trackActivity) {
      addActivity({
        type: 'processing_complete',
        messageId: message.id,
        step: 'complete',
        message: `✅ Processing complete: ${message.id}`,
        details: `${finalDestination} ${escalation.shouldEscalate ? '🚨 ESCALATED' : ''}`,
        result: {
          category: classification.category,
          priority: classification.priority,
          destination: finalDestination,
          escalated: escalation.shouldEscalate
        }
      });
    }

    return result;
  } catch (error) {
    console.error(`\n❌ Error processing message ${message.id}:`, error.message);
    
    if (trackActivity) {
      addActivity({
        type: 'error',
        messageId: message.id,
        message: `❌ Error processing message`,
        details: error.message
      });
    }
    
    return {
      message,
      status: 'failed',
      error: error.message,
      processedAt: new Date().toISOString()
    };
  }
}

/**
 * Endpoint to process a single message
 */
app.post('/process', async (req, res) => {
  try {
    const message = req.body;
    
    if (!message || !message.content) {
      return res.status(400).json({ 
        error: 'Message content is required',
        hint: 'Make sure to send JSON with "content" field'
      });
    }

    const result = await processMessage(message);
    res.json(result);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get input messages
 */
app.get('/workflow/messages', async (req, res) => {
  try {
    const inputPath = path.join(__dirname, '../data/inputs.json');
    const inputData = await fs.readFile(inputPath, 'utf-8');
    const messages = JSON.parse(inputData);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load messages', details: error.message });
  }
});

/**
 * Endpoint to trigger workflow on all input messages
 */
app.post('/workflow/run', async (req, res) => {
  try {
    console.log('\n🚀 Running workflow...');

    // Read input messages
    const inputPath = path.join(__dirname, '../data/inputs.json');
    const inputData = await fs.readFile(inputPath, 'utf-8');
    const messages = JSON.parse(inputData);

    console.log(`📥 Processing ${messages.length} messages...\n`);

    // Process all messages
    const results = [];
    for (const message of messages) {
      const result = await processMessage(message);
      results.push(result);
    }

    // Save results to JSON file
    const outputPath = path.join(__dirname, '../output/results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

    // Save results to Google Sheets (if configured)
    await writeResultsToSheet(results);

    const successful = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const escalated = results.filter(r => r.escalationFlag).length;
    
    console.log(`\n✨ Complete! ✅ ${successful} processed | 🚨 ${escalated} escalated | ❌ ${failed} failed\n`);

    // Get Google Sheets URL
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

    res.json({
      success: true,
      totalMessages: messages.length,
      sheetsUrl: sheetsUrl,
      results: results.map(r => ({
        id: r.requestId || r.message?.id,
        status: r.status,
        category: r.category,
        escalated: r.escalationFlag
      }))
    });
  } catch (error) {
    console.error('❌ Workflow error:', error.message);
    res.status(500).json({ error: 'Workflow execution failed', details: error.message });
  }
});

/**
 * Get workflow results
 */
app.get('/workflow/results', async (req, res) => {
  try {
    const outputPath = path.join(__dirname, '../output/results.json');
    const data = await fs.readFile(outputPath, 'utf-8');
    const results = JSON.parse(data);
    
    res.json({
      totalResults: results.length,
      results
    });
  } catch (error) {
    res.status(404).json({ error: 'No results found' });
  }
});

/**
 * Clear all results
 */
app.post('/workflow/clear', async (req, res) => {
  try {
    const outputPath = path.join(__dirname, '../output/results.json');
    await fs.unlink(outputPath);
    console.log('🗑️  Results cleared');
    res.json({ success: true, message: 'All results cleared' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, that's fine
      res.json({ success: true, message: 'No results to clear' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * Start email watcher
 */
app.post('/email/start', async (req, res) => {
  try {
    await emailWatcher.start();
    res.json({
      success: true,
      message: 'Email watcher started',
      status: emailWatcher.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop email watcher
 */
app.post('/email/stop', (req, res) => {
  try {
    emailWatcher.stop();
    res.json({
      success: true,
      message: 'Email watcher stopped',
      status: emailWatcher.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get email watcher status
 */
app.get('/email/status', (req, res) => {
  res.json({
    status: emailWatcher.getStatus(),
    mailhogUrl: 'http://localhost:8025'
  });
});

/**
 * Get recent processing activity for real-time UI updates
 */
app.get('/processing/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    activity: processingActivity.slice(0, limit)
  });
});

/**
 * Clear processing activity
 */
app.post('/processing/clear', (req, res) => {
  processingActivity.length = 0;
  res.json({ success: true, message: 'Activity cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 LLM Message Workflow System`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`\n🎨 Web Dashboard: http://localhost:${PORT}`);
  console.log(`\n📌 Available endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   POST /process             - Process single message`);
  console.log(`   POST /workflow/run        - Run workflow on all inputs`);
  console.log(`   GET  /workflow/results    - Get workflow results`);
  console.log(`   POST /workflow/clear      - Clear all results`);
  console.log(`   GET  /workflow/messages   - Get input messages`);
  console.log(`   POST /email/start         - Start email watcher`);
  console.log(`   POST /email/stop          - Stop email watcher`);
  console.log(`   GET  /email/status        - Get email watcher status`);
  console.log(`   GET  /processing/activity - Get processing activity feed`);
  console.log(`   POST /processing/clear    - Clear processing activity`);
  console.log(`\n💡 Open http://localhost:${PORT} in your browser to see the dashboard!`);
  console.log(`📧 Mailhog UI: http://localhost:8025`);
  console.log(`${'='.repeat(70)}\n`);
});

module.exports = app;
