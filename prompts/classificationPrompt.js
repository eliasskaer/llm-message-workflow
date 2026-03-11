/**
 * Classification Prompt for LLM
 * Categorizes incoming messages into predefined categories
 */

const classificationPrompt = (message) => {
  return `You are an AI classification system for ArcVault's customer support intake pipeline. Analyze the following message and classify it into ONE of these categories:

Categories:
- Bug Report: Technical issues, errors, login problems, system malfunctions, broken features
- Feature Request: Requests for new capabilities, enhancements, or improvements to existing features
- Billing Issue: Invoice discrepancies, payment problems, pricing questions, contract rate issues
- Technical Question: Questions about setup, configuration, integration, SSO, authentication, general how-to
- Incident/Outage: Service disruptions, downtime, dashboard not loading, widespread user impact

Additionally, assess the priority level (Low, Medium, High) based on:
- High: Service outages, security issues, multiple users affected, billing errors > $500
- Medium: Single-user bugs, urgent technical questions, moderate billing issues
- Low: Feature requests, general questions, minor issues

Provide a confidence score (0-1) indicating how certain you are about the classification.

Message to classify:
"${message}"

Respond ONLY with a valid JSON object in this exact format:
{
  "category": "CATEGORY_NAME",
  "priority": "PRIORITY_LEVEL",
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification"
}`;
};

module.exports = classificationPrompt;
