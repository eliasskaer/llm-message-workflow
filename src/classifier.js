/**
 * Classifier Module
 * Uses LLM to classify incoming messages into categories
 */

require('dotenv').config();
const OpenAI = require('openai');
const classificationPrompt = require('../prompts/classificationPrompt');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Classify a message using LLM
 * @param {string} message - The message content to classify
 * @returns {Promise<Object>} Classification result
 */
async function classifyMessage(message) {
  try {
    console.log(`\n🔍 Classifying message: "${message.substring(0, 50)}..."`);

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a precise message classification assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: classificationPrompt(message)
        }
      ]
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    const classification = JSON.parse(responseText);
    
    console.log(`✅ Classification: ${classification.category} (confidence: ${classification.confidence})`);
    
    return classification;
  } catch (error) {
    console.error('❌ Classification error:', error.message);
    
    // Return fallback classification
    return {
      category: 'GENERAL_INQUIRY',
      urgency: 'MEDIUM',
      confidence: 0.5,
      reasoning: 'Fallback classification due to error',
      error: error.message
    };
  }
}

module.exports = { classifyMessage };
