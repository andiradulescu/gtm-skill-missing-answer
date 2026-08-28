# Observed insufficient-evidence run

## Frozen expectation

With no public company URL in the invocation, `$missing-answer` should stop
before collection or drafting and state the input requirement.

## Invocation

`$missing-answer: What answer is this website missing?`

No URL or prompt-named input file was supplied.

## Observed response

`insufficient evidence: provide one public company URL`

## Result

Pass. The observed response matches the skill's input-validation rule. No
website was fetched, no question evidence was collected, and no proposed page
change was produced.
