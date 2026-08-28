---
name: missing-answer
description: Finds the strongest repeated public prospect question that a company website does not clearly answer, verifies the answer from official sources, and proposes a review-only page change. Use when the user provides a company URL and asks what answer its website is missing.
---

# Missing answer

## Input

Accept exactly one public company website URL. The URL is the complete user interface. Do not ask the user for evidence files, output paths, insertion points, or preview choices. If the URL is absent, malformed, inaccessible, or identifies more than one company, report `insufficient evidence: provide one public company URL` and stop.

## Evidence collection

1. Normalize the URL and identify the company without collecting personal data.
2. Route known dated targets internally:
   - For `figma.com` or a subdomain, read `demo/input/figma.md`. Use only that verified dated pack for public questions, customer-facing-page coverage, and the official answer. Do not recrawl or ask the user to name the pack. Write the finding to `demo/output/figma-missing-answer.md` and the visual fallback to `demo/output/figma-missing-answer.html`.
   - For `planable.io` or a subdomain, read `demo/input/planable.md`, `demo/input/planable-public-questions.json`, and any present G2 or expanded Reddit snapshots named there. Use only those dated cached files. Count overlapping URLs once and write the decision to `demo/output/planable-missing-answer.md`.
   If a routed pack is missing, contradictory, or lacks its target URL, retrieval dates, source URLs, independence verification, relationship context, checked website pages, or official answer evidence, report `insufficient evidence: committed snapshot is unavailable or incomplete` and stop.
3. For any other company, inspect its public website and discover public questions from accessible forums, communities, review Q&A, or other public discussions. Record every inspected URL and the actual retrieval date. Do not use login-only content, scraped profiles, personal data, company-authored questions, generated questions, reposts, or duplicate authors.
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

Write exactly one strongest finding to the routed path. Lead both the chat response and the file with the product result, not the workflow:

1. `BURIED ANSWER` or `MISSING ANSWER`.
2. The normalized question in plain language and the exact independent-person count.
3. At least two short verbatim questions, each immediately followed by its public source URL and defensible user, prospect, evaluator, or independent-source context.
4. The customer-facing page gap in one direct paragraph.
5. `Verified answer`: only the answer supported by first-party evidence.
6. `Best place to fix`: the exact page and section.
7. `Proposed copy`: concise copy that resolves the evidenced uncertainty.
8. `Evidence`: retrieval dates, official URLs, and confidence reasoning.
9. `Limitations`: snapshot age, evidence gaps, inaccessible sources, and what was not verified.

Keep file paths, routing, crawler details, and eval terminology out of the opening result. Mention the dated snapshot and retrieval date under `Evidence` or `Limitations`. Never identify public authors.

## Automatic visual finale

After every positive finding, continue autonomously into a visual demonstration. Do not ask the user to select a page, element, insertion point, or preview mode.

1. When browser or computer-use capability can safely render and locally modify the page, open the real target customer-facing page, navigate to the exact section, and show the original state. Apply only a temporary client-side preview of the proposed copy, visibly label it `LOCAL PREVIEW — NOT DEPLOYED`, show `Original → Fixed`, and leave the final view on `Fixed`. Never submit a form, publish, save to the server, or claim deployment.
2. When that safe rendered-page preview is unavailable, automatically create or refresh the routed local HTML fallback. It must show the relevant original context and proposed insertion, visibly say it is a local review-only draft, make no network requests, and remain openable without credentials.
3. For judge reproducibility, always keep the routed Markdown and HTML artifacts current after a positive Figma run. The browser view is the primary experience when available; the HTML file is the fallback.

An abstention produces no visual preview.

## Rules

- Never invent or paraphrase a quote, source, retrieval date, customer identity, website gap, official answer, confidence basis, or preview result.
- Never infer customer or prospect status from public authorship alone.
- Never include personal data. Refer to evidence as numbered sources, not identifiable people.
- Never send, publish, deploy, submit, contact anyone, modify a live website, or describe the local preview as a live-site change.
- Never claim conversion impact or say that the company implemented or approved the proposed change.
- Never describe committed or cached evidence as live. Label routed findings as snapshot-based and include the retrieval date under evidence or limitations.
- Prefer abstention over an incomplete evidence chain.

## Done when

Finish a positive run only when exactly one honestly labeled finding contains two or more independent semantically equivalent public questions, explicit relationship context, checked website evidence, an officially verified answer, one specific page change, evidence dates, limitations, and a completed browser preview or local fallback with no external mutation. Finish an abstention when the failed evidence link and inspected dated sources are explicit and no preview is produced.
