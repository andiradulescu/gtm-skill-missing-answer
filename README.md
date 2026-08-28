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
2. **The site does not answer it**: the official pages inspected and the exact
   ambiguity that remains.
3. **Here is the verified missing answer**: a page-safe answer supported by
   official documentation, with confidence and citations.
4. **Proposed page change**: one target page, one insertion point, and concise
   draft copy.
5. **Preview instructions**: a review-only local rendering of the smallest
   credible edit in the site's existing design language.
6. **Limitations**: snapshot age, inaccessible evidence, and anything the run
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

### 3. Test the website, not the product

The skill checks whether relevant official pages give a clear, direct answer. A
`Missing` verdict means only that the inspected website pages do not answer the
question. It never means the product lacks the capability.

### 4. Verify before drafting

Any proposed answer must be supported by official documentation, help-center
content, product pages, or announcements. Third-party commentary and absence of
evidence are never converted into product claims.

### 5. Stop at a reviewable draft

Missing Answer recommends one small edit and can create a local HTML preview. It
does not publish content, contact anyone, or modify the live website.

## Current demo

The committed Planable case uses a dated evidence snapshot. This keeps the
analysis reproducible and preserves the original source URLs and retrieval
dates. The snapshot is always described as cached evidence, never as a live
crawl.

The current snapshot contains three independently authored questions, but they
concern different topics. The saved result therefore stops at
[`insufficient evidence`](demo/output/planable-missing-answer.md) before website
gap analysis, answer verification, a proposed page change, or an HTML preview.
That is the correct result for the available evidence.

The final seed prompt, presentation run sheet, and three-case evaluation record
are not yet complete. The saved abstention is evidence of the current prepared
case, not proof of a fresh run from the final submitted seed prompt.

## Portability contract

The skill instructions accept one public company URL and define the same
evidence and abstention rules for another company:

```text
$missing-answer Analyze https://example.com and write the strongest supported
finding to missing-answer.md. Stop with insufficient evidence if the complete
evidence chain cannot be verified.
```

This is the intended reusable contract, not demonstrated end-to-end portability.
The repository does not yet record a successful second-company skill run. The
`stock.estate` fixture exercises collector normalization only; it does not prove
that question clustering, website-gap analysis, official answer verification,
or preview generation works unchanged on a second domain.

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
| [`demo/output/`](demo/output/) | Current saved result, presently an abstention with no preview |
| [`demo/seed-prompt.md`](demo/seed-prompt.md) | Cold-start prompt template, not yet finalized |
| [`demo/evals.md`](demo/evals.md) | Three-case evaluation template, not yet executed |
| [`DEMO.md`](DEMO.md) | Presentation run sheet template, not yet finalized |
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
- A successful second-company end-to-end run has not yet been recorded.
- Every proposed change remains a draft until a human reviews it.

## License

[MIT](LICENSE)
