import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./collect-public-questions.mjs', import.meta.url));

async function runFixture({ company, domain, raw }) {
  const directory = await mkdtemp(path.join(tmpdir(), 'public-question-collector-'));
  const fixture = path.join(directory, 'raw.json');
  const output = path.join(directory, 'questions.json');
  await writeFile(fixture, JSON.stringify(raw));
  const result = spawnSync(process.execPath, [
    script, '--company', company, '--domain', domain, '--output', output, '--raw-fixture', fixture,
  ], { cwd: directory, encoding: 'utf8', env: {} });
  return { result, output };
}

test('Planable fixture writes normalized, sanitized, deduplicated questions and excludes first-party domains', async () => {
  const { result, output } = await runFixture({
    company: 'Planable',
    domain: 'planable.io',
    raw: [{
      searchQuery: { term: 'planable alternatives -site:planable.io' },
      organicResults: [
        { title: 'What is the best Planable alternative?', url: 'https://example.com/alternatives', description: 'Ask sam@example.com or @socialexpert for details.' },
        { title: 'What is the best Planable alternative?', link: 'https://another.example/review', snippet: 'Duplicate result.' },
        { title: 'How does Planable work?', url: 'https://blog.planable.io/how-it-works', description: 'First-party result.' },
        { title: 'Planable pricing overview', url: 'https://example.com/pricing', description: 'Not an explicit question.' },
      ],
      peopleAlsoAsk: [
        { question: 'Does Planable have a free plan?', link: 'https://reviews.example/free-plan', snippet: 'Independent answer.' },
      ],
    }],
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(collected.schema_version, 1);
  assert.deepEqual(collected.subject, { name: 'Planable', domain: 'planable.io' });
  assert.equal(collected.collection_mode, 'fixture');
  assert.deepEqual(collected.queries, ['planable alternatives -site:planable.io']);
  assert.deepEqual(
    collected.questions.map(({ question, source_type, source_domain }) => ({ question, source_type, source_domain })),
    [
      { question: 'What is the best Planable alternative?', source_type: 'organic_result', source_domain: 'example.com' },
      { question: 'Does Planable have a free plan?', source_type: 'people_also_ask', source_domain: 'reviews.example' },
    ],
  );
  assert.equal(collected.questions[0].context, 'Ask [redacted-email] or [redacted-handle] for details.');
  assert.ok(collected.retrieved_at);
  assert.ok(collected.questions.every((question) => question.retrieved_at === collected.retrieved_at));
  assert.ok(!JSON.stringify(collected).includes('sam@example.com'));
  assert.ok(!JSON.stringify(collected).includes('@socialexpert'));
});

test('stock.estate fixture excludes the apex domain and subdomains after URL parsing', async () => {
  const { result, output } = await runFixture({
    company: 'Stock Estate',
    domain: 'stock.estate',
    raw: [{
      searchQuery: { term: 'Stock Estate reviews -site:stock.estate' },
      organicResults: [
        { title: 'Is Stock Estate trustworthy?', url: 'https://stock.estate/reviews' },
        { title: 'How does Stock Estate work?', url: 'https://help.stock.estate/guide' },
        { title: 'What are Stock Estate fees?', url: 'https://www.reddit.com/r/investing/comments/example' },
      ],
    }],
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.deepEqual(collected.subject, { name: 'Stock Estate', domain: 'stock.estate' });
  assert.deepEqual(collected.questions.map((item) => item.question), ['What are Stock Estate fees?']);
  assert.equal(collected.questions[0].source_domain, 'www.reddit.com');
});

test('live mode fails meaningfully when APIFY_TOKEN is unavailable', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'public-question-collector-'));
  const output = path.join(directory, 'questions.json');
  const result = spawnSync(process.execPath, [
    script, '--company', 'Planable', '--domain', 'planable.io', '--output', output,
  ], { cwd: directory, encoding: 'utf8', env: {} });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /APIFY_TOKEN/);
  assert.doesNotMatch(result.stdout + result.stderr, /Bearer/);
});
