# Prompt Documentation

## Overview
This document details the LLM prompts used in the ArcVault intake and triage workflow, explaining design decisions, tradeoffs, and potential improvements.

---

## 1. Classification Prompt

### Location
`prompts/classificationPrompt.js`

### Purpose
Categorize incoming customer messages into one of five predefined categories and assign priority and confidence scores.

### Prompt Structure

```
You are an AI classification system for ArcVault's customer support intake pipeline. 
Analyze the following message and classify it into ONE of these categories:

Categories:
- Bug Report: Technical issues, errors, login problems, system malfunctions, broken features
- Feature Request: Requests for new capabilities, enhancements, or improvements
- Billing Issue: Invoice discrepancies, payment problems, pricing questions
- Technical Question: Questions about setup, configuration, integration, SSO
- Incident/Outage: Service disruptions, downtime, dashboard not loading

Priority Assessment (Low, Medium, High) based on:
- High: Service outages, security issues, multiple users affected, billing errors > $500
- Medium: Single-user bugs, urgent technical questions, moderate billing issues
- Low: Feature requests, general questions, minor issues

Respond with valid JSON:
{
  "category": "CATEGORY_NAME",
  "priority": "PRIORITY_LEVEL",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}
```

### Design Decisions

**1. Explicit Category Definitions**
- **Why:** Providing clear examples for each category reduces ambiguity and improves consistency across different inputs.
- **Tradeoff:** More verbose prompts consume more tokens but yield better accuracy. With GPT-4, the token cost is acceptable for the quality gain.

**2. Embedded Priority Logic**
- **Why:** Combining classification and priority assessment in a single prompt reduces latency (one API call instead of two) and ensures priority is contextually informed by the category.
- **Tradeoff:** Increases prompt complexity. Alternative approach would be separate priority assessment, but that would double API costs and latency.

**3. Structured JSON Output**
- **Why:** Enforcing JSON format with explicit field names makes parsing reliable and predictable. Including `reasoning` field provides auditability and helps debug misclassifications.
- **Tradeoff:** Occasionally the model produces malformed JSON. We handle this with try-catch blocks and fallback logic.

**4. Confidence Score Requirement**
- **Why:** Essential for the escalation logic. Low-confidence classifications (<0.7) trigger human review, preventing automated misrouting.
- **Tradeoff:** LLM confidence scores are sometimes overconfident. With more time, I would calibrate these scores against a labeled validation set.

### What I Would Change With More Time

1. **Few-Shot Examples:** Add 2-3 example classifications directly in the prompt to demonstrate edge cases (e.g., a bug report that sounds like a feature request).

2. **Chain-of-Thought Reasoning:** Ask the model to first identify key signals, then classify. This improves accuracy on ambiguous cases but increases token usage by ~30%.

3. **Category Confidence Distribution:** Instead of a single confidence score, return confidence for each category. This would help identify borderline cases where two categories are equally plausible.

4. **Prompt Versioning:** Implement A/B testing framework to compare prompt variations and measure impact on classification accuracy.

---

## 2. Enrichment Prompt

### Location
`prompts/enrichmentPrompt.js`

### Purpose
Extract structured metadata from messages, including identifiers (account IDs, invoice numbers, error codes), urgency signals, and a human-readable summary for the receiving team.

### Prompt Structure

```
You are a message enrichment assistant for ArcVault's support system.

Message: "{message}"
Classification: {category}
Priority: {priority}

Extract:
1. Core Issue: One-sentence summary (max 20 words)
2. Extracted Identifiers: Account IDs, invoice numbers, error codes, amounts, dates
3. Urgency Signals: Keywords indicating urgency ('outage', 'down', 'all users')
4. Human-Readable Summary: 2-3 sentences for receiving team

Respond with valid JSON:
{
  "coreIssue": "...",
  "extractedIdentifiers": { ... },
  "urgencySignals": [...],
  "humanReadableSummary": "..."
}
```

### Design Decisions

**1. Context-Aware Enrichment**
- **Why:** Passing the classification result allows the enrichment prompt to tailor its extraction. For example, billing issues emphasize extracting dollar amounts and invoice numbers.
- **Tradeoff:** Couples the two steps. If classification changes, enrichment might miss relevant fields. Alternative would be classification-agnostic enrichment, but that's less accurate.

**2. Explicit Word Limits**
- **Why:** "One sentence, max 20 words" prevents the model from producing verbose summaries that exceed downstream field limits (e.g., database columns, UI cards).
- **Tradeoff:** Occasionally truncates important context. Better approach would be to specify "20 words, add '...' if truncated."

**3. Structured Identifier Extraction**
- **Why:** Pre-defining fields (accountIds, invoiceNumbers, errorCodes, amounts, dates) makes downstream processing predictable. These can be directly inserted into CRM fields or ticketing systems.
- **Tradeoff:** Misses identifiers that don't fit these categories (e.g., product names, server IDs). With more time, I'd add a generic "other" field.

**4. Urgency Signals Array**
- **Why:** Used by escalation logic. Phrases like "down for all users" or "stopped loading" trigger automatic escalation even if classification has high confidence.
- **Tradeoff:** Relies on keyword matching. A more sophisticated approach would be semantic similarity detection (e.g., "entire team can't access" should match "all users affected" even without exact wording).

**5. Human-Readable Summary**
- **Why:** The assessment explicitly requires a "2-3 sentence summary suitable for the receiving team." This acts as the TL;DR for support agents and includes recommended next steps.
- **Tradeoff:** Adds ~50 tokens to output. For high-volume scenarios, this could be generated on-demand instead of upfront.

### What I Would Change With More Time

1. **Named Entity Recognition (NER):** Supplement LLM extraction with a dedicated NER model (e.g., spaCy) for higher precision on extracting account IDs, invoice numbers, and dates. LLMs occasionally hallucinate these.

2. **Regex Validation:** Add regex validators for extracted identifiers:
   - Invoice numbers: `#[0-9]{4,6}`
   - Error codes: `[0-9]{3}` (e.g., 403, 500)
   - Dollar amounts: `\$[\d,]+`
   - Discard extractions that don't match expected patterns to reduce false positives.

3. **Enrichment Confidence Scores:** Similar to classification, add a confidence field for each enrichment category. Low confidence on identifier extraction should flag for manual verification.

4. **Sentiment Analysis:** Add a sentiment field (Positive/Neutral/Negative) to help prioritize responses. Very negative sentiment could trigger escalation even for low-priority categories.

5. **Template-Based Suggestions:** Based on category + priority, suggest response templates to the receiving team (e.g., "Use billing discrepancy template B-03").

---

## Overall Tradeoffs

### Token Usage vs. Accuracy
- Current design uses ~250-300 tokens per message (input + output combined)
- At scale (10,000 messages/day), this is ~$2-3/day with GPT-4
- Alternative: Use GPT-3.5 for classification, GPT-4 only for low-confidence cases → saves 70% on costs but reduces accuracy by ~8-10%

### Latency vs. Quality
- Single-pass prompts prioritize speed (~2-3 second total processing time per message)
- Multi-pass approaches (e.g., classify → validate classification → enrich) would improve accuracy by ~5% but triple latency
- For real-time intake, current design is optimal; for batch processing, multi-pass would be better

### Prompt Complexity vs. Maintainability
- Current prompts are ~200-300 words each
- Shorter prompts are easier to maintain but less accurate
- Sweet spot is 150-250 words with clear structure and explicit output format

---

## Production Recommendations

1. **Prompt Registry:** Store prompts in a database with version control. Deploy prompt updates without code changes.
2. **Evaluation Harness:** Maintain a labeled test set of 200+ messages. Run automated eval on every prompt change and track accuracy, precision, recall.
3. **Human-in-the-Loop Feedback:** When humans override classifications, log the correction. Periodically retrain or adjust prompts based on these signals.
4. **Cost Monitoring:** Track token usage per prompt and per category. Identify high-cost outliers (e.g., very long messages) and preprocess them.
5. **Fallback Strategy:** If LLM API is down or timeout occurs, route all messages to human review queue rather than failing silently.

---

