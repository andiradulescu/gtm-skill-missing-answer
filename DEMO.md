# Run sheet

## Say this — 20 seconds

**Team:** Andrei Radulescu

**Track:** AI search optimization

**Who has the problem:** A B2B SaaS content lead deciding which buyer question a company website should answer next.

**The job this skill does:** Given one public company URL, Missing Answer finds one repeated public question the website does not clearly answer, or abstains when the evidence does not support a finding.

**Boundary — what it never does:** It does not guess a website gap, use personal data, refresh the supplied snapshot, or change a live site.

## Run this — 60 seconds

1. Open Codex at the repository root.
2. Paste [`demo/seed-prompt.md`](demo/seed-prompt.md).
3. Watch for [`demo/output/figma-missing-answer.md`](demo/output/figma-missing-answer.md) to show one `BURIED ANSWER` finding backed by two independent questions and Figma's official documentation.
4. Open the review-only local preview at [`demo/output/figma-missing-answer.html`](demo/output/figma-missing-answer.html). If the run has not finished after 60 seconds, use the two committed fallback artifacts.

## Show this — 25 seconds

**Result:** Two independent evaluators ask whether clients can comment on Figma prototypes without an account. Figma's agency page promotes client comments but leaves the sign-in requirement in help documentation, so the skill proposes one precise clarification.

**Evidence:** The Markdown output preserves both verbatim questions, their public source URLs, the checked customer-facing pages, the official help answer, the 2026-08-28 retrieval date, confidence, and limitations.

**Fallback output:** The exact seed ran from a clean clone of commit `9303c44` with Codex v0.150.1, `gpt-5.6-sol`, and low reasoning. It used only the dated Figma snapshot, produced the committed Markdown finding and HTML preview, made no network requests, and did not modify the live site.

## Evals — 10 seconds

| Case | Result | Where |
| --- | --- | --- |
| Intended | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |
| Insufficient evidence | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |
| Failure / exclusion | Read the recorded observed result. | [`demo/evals.md`](demo/evals.md) |

## Close — 5 seconds

**Reusable on:** One public company website URL with public question evidence and official source pages.

**Material limitation:** This finding uses a fixed snapshot retrieved on 2026-08-28. It does not establish Figma's future roadmap or the onboarding flow a newly invited commenter sees.
