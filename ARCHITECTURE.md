# Architecture Write-Up
## ArcVault AI-Powered Intake & Triage Pipeline

**Candidate:** AI Engineer Assessment Submission  
**Date:** March 2026  

---

## 1. System Design Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐
│  Inbound Source │
│ (Email/API/Form)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                        │
│                       (app.js)                               │
├─────────────────────────────────────────────────────────────┤
│  POST /process         - Single message processing           │
│  POST /workflow/run    - Batch processing (all inputs)       │
│  GET  /workflow/results - Retrieve processed results         │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Processing Pipeline                    │
│                                                              │
│  Step 1: Classification (classifier.js)                     │
│    ├─ Input: Raw message text                               │
│    ├─ LLM Call: OpenAI GPT-4                                │
│    └─ Output: category, priority, confidence, reasoning     │
│                                                              │
│  Step 2: Enrichment (enricher.js)                           │
│    ├─ Input: Message + Classification                       │
│    ├─ LLM Call: OpenAI GPT-4                                │
│    └─ Output: coreIssue, identifiers, signals, summary      │
│                                                              │
│  Step 3: Routing (router.js)                                │
│    ├─ Input: Classification + Enrichment                    │
│    ├─ Logic: Rule-based mapping                             │
│    └─ Output: destinationQueue, team, SLA                   │
│                                                              │
│  Step 4: Escalation Check (escalation.js)                   │
│    ├─ Input: All previous outputs                           │
│    ├─ Logic: Confidence threshold + keyword detection       │
│    └─ Output: escalationFlag, reasons, finalQueue           │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Output Storage │
│ (results.json)  │
└─────────────────┘
```

### 1.2 Component Interactions

**Trigger Mechanism:** The system accepts messages via HTTP API endpoints. In a production environment, this could be connected to:
- Email webhook (SendGrid, Mailgun, etc.)
- Web form submissions (POST to /process)
- Support portal integration (Zendesk, Intercom webhook)
- Scheduled batch jobs pulling from a queue

**State Management:** The current implementation is stateless. Each request is processed independently, and final results are written to a JSON file. In production, this would be replaced with:
- Persistent database (PostgreSQL, MongoDB)
- Message queue (RabbitMQ, AWS SQS) for async processing
- State stored in memory for in-flight requests only

**Data Flow:** Synchronous pipeline where each step depends on the previous step's output. All data is passed through in-memory JavaScript objects until final persistence.

---

## 2. Routing Logic

### 2.1 Category-to-Queue Mapping

The routing decision is deterministic based on classification category:

| Category | Destination Queue | Team | SLA | Notes |
|----------|------------------|------|-----|-------|
| Bug Report | Engineering | Engineering Team | 1-24h based on priority | Complex bugs may need escalation |
| Feature Request | Product | Product Team | 4-24h based on priority | Low urgency, tracked in roadmap |
| Billing Issue | Billing | Billing Department | 1-24h based on priority | High $ amounts auto-escalate |
| Technical Question | IT/Security | IT/Security Team | 4-24h based on priority | SSO, auth, config questions |
| Incident/Outage | Engineering | Engineering - Priority | **15 minutes** | Always treated as High priority |

### 2.2 Priority-Based SLA Assignment

After category mapping, SLA (Service Level Agreement) is determined by priority:

- **High Priority:** 1 hour response time
- **Medium Priority:** 4 hour response time
- **Low Priority:** 24 hour response time
- **Incidents/Outages:** 15 minutes (overrides priority)

### 2.3 Fallback Queue for Low Confidence

If classification confidence < 70%, the message bypasses category-based routing and goes directly to:

**Queue:** `Escalation-HumanReview`  
**Team:** Triage Team  
**SLA:** 2 hours  
**Reason:** Human must validate classification before routing to specialized team

This prevents misrouted messages from wasting specialized team time on incorrect assignments.

### 2.4 Why This Design?

**Separation of Concerns:** Routing logic is isolated in `router.js` and does not depend on LLM calls. This makes it:
- Fast (no API latency)
- Deterministic (same input always produces same output)
- Easy to test (no API mocking required)

**Configurability:** The `routingRules` object acts as a configuration table. Adding a new category or changing a destination queue requires only a single config change, not code refactoring.

**Edge Case Handling:** Low-confidence classifications get caught early, preventing incorrect routing from cascading through the system.

---

## 3. Escalation Logic

### 3.1 Escalation Criteria

A message is flagged for escalation if ANY of the following conditions are met:

#### Criterion 1: Low Confidence (<70%)
```javascript
if (classification.confidence < 0.7) → ESCALATE
```
**Rationale:** If the model is uncertain, a human should validate before acting.

#### Criterion 2: Critical Keywords
Detected in message content (case-insensitive):
- "outage"
- "down" / "down for all users"
- "all users affected" / "multiple users"
- "not loading" / "stopped working" / "stopped loading"

**Rationale:** These phrases indicate high-impact incidents that require immediate attention regardless of classification confidence.

#### Criterion 3: Billing Amount > $500
```javascript
if (category === 'Billing Issue' && extractedAmount > 500) → ESCALATE
```
**Rationale:** Financial discrepancies above $500 could indicate systemic billing errors affecting multiple customers.

#### Criterion 4: Incident/Outage Category
```javascript
if (category === 'Incident/Outage') → ESCALATE
```
**Rationale:** All outages should have human oversight to coordinate response and communication.

### 3.2 Escalation Override

When a message escalates:
- **Original Destination Preserved:** Logged but not routed to
- **New Destination:** `Escalation-HumanReview` queue
- **Metadata Attached:** Escalation reasons + original intended queue
- **Flag Set:** `requiresHumanReview: true`

After human review, the message can be:
1. Approved → Routed to original destination
2. Reclassified → Routed to corrected destination
3. Handled directly → No further routing needed

### 3.3 Why This Design?

**Safety First:** Over-escalation is preferable to under-escalation. A human reviewing an unnecessary escalation costs ~2 minutes. A misrouted critical incident costs hours or days.

**Transparent Reasoning:** Every escalation includes explicit reasons. This allows:
- Auditing of escalation patterns
- Tuning thresholds over time
- Training data for improving classification

**Keyword Detection:** Simple keyword matching is intentionally naive. More sophisticated NLP (e.g., semantic similarity) would catch variations like "none of our users can login" but risks false positives. Current approach is conservative.

---

## 4. What I Would Do Differently at Production Scale

### 4.1 Reliability

**Current:** Single Express server, synchronous processing  
**Production:**
- **Load Balancer:** Distribute traffic across multiple API instances
- **Message Queue:** Decouple ingestion from processing
  - Inbound messages → SQS/RabbitMQ
  - Worker pool pulls from queue and processes
  - Failures auto-retry with exponential backoff
- **Circuit Breaker:** If OpenAI API is down, fail fast and route all messages to manual queue instead of timing out

**Current:** No retry logic on LLM failures  
**Production:**
- Retry failed LLM calls 3x with exponential backoff
- If all retries fail, route to manual queue with error context
- Dead Letter Queue (DLQ) for persistently failing messages

**Current:** Results written to JSON file  
**Production:**
- PostgreSQL for structured records
- Redis for caching recent classifications (avoid re-processing duplicates)
- S3/blob storage for raw message content (GDPR/audit compliance)

### 4.2 Cost Optimization

**Current:** Every message calls GPT-4 twice  
**Production:**
- **Tiered Model Strategy:**
  - Use GPT-3.5-turbo for initial classification (5x cheaper, 1.5x faster)
  - Only use GPT-4 for low-confidence cases or complex enrichment
  - Saves ~60-70% on LLM costs with <5% accuracy drop
- **Batch Processing:**
  - For non-urgent categories (Feature Requests, Low Priority), batch messages and process every 15 minutes
  - Use OpenAI batch API (50% discount)
- **Caching:**
  - Cache classification for duplicate messages (common for spam, auto-replies)
  - Hash message content → lookup in Redis before calling LLM

**Current:** No cost monitoring  
**Production:**
- Log token usage per message
- Track cost per category (Billing issues might be more expensive if they require longer prompts)
- Alert if daily cost exceeds threshold

### 4.3 Latency Reduction

**Current:** Sequential processing (classify → enrich → route → escalate)  
**Production:**
- **Parallel Enrichment:** Classification and basic enrichment can run in parallel
  - Fork: [Classification] + [Entity Extraction]
  - Join: Combine results → Route → Escalate
  - Reduces latency by ~30-40%

**Current:** Single region, no CDN  
**Production:**
- Multi-region deployment (US, EU, APAC)
- Route requests to nearest region for lowest latency
- Replicate data globally with eventual consistency model

**Current:** Synchronous API calls  
**Production:**
- Async processing with webhook callback
  - POST /process returns immediately with `job_id`
  - Client polls GET /status/:job_id or receives webhook when complete
  - Allows frontend to remain responsive

### 4.4 Observability

**Current:** Console logs only  
**Production:**
- **Structured Logging:** JSON logs with trace IDs (correlation across services)
- **Metrics Dashboard:**
  - Processing throughput (messages/minute)
  - Classification accuracy per category
  - Average latency per pipeline step
  - Escalation rate (% of messages escalated)
  - LLM API response times
- **Alerting:**
  - Classification accuracy drops below threshold
  - Escalation rate spikes (might indicate prompt drift or real incident)
  - LLM API latency exceeds SLA
- **Distributed Tracing:** OpenTelemetry to track message flow through entire pipeline

### 4.5 Security & Compliance

**Current:** No authentication, no data encryption  
**Production:**
- **API Authentication:** API keys or OAuth for endpoint access
- **Data Encryption:**
  - TLS for data in transit
  - AES-256 for data at rest (especially PII in messages)
- **PII Redaction:** Detect and mask SSNs, credit card numbers, API keys in messages before logging
- **Audit Trail:** Immutable log of who accessed/modified each message
- **Data Retention:** Auto-delete messages after 90 days (configurable per compliance requirements)

---

## 5. Phase 2 Features (Given Another Week)

### 5.1 Feedback Loop for Continuous Learning

**Current System:** Static prompts, no learning from corrections  

**Phase 2:**
- When human reviewers reclassify a message, log:
  - Original classification
  - Corrected classification
  - Reviewer notes on why it was wrong
- Weekly batch retraining:
  - Analyze misclassifications
  - Identify patterns (e.g., "SSO questions often misclassified as Bug Reports")
  - Update prompt with additional examples
  - A/B test new prompt against 10% of traffic before full rollout

**Impact:** Continuous improvement in classification accuracy. Goal: <5% reclassification rate within 3 months.

### 5.2 Smart Auto-Responses

**Current System:** Only routes, doesn't respond  

**Phase 2:**
- For low-priority, high-confidence categories, generate auto-reply drafts:
  - Feature Requests → "Thanks for the suggestion! We've forwarded this to our Product team."
  - General Questions → Retrieve answer from knowledge base (RAG architecture)
- Human reviews draft before sending (semi-automation)
- Track which auto-responses get edited → improve generation prompts

**Impact:** Reduce response time for 40% of incoming messages from 4 hours to 15 minutes.

### 5.3 Duplicate Detection

**Current System:** Treats every message as unique  

**Phase 2:**
- When a new message arrives, compute semantic similarity to recent messages (last 24 hours)
- If similarity > 90%, flag as potential duplicate:
  - "This looks similar to Request #12345 (opened 2 hours ago). Link them?"
- For outages, this automatically identifies widespread incidents
  - First report → Creates incident
  - Subsequent similar reports → Auto-link to incident, notify customer their report is tracked

**Impact:** Reduces duplicate work, provides better customer experience during outages.

### 5.4 Priority Re-Ranking with Context

**Current System:** Priority based only on message content  

**Phase 2:**
- Consider customer context:
  - Enterprise customers → Auto-bump priority by 1 level
  - Customers with open critical issues → Flag as "at-risk account"
  - New customers (first 30 days) → Route to specialized onboarding team
- Integrate with CRM (Salesforce, HubSpot) to pull customer tier and history
- Adjust SLA based on contract terms

**Impact:** Differentiated service levels, reduced churn for high-value customers.

### 5.5 Sentiment-Driven Escalation

**Current System:** No sentiment analysis  

**Phase 2:**
- Add sentiment detection in enrichment step
- Escalate messages with "Very Negative" sentiment + Medium/High priority
  - Example: "I've been waiting 3 days for a response. This is unacceptable!"
  - Even if it's a Low Priority category, negative sentiment indicates customer frustration → escalate to prevent churn

**Impact:** Proactively address at-risk customers before they become detractors.

### 5.6 Multi-Language Support

**Current System:** English only  

**Phase 2:**
- Detect language of incoming message (langdetect library or LLM detection)
- For non-English messages:
  - Translate to English for classification/enrichment
  - Store both original and translated versions
  - Route to team with appropriate language skills
- Add language field to output record

**Impact:** Expand to global customer base without hiring multilingual support teams.

### 5.7 Workflow Visualization Dashboard

**Current System:** No UI, results in JSON file  

**Phase 2:**
- Real-time dashboard showing:
  - Messages in each queue (Engineering: 12, Billing: 5, Escalation: 3)
  - Average processing time per step
  - Classification accuracy metrics (% confident vs. % escalated)
  - Live feed of incoming messages with their routing decisions
- Built with React + WebSocket for real-time updates

**Impact:** Operational visibility for support managers, easier debugging of routing issues.

---

## 6. Technology Choices & Rationale

### 6.1 Why Node.js + Express?

**Rationale:**
- **Async I/O:** Node.js excels at I/O-bound tasks (API calls, file operations)
- **Ecosystem:** Rich NPM ecosystem for OpenAI SDK, HTTP servers, JSON processing
- **Rapid Prototyping:** Quick to build and iterate for assessment timeline
- **Familiarity:** Widely known, easy for Valsoft team to review and extend

**Tradeoff:** Not ideal for CPU-heavy workloads. If we added complex NLP preprocessing (tokenization, entity extraction), Python would be better.

### 6.2 Why OpenAI GPT-4?

**Rationale:**
- **High Accuracy:** GPT-4 excels at classification and structured output generation
- **Reliability:** Stable API with good uptime (99.9% SLA)
- **Structured Outputs:** Natively supports JSON mode, reducing parsing errors
- **Cost-Effective for Assessment:** ~$0.03 per message at current token usage

**Alternatives Considered:**
- **GPT-3.5-turbo:** Cheaper (5x), faster, but ~10% lower accuracy on complex cases
- **Anthropic Claude:** Similar accuracy, better at following instructions, but more expensive
- **Open-Source (Llama 3, Mistral):** Zero API cost, slower, requires hosting infrastructure

**Production Choice:** Use GPT-3.5-turbo for first pass, escalate to GPT-4 for low-confidence cases (hybrid approach).

### 6.3 Why JSON File for Output?

**Rationale:**
- **Simplicity:** No database setup required for assessment
- **Portability:** Easy to share results with evaluators
- **Human-Readable:** Can inspect results with any text editor

**Production Replacement:** PostgreSQL for structured records, S3 for archival, Redis for hot cache.

### 6.4 Why Synchronous Pipeline?

**Rationale:**
- **Easier Debugging:** Linear flow makes it easy to trace where failures occur
- **Acceptable Latency:** 2-3 seconds per message is fine for non-urgent intake
- **Simpler Code:** No queue management, no worker pool coordination

**When to Switch to Async:**
- If processing time exceeds 5 seconds per message
- If ingestion rate exceeds 10 messages/second
- If system needs to scale beyond single server

---

## 7. Testing & Validation Strategy

### 7.1 Test Coverage

**Unit Tests (Not Implemented Due to Time Constraint):**
- `router.test.js`: Verify category → queue mapping
- `escalation.test.js`: Verify each escalation criterion triggers correctly
- Mock LLM responses to test classification/enrichment parsing

**Integration Tests:**
- Manually tested all 5 sample inputs end-to-end
- Verified output structure matches requirements
- Confirmed escalation triggers on keyword detection and low confidence

**Edge Cases Tested:**
- Empty message content → Returns validation error
- Malformed JSON from LLM → Fallback to default classification
- Confidence exactly at 0.7 threshold → No escalation (≥0.7 is acceptable)

### 7.2 What I Would Add for Production

**Automated Testing:**
- **Golden Dataset:** 200+ labeled messages covering all categories and edge cases
- **Accuracy Metrics:** Precision, Recall, F1 score per category
- **Regression Tests:** Run on every prompt change, flag if accuracy drops >2%
- **Load Testing:** Simulate 1000 messages/minute to validate throughput

**Human Evaluation:**
- Weekly review of 50 random classifications
- Support team rates: "Was this classification correct? Was routing appropriate?"
- Track and report accuracy trends over time

---

## 8. Assumptions & Constraints

### Assumptions Made:
1. All messages are in English
2. Message content is plain text (no attachments, no HTML)
3. OpenAI API is available and responsive (no circuit breaker needed for assessment)
4. Results can be stored in a single JSON file (acceptable for 5-10 messages)
5. No authentication required for API endpoints (demo environment)

### Known Limitations:
1. No duplicate detection
2. No handling of multi-part conversations (each message treated independently)
3. No customer context (CRM integration, account history)
4. Classification prompts not tuned with real production data
5. No monitoring or alerting infrastructure

### Time Spent Breakdown:
- **System Design & Planning:** 45 minutes
- **Core Pipeline Implementation:** 2 hours
- **Prompt Engineering & Testing:** 1 hour
- **Documentation:** 1 hour 15 minutes
- **Total:** ~4 hours

---

## 9. Conclusion

This implementation demonstrates a working end-to-end AI-powered intake and triage workflow that meets all assessment requirements:

✅ **6 Required Steps:** Ingestion, Classification, Enrichment, Routing, Output, Escalation  
✅ **LLM Integration:** OpenAI GPT-4 for classification and enrichment  
✅ **Structured Output:** Clean JSON records with all required fields  
✅ **Escalation Logic:** Confidence threshold + keyword detection + billing amount threshold  
✅ **Routing Logic:** Category-based mapping with fallback queue  
✅ **Documentation:** Prompts explained, architecture detailed, tradeoffs articulated

The design prioritizes **clarity and maintainability** over complexity. All architectural decisions are intentional and documented. The system is production-ready with the enhancements outlined in Sections 4 and 5.

**Key Differentiator:** This is not just a working prototype—it's a foundation for a scalable production system. The modular design, explicit error handling, and comprehensive documentation make it easy to extend and operate at scale.

---

**Questions or Clarifications:** Available during technical interview  
**Code Repository:** All source code included in submission  
**Demo:** Screen recording provided separately
