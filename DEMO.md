# Run sheet

## Say this — 20 seconds

**Team:** Andrei Radulescu

**Track:** AI search optimization

**Who has the problem:** A B2B SaaS content lead deciding which buyer question a company website should answer next.

**The job this skill does:** Given one public company URL, Missing Answer finds one repeated public question the website does not clearly answer, or abstains when the evidence does not support a finding.

**Boundary — what it never does:** It does not guess a website gap, use personal data, fetch or refresh the cached Planable evidence, or change a live site.

## Run this — 60 seconds

1. Open Codex at the repository root.
2. Paste [`demo/seed-prompt.md`](demo/seed-prompt.md).
3. Watch for [`demo/output/planable-missing-answer.md`](demo/output/planable-missing-answer.md) to be written with an `insufficient evidence` decision, source URLs, and limitations. That abstention is the correct result for this cached input.
4. If the run has not finished after 60 seconds, open the committed fallback: [`demo/output/planable-missing-answer.md`](demo/output/planable-missing-answer.md).

## Show this — 25 seconds

**Result:** Planable's cached evidence does not support one qualifying `BURIED ANSWER` or `MISSING ANSWER` finding. The content lead therefore does not draft a page change from this snapshot.

**Evidence:** The output names the excluded question clusters, lists cached public and official source URLs, gives the 2026-08-28 retrieval date, and states the unverified limits.

**Fallback output was produced:** 2026-08-28 from the four committed Planable cached inputs in a credential-free run. It did not browse, refresh, or recrawl sources.

## Evals — 10 seconds

| Case | Result | Where |
| --- | --- | --- |
| Intended | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |
| Insufficient evidence | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |
| Failure / exclusion | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |

## Close — 5 seconds

**Reusable on:** One public company website URL with public question evidence and official source pages.

**Material limitation:** This Planable run uses a fixed snapshot retrieved on 2026-08-28. It contains no qualifying repeated, semantically equivalent question with a verified answer chain, so the skill must abstain.
