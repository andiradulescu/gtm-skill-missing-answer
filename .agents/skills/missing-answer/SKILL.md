---
name: missing-answer
description: Finds the strongest repeated public prospect question that a company website does not clearly answer, verifies the answer from official sources, and proposes a review-only page change. Use when the user provides a company URL and asks what answer its website is missing.
---

# Missing answer

## Input

Accept exactly one public company website URL from the prompt or a prompt-named input file. For the demo, read `demo/input/planable.md`. If the URL is absent, malformed, inaccessible, or identifies more than one company, report `insufficient evidence: provide one public company URL` and stop.

## Evidence collection

1. Normalize the URL and identify the company without collecting personal data.
2. If the company is Planable (`planable.io` or a subdomain), read both `demo/input/planable.md` and the committed collector snapshot `demo/input/planable-public-questions.json`. Use only those dated cached files for questions, website-gap evidence, and official answer evidence. Do not fetch, search, browse, refresh, launch discovery, or recrawl Planable or its sources. If either file is absent, ambiguous, or lacks required retrieval dates or source URLs, report `insufficient evidence: committed Planable snapshot is unavailable or incomplete` and stop.
3. For any other company, inspect its public website and discover public questions from accessible forums, communities, review Q&A, or other public discussions. Record every inspected URL and the actual retrieval date. Do not use login-only content, scraped profiles, personal data, company-authored questions, generated questions, reposts, or duplicate authors.
4. Preserve only short verbatim excerpts that express a genuine buying, adoption, migration, workflow, pricing, integration, security, or comparison question. Keep the source URL, retrieval date, and enough non-personal context to interpret it.
5. Cluster semantically equivalent questions. Require at least two independent public questions from separate people and sources for a candidate. Do not infer independence when it cannot be verified.
6. Check relevant official website pages for a clear, direct answer. Classify a candidate as missing only when the inspected pages leave the exact question unresolved. Record the checked page URLs and retrieval dates.
7. Verify the proposed answer from official documentation, help-center material, product pages, or official announcements. Do not convert implication, third-party commentary, or absence of evidence into a product claim.
8. Rank eligible candidates by independent question count, purchase or adoption relevance, consequence of uncertainty, clarity of the website gap, answer confidence, and usefulness of a small page edit. Select exactly one strongest finding.

## Failure behavior

If no candidate has two independently verifiable public questions, a demonstrably missing website answer, and a verified official answer, output only a concise `insufficient evidence` explanation with inspected source URLs, retrieval dates, and explicit limitations. Do not provide a weak lead, generated substitute, page recommendation, or preview instructions.

## Output

Write the result to the path requested by the prompt, or `demo/output/planable-missing-answer.md` for the demo. Produce exactly one strongest finding, using these sections in this order:

1. `These customers asked this`: state the normalized question and exact independent-source count; include at least two short verbatim excerpts, each labeled `Source 1`, `Source 2`, and so on, with source URL and retrieval date, but no person names, handles, or other personal data.
2. `The site does not answer it`: name the official pages checked, their URLs and retrieval dates, and explain precisely why they do not resolve the question.
3. `Here is the verified missing answer`: state only the answer supported by official evidence; cite every official source URL and retrieval date; give confidence as high, medium, or low with one sentence of reasoning.
4. `Proposed page change`: name one exact page and insertion point, provide concise draft copy, and explain how it resolves the evidenced uncertainty.
5. `Preview instructions`: give review-only instructions for loading the real target page, applying the smallest local or in-browser rendered-page edit, preserving its design language, and showing before, changed element, and resulting page in the sibling preview artifact requested by the prompt. Do not alter the live site.
6. `Limitations`: state evidence gaps, snapshot age where applicable, inaccessible sources, and what was not verified. Write `none observed` only when supported.

## Rules

- Never invent or paraphrase a quote, source, retrieval date, customer identity, website gap, official answer, confidence basis, or preview result.
- Never include personal data. Refer to evidence as numbered sources, not identifiable people.
- Never send, publish, deploy, submit, contact anyone, modify a live website, or claim that a proposed preview was executed.
- Never describe committed or cached evidence as live. For Planable, label all findings as snapshot-based and include the snapshot retrieval dates.
- Prefer abstention over an incomplete evidence chain.

## Done when

Finish only when exactly one finding contains two or more independent public question excerpts, source URLs and retrieval dates, checked website evidence, an officially verified answer, confidence, one specific page change, review-only preview instructions, and explicit limitations, with no personal data or external mutation.
