/**
 * Escalation Module
 * Determines if a message requires escalation based on specific criteria
 */

require('dotenv').config();

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7;

/**
 * Check if a processed message requires escalation
 * @param {Object} processedMessage - The fully processed message
 * @returns {Object} Escalation decision
 */
function checkEscalation(processedMessage) {
  const { message, classification, enrichment, routing } = processedMessage;
  
  console.log(`\n⚠️  Checking escalation criteria...`);

  const escalationReasons = [];
  let shouldEscalate = false;

  // Criterion 1: Low confidence classification (< 70%)
  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    escalationReasons.push(`Low classification confidence: ${classification.confidence.toFixed(2)} (threshold: ${CONFIDENCE_THRESHOLD})`);
    shouldEscalate = true;
  }

  // Criterion 2: Check for critical keywords in message
  const messageContent = message.content.toLowerCase();
  const criticalKeywords = {
    'outage': 'Service outage mentioned',
    'down': 'Service down mentioned',
    'down for all users': 'Multiple users affected',
    'all users affected': 'Multiple users affected',
    'multiple users': 'Multiple users affected',
    'not loading': 'System not loading',
    'stopped working': 'System stopped working',
    'stopped loading': 'System stopped loading'
  };

  for (const [keyword, reason] of Object.entries(criticalKeywords)) {
    if (messageContent.includes(keyword)) {
      escalationReasons.push(reason);
      shouldEscalate = true;
      break; // Avoid duplicate reasons
    }
  }

  // Criterion 3: Billing error > $500
  if (classification.category === 'Billing Issue' && enrichment.extractedIdentifiers?.amounts) {
    for (const amount of enrichment.extractedIdentifiers.amounts) {
      // Extract numeric value from amount string (e.g., "$1,240" -> 1240)
      const numericAmount = parseFloat(amount.replace(/[$,]/g, ''));
      if (!isNaN(numericAmount) && numericAmount > 500) {
        escalationReasons.push(`Billing discrepancy exceeds $500: ${amount}`);
        shouldEscalate = true;
        break;
      }
    }
  }

  // Criterion 4: Incident/Outage category always escalates
  if (classification.category === 'Incident/Outage') {
    escalationReasons.push('Classified as Incident/Outage - requires immediate attention');
    shouldEscalate = true;
  }

  // Criterion 5: High priority items
  if (classification.priority === 'High') {
    // High priority doesn't automatically escalate, but we note it
    console.log(`   Note: High priority classification`);
  }

  const escalationDecision = {
    shouldEscalate,
    escalationQueue: shouldEscalate ? 'Escalation-HumanReview' : null,
    reasons: escalationReasons,
    escalatedAt: shouldEscalate ? new Date().toISOString() : null,
    requiresHumanReview: shouldEscalate,
    originalQueue: routing.destinationQueue
  };

  if (shouldEscalate) {
    console.log(`🚨 ESCALATION REQUIRED - Flagged for human review`);
    console.log(`   Reasons:`);
    escalationReasons.forEach(reason => console.log(`   - ${reason}`));
    console.log(`   Original destination: ${routing.destinationQueue}`);
    console.log(`   Escalated to: Escalation-HumanReview`);
  } else {
    console.log(`✅ No escalation needed - proceeding to ${routing.destinationQueue}`);
  }

  return escalationDecision;
}

module.exports = { checkEscalation };
