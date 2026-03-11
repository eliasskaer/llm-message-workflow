/**
 * Enricher Module
 * Uses LLM to extract additional metadata and insights from messages
 */

require('dotenv').config();
const OpenAI = require('openai');
const enrichmentPrompt = require('../prompts/enrichmentPrompt');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enrich a message with additional metadata
 * @param {string} message - The message content to enrich
 * @param {Object} classification - The classification result
 * @returns {Promise<Object>} Enrichment result
 */
async function enrichMessage(message, classification) {
  try {
    console.log(`\n🔬 Enriching message with additional metadata...`);

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a message enrichment assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: enrichmentPrompt(message, classification)
        }
      ]
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    const enrichment = JSON.parse(responseText);
    
    console.log(`✅ Enrichment complete. Sentiment: ${enrichment.sentiment}`);
    
    return enrichment;
  } catch (error) {
    console.error('❌ Enrichment error:', error.message);
    
    // Return fallback enrichment
    return {
      sentiment: 'NEUTRAL',
      entities: {
        products: [],
        accountNumbers: [],
        dates: [],
        amounts: []
      },
      suggestedActions: ['Review message manually'],
      intentSummary: 'Unable to determine intent',
      redFlags: [],
      error: error.message
    };
  }
}

module.exports = { enrichMessage };
