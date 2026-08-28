import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./validate-question-snapshot.mjs', import.meta.url));
const snapshot = fileURLToPath(new URL('../demo/input/planable-public-questions.json', import.meta.url));

function run(filename) {
  return spawnSync(process.execPath, [script, filename], { encoding: 'utf8', env: {} });
}

async function badSnapshot(change) {
  const value = JSON.parse(await readFile(snapshot, 'utf8'));
  change(value);
  const directory = await mkdtemp(path.join(tmpdir(), 'question-snapshot-validator-'));
  const filename = path.join(directory, 'snapshot.json');
  await writeFile(filename, JSON.stringify(value));
  return { filename, result: run(filename) };
}

test('accepts the checked-in Planable public-question snapshot', () => {
  const result = run(snapshot);
  assert.equal(result.status, 0, result.stderr);
});

const invalidCases = [
  ['invalid schema metadata', (value) => { value.schema_version = 2; }],
  ['an empty questions list', (value) => { value.questions = []; }],
  ['a missing required question field', (value) => { delete value.questions[0].context; }],
  ['a question not validated from its fetched source', (value) => { value.questions[0].validation = 'discovery-result'; }],
  ['an unavailable author', (value) => { value.questions[0].author_available = false; }],
  ['an unredacted author', (value) => { value.questions[0].author_redacted = false; }],
  ['duplicate source URLs', (value) => { value.questions[1].source_url = value.questions[0].source_url; }],
  ['a source URL on the subject domain', (value) => { value.questions[0].source_url = 'https://help.planable.io/question'; }],
  ['identity-like fields', (value) => { value.questions[0].user_id = 'private-123'; }],
  ['an incorrect accepted-author count', (value) => { value.independence_check.accepted_posts_with_author = 1; }],
  ['unverified distinct authors', (value) => { value.independence_check.distinct_authors_verified_at_collection = false; }],
  ['a negative exclusion count', (value) => { value.independence_check.duplicate_author_posts_excluded = -1; }],
  ['discovery-only URL lists', (value) => { value.discovered_sources = ['https://example.com/unfetched']; }],
];

for (const [description, change] of invalidCases) {
  test(`rejects ${description}`, async () => {
    const { result } = await badSnapshot(change);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /^validate-question-snapshot: /);
  });
}

test('does not print sensitive field values when rejecting identity data', async () => {
  const secret = 'private-person-9381@example.com';
  const { result } = await badSnapshot((value) => { value.questions[0].email = secret; });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});
