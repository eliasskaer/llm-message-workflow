/**
 * Enrichment Prompt for LLM
 * Extracts additional metadata and insights from messages
 */

const enrichmentPrompt = (message, classification) => {
  return `You are a message enrichment assistant for ArcVault's support system. Analyze the following customer message and extract structured metadata.

Message: "${message}"
Classification: ${classification.category}
Priority: ${classification.priority}

Extract the following information:

1. Core Issue: Summarize the main problem or request in ONE clear sentence (max 20 words)

2. Extracted Identifiers: Find any mentioned:
   - Account IDs or usernames (e.g., arcvault.io/user/jsmith)
   - Invoice or transaction numbers (e.g., Invoice #8821)
   - Error codes or status codes (e.g., 403 error)
   - Dollar amounts (e.g., $1,240)
   - Dates or times (e.g., "last Tuesday", "2pm EST")

3. Urgency Signals: Keywords or phrases indicating urgency
   - Examples: "outage", "down", "all users affected", "immediately", "stopped working"

4. Human-Readable Summary: Write a 2-3 sentence summary suitable for the receiving team that includes:
   - What the customer needs
   - Any critical context or identifiers
   - Recommended next steps

Respond ONLY with a valid JSON object in this exact format:
{
  "coreIssue": "One sentence summary",
  "extractedIdentifiers": {
    "accountIds": [],
    "invoiceNumbers": [],
    "errorCodes": [],
    "amounts": [],
    "dates": []
  },
  "urgencySignals": [],
  "humanReadableSummary": "2-3 sentence summary for the team"
}`;
};

module.exports = enrichmentPrompt;
