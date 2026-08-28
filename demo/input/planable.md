# Planable official-evidence snapshot

- Target: <https://planable.io/>
- Retrieved: 2026-08-28
- Public-question snapshot: [`planable-public-questions.json`](planable-public-questions.json)
- Expanded Reddit question snapshot: [`planable-reddit-expanded-questions.json`](planable-reddit-expanded-questions.json)
- G2 question snapshot: [`planable-g2-public-questions.json`](planable-g2-public-questions.json)

This is a dated, cached input for the Planable demo. It is not a live crawl. The
linked JSON records two independently authored Reddit posts whose authors were
verified during collection and then redacted. The G2 snapshot records six more
canonically fetched questions from six distinct authors, with the same identity
redaction boundary. The expanded Reddit snapshot records six curated questions
from six distinct authors, one of which overlaps the smaller Reddit snapshot.
Together, the linked files contain seven distinct Reddit questions and six G2
questions.

## Evidence contract

- Use the three linked JSON snapshots only for
  public-question evidence. Preserve their source URLs, timestamps, redaction,
  and independence limits.
- Use only the first-party pages below for Planable feature and answer evidence.
- Treat each excerpt as evidence for exactly what it says, not for adjacent
  capabilities or workflows.
- Do not infer a feature, limitation, account requirement, or product answer
  from silence.
- When first-party pages use overlapping or conflicting language, report the
  conflict as an unresolved limitation unless another cited page resolves it.
- Do not describe this snapshot as current beyond its retrieval date.

## G2 question evidence

The linked G2 snapshot contains six exact third-party questions accepted only
after their canonical G2 pages were fetched. Search titles and snippets were
discovery leads only. Author identities were checked for distinctness during
collection and then omitted.

Two distinct askers form a provisional Instagram Story workflow cluster. One
asks about automatic Story publishing and the other about Story interactivity.
This joins related workflow needs, but the wording and requested capabilities
are not identical. The other four G2 questions do not form a repeated
two-person semantic cluster in this snapshot.

## Expanded Reddit question evidence

The expanded Reddit snapshot is a privacy-reduced subset of 942 fetched Reddit
rows discovered through Google Search Scraper and validated with Reddit Scraper
Lite. It contains five post questions and one comment question from six distinct
authors. The validation run was deliberately aborted after its emitted rows
were saved, so the snapshot does not claim complete coverage of all 117
discovered post URLs.

Four authors fall within a broad alternatives-and-affordability cluster, three
within pre-purchase evaluation, and two within client approval workflow. These
are overlapping semantic groupings, not counts of identical questions. The
questions differ in incumbent tool, price concern, required workflow, analytics,
or draft-quality context. The linked JSON preserves these breadth limitations
and does not make a website-gap judgment.

## Pricing and the per-workspace model

Source: <https://planable.io/pricing/>

Retrieved: 2026-08-28

Verified excerpts:

> A workspace is a dedicated space for one client, brand, or location.

> 60 posts/ workspace/ month

> Unlimited users

> Planable's pricing is per workspace, with unlimited users. It's not priced per seat.

The page displayed Basic at `$33 per workspace per month` and Pro at `$49 per
workspace per month` with the yearly pricing view selected. It also says teams
managing five or more workspaces can contact Planable about Enterprise or volume
pricing. These statements establish the billing unit and displayed snapshot
prices. They do not establish the total price for a particular buyer, a discount
amount, taxes, or future pricing.

## Analytics, reporting, and social inbox

Source: <https://planable.io/pricing/>

Retrieved: 2026-08-28

Verified excerpts:

> Analytics add-on ($14/workspace/month)

> Includes cross-channel performance data, page and post-level metrics, audience insights, and customizable client-ready reports.

> Social inbox add-on ($9/workspace/month)

> Includes a unified inbox for comments and DMs across all connected pages, with AI-suggested replies and sentiment filtering.

The page says both add-ons are available on paid plans, are enabled per
workspace, and include a 30-day trial. It also displays lower add-on prices in
the yearly plan cards. The snapshot therefore supports the presence and stated
scope of the add-ons, but not whether every connected network supports every
metric, comment, DM, reply action, or report field.

## Instagram Stories: direct publishing and native handoff

Sources:

- <https://planable.io/instagram/> — retrieved 2026-08-28
- <https://changelog.planable.io/instagram-stories-direct-publishing-265157> — retrieved 2026-08-28
- <https://changelog.planable.io/enhanced-instagram-story-editor-314011> — retrieved 2026-08-28
- <https://help.planable.io/hc/en-us/articles/21715457579932-Scheduling-Video-Posts-Across-Multiple-Platforms-in-Planable> — retrieved 2026-08-28

Verified excerpts:

> You can publish single image posts, carousels, stories, and reels.

> You can choose to publish via mobile app notification ... and add the desired music or stickers on the spot, within the Instagram app.

> direct publishing is now available for IG business accounts linked to a Facebook page.

> Now you can prepare text, links, music information, mentions, and more for your Instagram stories right in Planable

> When it's time to publish, you'll get a mobile notification to quickly copy and paste all of these into Instagram.

The evidence distinguishes two paths. Eligible Instagram Business accounts can
direct-publish Stories. Native-only finishing such as adding desired music or
stickers uses a mobile notification and an Instagram handoff. The help article
says direct Story publishing cannot be enabled for Instagram Creator accounts,
which can still use the mobile-app path. None of these pages proves that every
native sticker, music item, or interactive element can be automatically
published by Planable.

## Instagram Reels: composition versus importing a native draft

Sources:

- <https://planable.io/instagram/> — retrieved 2026-08-28
- <https://help.planable.io/hc/en-us/articles/21715457579932-Scheduling-Video-Posts-Across-Multiple-Platforms-in-Planable> — retrieved 2026-08-28

Verified excerpts:

> Create single posts, carousels, stories and reels.

> You can publish single image posts, carousels, stories, and reels.

These pages verify creating and publishing Reels through Planable. They do not
state whether Planable can import an unpublished Reel draft created inside the
Instagram app, preserve its native edits or audio, and route that imported draft
through Planable approval. That import workflow is unknown in this snapshot and
must not be inferred from Planable's general Reel support.

## Guest review, formal approval, and email approval

### Public-link review and comments

Sources:

- <https://planable.io/blog/guest-view-links/> — retrieved 2026-08-28
- <https://help.planable.io/hc/en-us/articles/21715458842652-Share-content-with-external-collaborators> — retrieved 2026-08-28

Verified excerpts:

> No account creation. No "can you resend the login?" messages.

> In Planable, you can share individual posts or entire views with external collaborators via a link — no sign-in required.

The guest-view page says public recipients can see content and leave feedback.
It describes sharing content with a legal reviewer, but it does not say a public
guest can perform Planable's formal approval action.

### Formal approval with an account

Sources:

- <https://planable.io/guides/content-approvals-in-planable/> — retrieved 2026-08-28
- <https://help.planable.io/hc/en-us/articles/22581435847324-How-to-get-Client-Approval-for-content-in-Planable> — retrieved 2026-08-28

Verified excerpts:

> Public share links allow viewing and commenting, but not approving.

> To approve content, a client needs a Planable account with Approver role or approval permissions enabled.

> Approver accounts are free.

The help article likewise says no-login public links permit viewing and
feedback, not approval actions. This is the clearest first-party boundary for
the public-link workflow.

### Approval from email

Source: <https://changelog.planable.io/approvals-straight-from-your-inbox-333126>

Retrieved: 2026-08-28

Verified excerpts:

> Approve posts without opening Planable.

> No tab-switching. No logging in just to click approve. If the post is ready, the email is all you need.

The changelog does not state whether the email recipient must first have a
Planable approver account, accept an invitation, or already be authenticated by
an email-specific approval token. Therefore it does not prove anonymous formal
approval and does not supersede the documented public-link limitation.

### Unresolved first-party tension

The first-party language can sound contradictory when read without workflow
labels:

- guest pages promise no account or sign-in for viewing and feedback;
- approval guides require a free approver account for formal approval;
- the email update promises approval without opening or logging into Planable,
  but omits setup and account prerequisites.

The supported conclusion is narrow: public links support no-login review and
comments; formal public-link approval is not supported; configured email
recipients may approve from an email interaction. Whether email approval works
for a recipient who has never had a Planable account remains unknown.

## Snapshot limitations

- The question evidence contains seven distinct Reddit questions and six G2
  questions. The expanded Reddit file contains six questions, including one
  question already present in the smaller two-question Reddit snapshot.
  Within the G2 snapshot, only the provisional two-person Story workflow cluster
  repeats at a broader semantic level; automatic publishing and interactivity
  are not identical asks.
- The first-party pages were inspected as public web pages on 2026-08-28. Their
  content, prices, and product behavior may change.
- No authenticated Planable workspace, billing checkout, approver invitation,
  email approval, Instagram account, or publishing workflow was exercised.
- Network-by-network analytics, inbox coverage, Reel draft import, native audio,
  sticker behavior, and email-approval prerequisites remain unverified except
  where the cited pages state a boundary explicitly.
