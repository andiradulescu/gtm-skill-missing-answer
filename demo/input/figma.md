# Figma public-evidence snapshot

- Target: <https://www.figma.com/>
- Retrieved: 2026-08-28
- Collection mode: manually verified public snapshot

Use only the dated evidence below for this evaluation. Do not identify the
authors, fetch personal profiles, or describe this snapshot as live.

## Repeated public question

Normalized question: **Can an external client comment on a Figma prototype
without creating or signing in to a Figma account?**

The two records below came from distinct public URLs and visibly different
authors at retrieval. Author identity was deliberately omitted. Their question
text, the two marketing-page excerpts, and the help-center excerpt were
live-verified on 2026-08-28 before this dated evaluation snapshot was written.

### Source 1

- URL: <https://forum.figma.com/suggest-a-feature-11/guest-comments-voting-for-clients-w-o-account-19333>
- Source date: 2022-05-07
- Retrieved: 2026-08-28
- Context: an evaluator trying Figma who says the account requirement would
  prevent migration.
- Verbatim question excerpt: “Wait, what? Clients have to create an account to
  leave comments? Non logged in users cannot provide feedback without
  registering? Is this still the case?”

### Source 2

- URL: <https://www.reddit.com/r/FigmaDesign/comments/yqw5x5/how_do_i_share_a_prototype_with_a_client_that/>
- Source date: 2022-11-10
- Retrieved: 2026-08-28
- Context: a user who had created a prototype share link and was checking the client workflow
- Verbatim question excerpt: “Do you know if clients can comment on a prototype without a Figma account?”

## Marketing pages checked

### UI Design Tool

- URL: <https://www.figma.com/ui-design-tool/>
- Retrieved: 2026-08-28
- Verified excerpt: “Leave and receive feedback directly on designs and prototypes via comments.”
- Gap: the page advertises prototype comments but does not state whether an external commenter must create or sign in to an account.

### Figma for Agencies

- URL: <https://www.figma.com/agencies/>
- Retrieved: 2026-08-28
- Verified excerpt: “Invite clients into Figma to collaborate and comment on the work”
- Gap: the page is specifically for agencies and client collaboration, but does not state the account or sign-in prerequisite for commenting.

## Official answer authority

Source: <https://help.figma.com/hc/en-us/articles/360039824594-Comment-on-prototypes>

Retrieved: 2026-08-28

Verified excerpt:

> You can comment if you're signed in to Figma and have at least view access to the file.

Supported answer: an external client can view a properly shared prototype
without being an editor, but must be signed in to Figma and have at least view
access to comment. This snapshot does not establish what onboarding screens a
new commenter sees, which plan-specific invitation flows apply, or whether Figma
will add anonymous commenting later.

## Requested artifact

Write one finding to `demo/output/figma-missing-answer.md` and a local sibling
preview to `demo/output/figma-missing-answer.html`. The proposed
change should target the client-feedback section of
<https://www.figma.com/agencies/>. Mark the preview as a review-only local draft.
Do not modify the live site.
