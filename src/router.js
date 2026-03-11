/**
 * Router Module
 * Routes classified messages to appropriate queues/handlers
 */

/**
 * Route a processed message to the appropriate destination
 * @param {Object} processedMessage - The fully processed message
 * @returns {Object} Routing decision
 */
function routeMessage(processedMessage) {
  const { classification, enrichment } = processedMessage;
  
  console.log(`\n🚦 Routing message based on category: ${classification.category}`);

  // Define routing rules - Map categories to destination queues
  const routingRules = {
    'Bug Report': {
      destinationQueue: 'Engineering',
      team: 'Engineering Team',
      priority: classification.priority,
      sla: getPrioritySLA(classification.priority)
    },
    'Feature Request': {
      destinationQueue: 'Product',
      team: 'Product Team',
      priority: classification.priority,
      sla: getPrioritySLA(classification.priority)
    },
    'Billing Issue': {
      destinationQueue: 'Billing',
      team: 'Billing Department',
      priority: classification.priority,
      sla: getPrioritySLA(classification.priority)
    },
    'Technical Question': {
      destinationQueue: 'IT/Security',
      team: 'IT/Security Team',
      priority: classification.priority,
      sla: getPrioritySLA(classification.priority)
    },
    'Incident/Outage': {
      destinationQueue: 'Engineering',
      team: 'Engineering Team - Priority Response',
      priority: 'High', // Always high priority for incidents
      sla: '15 minutes', // Immediate response required
      urgent: true
    }
  };

  // Get routing decision - use fallback queue for low confidence
  let route;
  if (classification.confidence < 0.7) {
    console.log(`⚠️  Low confidence (${classification.confidence}) - routing to fallback queue`);
    route = {
      destinationQueue: 'Escalation-HumanReview',
      team: 'Triage Team',
      priority: 'Medium',
      sla: '2 hours',
      reason: 'Low confidence classification - requires human review'
    };
  } else {
    route = routingRules[classification.category] || {
      destinationQueue: 'Escalation-HumanReview',
      team: 'Triage Team',
      priority: 'Medium',
      sla: '2 hours',
      reason: 'Unknown category - fallback to manual review'
    };
  }

  console.log(`✅ Routed to: ${route.destinationQueue} (priority: ${route.priority})`);

  return {
    ...route,
    routedAt: new Date().toISOString(),
    classification: classification.category,
    confidence: classification.confidence
  };
}

/**
 * Get SLA based on priority level
 * @param {string} priority - The priority level
 * @returns {string} SLA timeframe
 */
function getPrioritySLA(priority) {
  const slaMap = {
    'High': '1 hour',
    'Medium': '4 hours',
    'Low': '24 hours'
  };
  return slaMap[priority] || '4 hours';
}

module.exports = { routeMessage };
