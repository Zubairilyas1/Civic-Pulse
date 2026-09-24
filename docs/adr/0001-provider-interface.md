# ADR 0001: AI Provider Abstraction and Multi-Tier Fallback Architecture

- **Status:** Accepted  
- **Date:** 2026-09-24  
- **Authors:** Zubair (`Zubairilyas1`) & Sami  
- **Deciders:** CivicPulse Core Engineering Team  

---

## 1. Context and Problem Statement

The CivicPulse application relies on AI triage to classify incoming civic complaints into standard categories (`Water Supply`, `Electricity`, `Roads & Traffic`, `Sanitation`, `Public Safety`, `Parks & Rec`), assign priority levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and generate concise summaries.

However, relying solely on a single cloud LLM API (such as Groq) presents several operational risks:
1. **API Rate Limiting (HTTP 429):** High-volume traffic or quota depletion can cause requests to fail.
2. **External Outages / Network Latency:** Cloud provider failures or high network latency can stall complaint submission.
3. **Offline / Air-Gapped Environments:** Local deployments or privacy-sensitive nodes cannot send data over the public internet.
4. **CI/CD Determinism:** Running live LLM queries during automated testing introduces non-deterministic test failures and API cost bloat.

We need an architecture that isolates the business logic from specific LLM providers and provides a seamless, resilient fallback strategy.

---

## 2. Decision Drivers

* **Zero-Downtime Resilience:** Complaint creation must never crash or fail due to downstream AI provider errors.
* **Extensibility:** Support adding new providers (e.g., OpenAI, Anthropic, local fine-tuned models) without modifying service layers.
* **Deterministic Testing:** CI/CD pipelines must run with fast, zero-cost, deterministic mock triage.
* **Auditability:** Every complaint record must capture which provider triaged it (`triaged_by` field).

---

## 3. Considered Options

* **Option 1: Direct Integration with Groq SDK inside ComplaintService**  
  *Pros:* Simple to implement initially.  
  *Cons:* Tight coupling, zero fallback capability, fragile in CI, hard to test.
* **Option 2: Polymorphic Strategy Pattern via Provider Interface + Factory with Multi-Tier Fallback**  
  *Pros:* Decoupled architecture, instant runtime fallback, configurable via environment variables (`TRIAGE_PROVIDER`), deterministic in CI.  
  *Cons:* Requires abstraction layers (`BaseTriageProvider`, `TriageFactory`).

---

## 4. Decision Outcome

We selected **Option 2**. We implemented an abstract strategy interface `BaseTriageProvider` with four concrete implementations and a multi-tiered fallback strategy managed by `LLMTriage` and `TriageFactory`.

```
                      +-----------------------------+
                      |   ComplaintService          |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    TriageFactory            |
                      +--------------+--------------+
                                     |
             +-----------------------+-----------------------+
             |                       |                       |
             v                       v                       v
     [TRIAGE_PROVIDER=groq]  [TRIAGE_PROVIDER=ollama] [TRIAGE_PROVIDER=rules]
             |                       |                       |
             v                       v                       v
      +--------------+        +--------------+        +--------------+
      |  LLMTriage   |        | OllamaTriage |        |RuleBasedTriage|
      +------+-------+        +--------------+        +--------------+
             | (on failure/timeout)
             v
      +--------------+
      |RuleBasedTriage| (Fallback)
      +------+-------+
             | (on failure)
             v
      +--------------+
      |SimulatedTriage| (Safety Net)
      +--------------+
```

### Fallback Order:
1. **Primary (`LLMTriage` - Groq Llama-3.3-70b):** High-accuracy cloud LLM with 10-second timeout and 1 exponential backoff retry.
2. **Local Fallback (`OllamaTriage`):** Local model server for offline operation.
3. **Rule-Based Fallback (`RuleBasedTriage`):** Fast, zero-dependency regex and keyword matching over Urdu and English civic terminology.
4. **Safety Net (`SimulatedTriage`):** Seeded deterministic generator to ensure complaint creation succeeds even under complete system failure.

---

## 5. Consequences

### Positive
- **100% Request Uptime:** Auto-triage gracefully degrades to keyword rules or simulated responses on LLM failure.
- **Provider Auditing:** All created complaints log the exact provider (`groq-llama3.3-70b`, `ollama-llama3`, `rule-based`, `simulated`) in database records.
- **CI/CD Compatibility:** Automated test suites default to `TRIAGE_PROVIDER=simulated` for instant, deterministic testing.

### Negative / Trade-Offs
- Slightly higher initial boilerplate code.
- Degraded fallback triage (rule-based) may classify ambiguous descriptions with lower semantic accuracy than LLMs.

---

## 6. Implementation References

- Interface & Models: [backend/app/providers/triage/base.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/base.py)
- Factory: [backend/app/providers/triage/factory.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/factory.py#L9-L26)
- Groq & Fallback Logic: [backend/app/providers/triage/llm.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/llm.py)
- Rule-Based Provider: [backend/app/providers/triage/rules.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/rules.py)
