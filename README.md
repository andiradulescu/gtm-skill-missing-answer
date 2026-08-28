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

### 5. Finish with a visual review

Missing Answer recommends one small edit but does not publish content, contact
anyone, or modify the live website. After a positive finding it autonomously
shows the original customer-facing section and a temporary `Original → Fixed`
preview. It uses the rendered page when that is safely available and otherwise
produces a credential-free local HTML fallback. A preview is never treated as
evidence or a deployed change.

## Current demo

```text
$missing-answer https://www.figma.com/
```

That URL is the complete user input. The skill recognizes Figma internally,
uses the verified pack at `demo/input/figma.md`, and owns the output and preview
paths. The user does not select evidence files, pages, insertion points, or demo
artifacts.

The official demo uses a dated Figma evidence snapshot. Two independent public
questions ask whether an external client can comment on a prototype without a
Figma account. Figma's customer-facing agency and UI-design pages promote
client comments without stating the account requirement, while its official
help documentation says commenters must be signed in and have view access.

The committed [`BURIED ANSWER`](demo/output/figma-missing-answer.md) finding
preserves the exact public questions, checked pages, verified official answer,
confidence, proposed copy, and limitations. The sibling
[`local preview`](demo/output/figma-missing-answer.html) is the automatic
fallback when a safe rendered-page preview is unavailable. It shows
`Original → Fixed`, identifies itself as a review-only draft, and makes no
network requests or live-site changes.

The presentation contract and recorded evaluations are in
[`DEMO.md`](DEMO.md) and [`demo/evals.md`](demo/evals.md).

## Abstention evidence

The skill instructions accept one public company URL and define the same
evidence and abstention rules for another company:

```text
$missing-answer https://example.com/
```

The Planable case remains as the negative evaluation. Its dated corpus contains
real public questions, but no candidate completes the required semantic
repetition, website-gap, and official-answer chain. The skill therefore returns
[`insufficient evidence`](demo/evals/insufficient/planable-insufficient-evidence.md)
instead of forcing a recommendation. The `stock.estate` fixture remains a
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
| [`demo/output/`](demo/output/) | Figma finding and review-only local preview fallback |
| [`demo/seed-prompt.md`](demo/seed-prompt.md) | One-line cold-start prompt for the Figma URL route |
| [`demo/evals.md`](demo/evals.md) | Recorded intended, abstention, and safety evaluations |
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
- The Planable eval proves abstention behavior when the evidence chain fails.
- Every proposed change remains a draft until a human reviews it.

## License

[MIT](LICENSE)
