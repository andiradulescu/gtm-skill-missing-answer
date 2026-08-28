---
name: missing-answer
description: Finds the strongest repeated public prospect question that a company website does not clearly answer, verifies the answer from official sources, and proposes a review-only page change. Use when the user provides a company URL and asks what answer its website is missing.
---

# Missing answer

## Input

Accept exactly one public company website URL from the prompt or a prompt-named input file. For the demo, read `demo/input/planable.md`. If the URL is absent, malformed, inaccessible, or identifies more than one company, report `insufficient evidence: provide one public company URL` and stop.

## Evidence collection

1. Normalize the URL and identify the company without collecting personal data.
2. If the company is Planable (`planable.io` or a subdomain), read `demo/input/planable.md` and the committed collector snapshot `demo/input/planable-public-questions.json`. Also read `demo/input/planable-g2-public-questions.json` and `demo/input/planable-reddit-expanded-questions.json` when they are present. Use only those dated cached files for questions, website coverage, and official answer evidence. Do not fetch, search, browse, refresh, launch discovery, or recrawl Planable or its sources. If either required file is absent, ambiguous, or lacks required retrieval dates or source URLs, report `insufficient evidence: committed Planable snapshot is unavailable or incomplete` and stop. Treat the optional G2 and expanded Reddit snapshots as additional evidence only when they meet the same provenance, independence, relationship-context, semantic-equivalence, and privacy requirements. Count an overlapping source URL in the small and expanded Reddit snapshots only once.
3. For any other company, follow exactly one evidence mode:
   - If the prompt names a local dated evidence file, use only that file. Do not browse, fetch, search, or refresh its sources. Require one target URL, retrieval dates, distinct public source URLs, short source-verbatim questions, explicit non-personal usage or evaluation context, verified author independence, checked customer-facing pages, and official answer excerpts. If any required field is missing or contradictory, report `insufficient evidence: supplied snapshot is unavailable or incomplete` and stop.
   - Otherwise, inspect the public website and discover public questions from accessible forums, communities, review Q&A, or other public discussions. Record every inspected URL and the actual retrieval date.
   In either mode, do not use login-only content, scraped profiles, personal data, company-authored questions, generated questions, reposts, or duplicate authors.
4. Preserve only short verbatim excerpts that express a genuine buying, adoption, migration, workflow, pricing, integration, security, or comparison question. Keep the source URL, retrieval date, and enough non-personal context to interpret it.
5. Cluster semantically equivalent questions. Require at least two independent public questions from separate people and distinct source URLs for a candidate. Do not infer independence when it cannot be verified.
6. Check the relevant main customer-facing pages before help, documentation, or changelog pages. Record every checked official URL and retrieval date, then classify each candidate:
   - `REJECT` when the main customer-facing pages clearly and directly answer the exact question.
   - `BURIED ANSWER` when a verified first-party answer exists only in help, documentation, or changelog content, or the answer is fragmented across official pages and repeated semantically equivalent questions persist.
   - `MISSING ANSWER` only when the inspected public site leaves the exact question unresolved.
7. Verify the proposed answer from official documentation, help-center material, product pages, or official announcements. Do not convert implication, third-party commentary, or absence of evidence into a product claim.
8. Exclude `REJECT` candidates. Rank eligible `BURIED ANSWER` and `MISSING ANSWER` candidates by independent question count, purchase or adoption relevance, consequence of uncertainty, clarity of the website coverage gap, answer confidence, and usefulness of a small page edit. Select exactly one strongest finding and preserve its classification verbatim.

## Failure behavior

If no candidate has two independently verifiable semantically equivalent public questions, explicit product-usage or evaluation context, a `BURIED ANSWER` or `MISSING ANSWER` classification, and a verified official answer, output only a concise `insufficient evidence` explanation with inspected source URLs, retrieval dates, and explicit limitations. Do not provide a weak lead, generated substitute, page recommendation, or preview instructions.

## Output

Write the result to the path requested by the prompt, or `demo/output/planable-missing-answer.md` for the demo. Begin with `Classification: BURIED ANSWER` or `Classification: MISSING ANSWER`, matching the selected candidate. Produce exactly one strongest finding, using these sections in this order:

1. `Multiple real users or prospects are asking this`: state the normalized question and exact independent-source count; include at least two short verbatim excerpts, each labeled `Source 1`, `Source 2`, and so on, with source URL, retrieval date, and non-personal context proving explicit product usage or evaluation intent, but no person names, handles, or other personal data. Label each source as a user/customer only when usage is explicit, as a prospect/evaluator only when evaluation intent is explicit, or otherwise as an independent source.
2. Use the heading `The answer is buried` for `BURIED ANSWER`, or `The site does not answer it` for `MISSING ANSWER`. For a buried answer, name the exact relevant main customer-facing page checked, explain what it leaves unclear, and identify the help, documentation, or changelog pages where the official answer actually lives. For a missing answer, name the official pages checked and explain precisely why they leave the question unresolved. Include every URL and retrieval date.
3. `Here is the verified answer`: state only the answer supported by official evidence; cite every official source URL and retrieval date; give confidence as high, medium, or low with one sentence of reasoning.
4. `Proposed page change`: name one exact page and insertion point, provide concise draft copy, and explain how it resolves the evidenced uncertainty.
5. `Limitations`: state evidence gaps, snapshot age where applicable, inaccessible sources, and what was not verified. Write `none observed` only when supported.

## Preview stage

Treat preview creation as a later stage after writing a positive `BURIED ANSWER` or `MISSING ANSWER` finding. Enter this stage only when the user explicitly requests a preview. Create the requested review-only local artifact by applying the smallest proposed edit to the real target page's rendered context, preserve its design language, and label the artifact clearly as a proposed draft. Do not alter the live site. A preview is not evidence for the finding and is never required to validate or write the evidence-backed result.

## Rules

- Never invent or paraphrase a quote, source, retrieval date, customer identity, website gap, official answer, confidence basis, or preview result.
- Never infer customer or prospect status from public authorship alone.
- Never include personal data. Refer to evidence as numbered sources, not identifiable people.
- Never send, publish, deploy, submit, contact anyone, modify a live website, or describe the local preview as a live-site change.
- Never claim conversion impact or say that the company implemented or approved the proposed change.
- Never describe committed or cached evidence as live. For Planable, label all findings as snapshot-based and include the snapshot retrieval dates.
- Prefer abstention over an incomplete evidence chain.

## Done when

Finish evidence validation only when exactly one honestly labeled `BURIED ANSWER` or `MISSING ANSWER` finding contains two or more independent semantically equivalent public question excerpts from distinct source URLs, explicit relationship context, source retrieval dates, checked website evidence, an officially verified answer, confidence, one specific page change, and explicit limitations, with no personal data or external mutation. If the user explicitly requests the later preview stage, finish that stage only after the positive finding exists and the local artifact is labeled as a proposed draft.
