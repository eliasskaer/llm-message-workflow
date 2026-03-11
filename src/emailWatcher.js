/**
 * Email Watcher Module
 * Monitors email inbox and triggers workflow for new messages
 */

const { MailParser } = require('mailparser');
const EventEmitter = require('events');

class EmailWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pollingInterval = options.pollingInterval || 10000; // 10 seconds
    this.isRunning = false;
    this.processedEmails = new Set();
  }

  /**
   * Start watching for emails
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Email watcher already running');
      return;
    }

    this.isRunning = true;
    console.log('📧 Email watcher started - monitoring for new messages...');
    
    // Mark all existing emails as processed (don't process old emails)
    await this.markExistingEmailsAsProcessed();
    
    // Start polling
    this.pollingTimer = setInterval(() => {
      this.checkForNewEmails();
    }, this.pollingInterval);
  }

  /**
   * Mark all existing emails in Mailhog as already processed
   * This prevents reprocessing old emails when the watcher starts
   */
  async markExistingEmailsAsProcessed() {
    try {
      const response = await fetch('http://localhost:8025/api/v2/messages?limit=100');
      
      if (!response.ok) {
        console.log('⚠️  Mailhog not available - will process emails when it becomes available');
        return;
      }

      const data = await response.json();
      const messages = data.items || [];

      // Add all existing email IDs to processed set
      for (const email of messages) {
        this.processedEmails.add(email.ID);
      }
      
      console.log(`📋 Marked ${messages.length} existing emails as already processed`);
      console.log('✓ Only NEW emails will be processed from now on');
    } catch (error) {
      console.log('⚠️  Could not check for existing emails:', error.message);
    }
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
    console.log('📧 Email watcher stopped');
  }

  /**
   * Check for new emails (Mailhog integration)
   */
  async checkForNewEmails() {
    try {
      // Fetch emails from Mailhog API
      const response = await fetch('http://localhost:8025/api/v2/messages?limit=50');
      
      if (!response.ok) {
        console.log('⚠️  Mailhog not available - make sure it\'s running on port 8025');
        return;
      }

      const data = await response.json();
      const messages = data.items || [];

      // Process new emails
      for (const email of messages) {
        if (!this.processedEmails.has(email.ID)) {
          this.processedEmails.add(email.ID);
          await this.processEmail(email);
        }
      }
    } catch (error) {
      console.error('❌ Error checking emails:', error.message);
    }
  }

  /**
   * Process individual email
   */
  async processEmail(email) {
    try {
      // Extract email details
      const from = email.From?.Mailbox ? `${email.From.Mailbox}@${email.From.Domain}` : 'unknown';
      const subject = email.Content?.Headers?.Subject?.[0] || 'No Subject';
      const body = email.Content?.Body || '';
      
      // Parse HTML if present
      let textContent = body;
      if (email.MIME?.Parts) {
        const textPart = email.MIME.Parts.find(p => p.Headers['Content-Type']?.[0]?.includes('text/plain'));
        if (textPart) {
          textContent = Buffer.from(textPart.Body, 'base64').toString('utf-8');
        }
      }

      // Create message object
      const message = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: 'Email',
        content: `Subject: ${subject}\n\n${textContent.trim()}`,
        timestamp: new Date(email.Created).toISOString(),
        metadata: {
          from,
          subject,
          emailId: email.ID
        }
      };

      console.log(`\n📨 New email received from ${from}`);
      console.log(`   Subject: ${subject}`);
      
      // Emit event for processing
      this.emit('newMessage', message);

    } catch (error) {
      console.error('❌ Error processing email:', error.message);
    }
  }

  /**
   * Get watcher status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedCount: this.processedEmails.size,
      pollingInterval: this.pollingInterval
    };
  }
}

module.exports = EmailWatcher;
