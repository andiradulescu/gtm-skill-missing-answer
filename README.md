# Missing Answer

**Turn repeated prospect questions into one evidence-backed website improvement.**

A product website can explain every feature and still leave an important buying
question unanswered. Missing Answer starts outside the company website. It finds
questions that real people ask in public, checks whether the site answers them,
verifies the answer from official sources, and proposes the smallest useful page
change.

The result is not a generic SEO audit or a list of AI-generated content ideas. It
is one reviewable recommendation with a traceable evidence chain:

> public questions → independent repetition → website gap → verified answer →
> proposed page change → local preview

## The problem

Marketing teams usually improve a website from the inside out: positioning,
campaign priorities, search volume, and competitor pages. Meanwhile, prospects
ask concrete adoption, pricing, workflow, integration, security, and comparison
questions in public discussions.

When the same question appears independently more than once and the company site
does not resolve it, that is a useful content signal. Missing Answer turns that
signal into a specific draft that a content lead can inspect, verify, and choose
whether to ship.

## What the skill delivers

For one public company website, `$missing-answer` first applies a qualifying
evidence gate. A successful case produces exactly one strongest finding:

1. **Potential customers are asking this**: the normalized question, the
   independent source count, and short redacted excerpts with URLs and retrieval
   dates.
2. **The answer is buried** or **The site does not answer it**: the exact
   classification, official pages inspected, and ambiguity that remains.
3. **Here is the verified answer**: a page-safe answer supported by
   official documentation, with confidence and citations.
4. **Proposed page change**: one target page, one insertion point, and concise
   draft copy.
5. **Limitations**: snapshot age, inaccessible evidence, and anything the run
   could not verify.

If that full chain cannot be established, the skill returns `insufficient
evidence` instead of filling the gaps with plausible-sounding claims.

## How it works

### 1. Start with observed questions

The skill looks for concrete buying and adoption questions written by potential
customers in public discussions. Company-authored FAQs, generated questions,
reposts, duplicate authors, and mere topic mentions do not count as demand
evidence.

### 2. Require independent repetition

A candidate needs at least two semantically equivalent questions from separate
people at distinct source URLs. The collector validates source pages, removes
duplicate-author posts, strips author identity, and redacts handles and email
addresses before evidence reaches the skill.

### 3. Classify website coverage, not product capability

The skill assigns every qualifying question cluster one explicit website state:

- `REJECT` when the main customer-facing pages answer it clearly.
- `BURIED ANSWER` when verified first-party support, documentation, or changelog
  material answers it but the main pages do not.
- `MISSING ANSWER` when the inspected public site leaves it unresolved.

These are website-coverage classifications. They never mean the product lacks a
capability, and `REJECT` candidates cannot become recommendations.

### 4. Verify before drafting

Any proposed answer must be supported by official documentation, help-center
content, product pages, or announcements. Third-party commentary and absence of
evidence are never converted into product claims.

### 5. Stop at a reviewable draft

Missing Answer recommends one small edit but does not publish content, contact
anyone, or modify the live website. A local HTML preview is a separate optional
stage entered only when the user explicitly requests it after a positive
finding. A preview is never treated as evidence.

## Current demo

The committed Planable case uses a dated evidence snapshot. This keeps the
analysis reproducible and preserves the original source URLs and retrieval
dates. The snapshot is always described as cached evidence, never as a live
crawl.

The current input contains seven distinct Reddit questions and six canonically
fetched G2 questions. It records several broad workflow clusters, including a
provisional two-person Instagram Story cluster, while stating explicitly that
related intent is not necessarily a semantically repeated question.

The committed [`insufficient evidence`](demo/output/planable-missing-answer.md)
artifact is the current result. It rejects broad overlaps that do not meet the
semantic-repetition rule, classifies the directly documented pricing-model
question as `REJECT`, and refuses to force either a positive finding or a
preview.

The exact final seed completed from a clean temporary clone at commit
`4171e002cc2411d9db96343f5e085241317ecd1e`. Codex v0.150.1 with
`gpt-5.6-sol` at low reasoning read the four cached Planable inputs, made no
network calls, exited successfully in 30 seconds, and preserved the committed
output byte-for-byte. Its SHA-256 is
`ad94a6f3eb2a8d6a6b11c08adc8f61b037fd185ad5565687e5892641d026b05e`.
The complete presentation contract and observed run provenance are recorded in
[`DEMO.md`](DEMO.md) and [`demo/evals.md`](demo/evals.md).

## Portability evidence

The skill instructions accept one public company URL and define the same
evidence and abstention rules for another company:

```text
$missing-answer Analyze https://example.com and write the strongest supported
finding to missing-answer.md. Stop with insufficient evidence if the complete
evidence chain cannot be verified.
```

The recorded Figma intended-case evaluation applies the same evidence contract
to a second company. It produces one `BURIED ANSWER` finding from independent
public questions, checked marketing pages, and official help evidence, without
network access, preview creation, or external mutation. See the
[`Figma input`](demo/evals/intended/figma.md) and
[`observed result`](demo/evals/intended/figma-missing-answer.md).

This proves the evidence-analysis path on a second dated input. It does not prove
the optional preview stage across domains. The `stock.estate` fixture remains a
collector-normalization test rather than an end-to-end skill run.

## Evidence collection

[`scripts/collect-public-questions.mjs`](scripts/collect-public-questions.mjs)
is the preparation-time collector used to create a privacy-reduced question
snapshot. It discovers Reddit discussions through Google search results,
validates the questions at their Reddit source pages, enforces one accepted post
per verifiable author, and writes normalized evidence atomically.

The collector can run against fixtures without credentials. Live collection
uses Apify and requires `APIFY_TOKEN`; it is not part of the credential-free
demo path.

[`scripts/validate-question-snapshot.mjs`](scripts/validate-question-snapshot.mjs)
checks the committed snapshot schema, timestamps, fetched-source status,
distinct source URLs, author verification and redaction, subject-domain
exclusion, and privacy-sensitive fields before the model uses the evidence.

Run the collector and snapshot-validator tests with:

```sh
node --test scripts/*.test.mjs
```

## Repository map

| Path | Purpose |
| --- | --- |
| [`.agents/skills/missing-answer/SKILL.md`](.agents/skills/missing-answer/SKILL.md) | The reusable Codex skill and its evidence contract |
| [`demo/input/`](demo/input/) | Representative input and dated public-data snapshot |
| [`demo/output/`](demo/output/) | Verified Planable abstention fallback, with no preview |
| [`demo/seed-prompt.md`](demo/seed-prompt.md) | Exact cold-start prompt verified from a clean clone |
| [`demo/evals.md`](demo/evals.md) | Three observed eval cases plus exact-seed provenance |
| [`DEMO.md`](DEMO.md) | Completed two-minute presentation run sheet |
| [`scripts/collect-public-questions.mjs`](scripts/collect-public-questions.mjs) | Bounded public-question collection and privacy reduction |
| [`scripts/validate-question-snapshot.mjs`](scripts/validate-question-snapshot.mjs) | Deterministic snapshot evidence gate |

## Boundaries and limitations

- Public repetition is a content signal, not proof of market prevalence,
  conversion impact, or revenue loss.
- Results are limited to accessible sources and the official pages actually
  inspected.
- Cached evidence becomes stale and must retain its retrieval date.
- Missing Answer deliberately prefers one strong finding over a broad list of
  weak suggestions.
- The Figma eval proves the second-company evidence-analysis path, not the
  optional preview stage.
- Every proposed change remains a draft until a human reviews it.

## License

[MIT](LICENSE)
