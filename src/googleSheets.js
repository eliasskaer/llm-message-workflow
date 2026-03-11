/**
 * Google Sheets Integration Module
 * Writes processed results to a Google Sheet for easy viewing
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs').promises;

/**
 * Initialize Google Sheets API client
 * @returns {Object} Sheets API instance
 */
function getGoogleSheetsClient() {
  // Use service account credentials if provided
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  }
  
  // Use API key if provided (read-only, but we need write access)
  if (process.env.GOOGLE_API_KEY) {
    const auth = new google.auth.GoogleAuth({
      apiKey: process.env.GOOGLE_API_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  }
  
  return null;
}

/**
 * Create or update the sheet header row
 * @param {Object} sheets - Google Sheets API client
 * @param {string} spreadsheetId - The spreadsheet ID
 */
async function createHeader(sheets, spreadsheetId) {
  const headerRow = [
    'Request ID',
    'Source',
    'Received At',
    'Category',
    'Priority',
    'Confidence',
    'Core Issue',
    'Destination Queue',
    'Team',
    'SLA',
    'Escalated',
    'Escalation Reasons',
    'Summary',
    'Processed At'
  ];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Results!A1:N1',
      valueInputOption: 'RAW',
      resource: {
        values: [headerRow]
      }
    });
    console.log('✅ Google Sheets header created');
  } catch (error) {
    console.error('❌ Error creating header:', error.message);
  }
}

/**
 * Write a single result to Google Sheets
 * @param {Object} result - The processed message result
 */
async function writeResultToSheet(result) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.log('⚠️  Google Sheets not configured - skipping sync');
    return false;
  }

  try {
    const row = [
      result.requestId,
      result.source,
      result.receivedAt,
      result.category,
      result.priority,
      result.confidence,
      result.coreIssue,
      result.destinationQueue,
      result.team,
      result.sla,
      result.escalationFlag ? 'YES' : 'NO',
      result.escalationReasons.join('; '),
      result.summary,
      result.processedAt
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Results!A2:N',
      valueInputOption: 'RAW',
      resource: {
        values: [row]
      }
    });

    console.log(`📊 Saved to Google Sheets: ${result.requestId}`);
    return true;
  } catch (error) {
    console.error('❌ Error writing to Google Sheets:', error.message);
    return false;
  }
}

/**
 * Write all results to Google Sheets (batch)
 * @param {Array} results - Array of processed message results
 */
async function writeResultsToSheet(results) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.log('⚠️  Google Sheets not configured - skipping sync');
    console.log('   Results saved to output/results.json only');
    return false;
  }

  try {
    console.log('\n📊 Writing results to Google Sheets...');

    // Create header row
    await createHeader(sheets, spreadsheetId);

    // Prepare data rows - handle both flat and nested structures
    const rows = results.map(result => {
      // Support both new flat structure and old nested structure
      const requestId = result.requestId || result.message?.id || 'N/A';
      const source = result.source || result.message?.channel || 'N/A';
      const receivedAt = result.receivedAt || result.message?.timestamp || '';
      const category = result.category || result.classification?.category || 'N/A';
      const priority = result.priority || result.routing?.priority || result.classification?.urgency || 'N/A';
      const confidence = result.confidence || result.classification?.confidence || 0;
      const coreIssue = result.coreIssue || result.enrichment?.intentSummary || '';
      const destinationQueue = result.destinationQueue || result.routing?.queue || 'N/A';
      const team = result.team || result.routing?.team || 'N/A';
      const sla = result.sla || result.routing?.sla || 'N/A';
      const escalationFlag = result.escalationFlag || result.escalation?.shouldEscalate || false;
      const escalationReasons = result.escalationReasons || result.escalation?.reasons || [];
      const summary = result.summary || result.enrichment?.intentSummary || result.message?.content || '';
      const processedAt = result.processedAt || '';

      return [
        requestId,
        source,
        receivedAt,
        category,
        priority,
        confidence,
        coreIssue,
        destinationQueue,
        team,
        sla,
        escalationFlag ? 'YES' : 'NO',
        Array.isArray(escalationReasons) ? escalationReasons.join('; ') : '',
        summary,
        processedAt
      ];
    });

    // Write all rows at once
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Results!A2:N${rows.length + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: rows
      }
    });

    console.log(`✅ Successfully wrote ${results.length} results to Google Sheets`);
    console.log(`   View: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    return true;
  } catch (error) {
    console.error('❌ Error writing to Google Sheets:', error.message);
    if (error.message.includes('Unable to parse range')) {
      console.error('   Make sure your Google Sheet has a tab named "Results"');
    } else if (error.message.includes('403')) {
      console.error('   Make sure the service account has edit access to the sheet');
    }
    console.error('   Full error:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

module.exports = {
  writeResultToSheet,
  writeResultsToSheet
};
