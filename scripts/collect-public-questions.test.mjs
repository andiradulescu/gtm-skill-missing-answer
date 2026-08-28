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

test('Planable fixture accepts only fetched Reddit posts discovered through Google', async () => {
  const { result, output } = await runFixture({
    company: 'Planable',
    domain: 'planable.io',
    raw: {
      discovery: [{
        searchQuery: { term: 'planable alternatives -site:planable.io' },
        organicResults: [
          { title: 'What is the best Planable alternative?', url: 'https://example.com/alternatives', description: 'SERP-only question.' },
          { title: 'Planable discussion', url: 'https://www.reddit.com/r/socialmedia/comments/abc123/planable_discussion/' },
          { title: 'How does Planable work?', url: 'https://blog.planable.io/how-it-works' },
        ],
        peopleAlsoAsk: [
          { question: 'Does Planable have a free plan?', link: 'https://reviews.example/free-plan' },
        ],
      }],
      reddit: [
        {
          dataType: 'post',
          url: 'https://www.reddit.com/r/socialmedia/comments/abc123/planable_discussion/',
          title: 'What is the best alternative to Planable?',
          body: 'Ask sam@example.com or @socialexpert for details. The rest is intentionally short.',
          createdAt: '2026-08-20T12:00:00.000Z',
          username: 'private_author',
          score: 42,
        },
        {
          dataType: 'post',
          url: 'https://www.reddit.com/r/socialmedia/comments/abc123/planable_discussion/',
          title: 'What is the best alternative to Planable?',
          body: 'Duplicate actor row.',
          createdAt: '2026-08-20T12:00:00.000Z',
        },
      ],
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(collected.schema_version, 1);
  assert.deepEqual(collected.subject, { name: 'Planable', domain: 'planable.io' });
  assert.equal(collected.collection_mode, 'fixture');
  assert.deepEqual(collected.queries, ['planable alternatives -site:planable.io']);
  assert.equal(collected.questions.length, 1);
  assert.equal(collected.questions[0].question, 'What is the best alternative to Planable?');
  assert.equal(collected.questions[0].source_platform, 'reddit');
  assert.equal(collected.questions[0].validation, 'fetched-source');
  assert.equal(collected.questions[0].created_at, '2026-08-20T12:00:00.000Z');
  assert.equal(collected.questions[0].excerpt, 'Ask [redacted-email] or [redacted-handle] for details. The rest is intentionally short.');
  assert.ok(collected.retrieved_at);
  assert.ok(collected.questions.every((question) => question.retrieved_at === collected.retrieved_at));
  assert.ok(!collected.questions.some((item) => item.question === 'What is the best Planable alternative?'));
  assert.ok(!collected.questions.some((item) => item.question === 'Does Planable have a free plan?'));
  assert.ok(!JSON.stringify(collected).includes('sam@example.com'));
  assert.ok(!JSON.stringify(collected).includes('@socialexpert'));
  assert.ok(!JSON.stringify(collected).includes('private_author'));
  assert.ok(!JSON.stringify(collected).includes('42'));
});

test('stock.estate fixture excludes the apex domain and subdomains after URL parsing', async () => {
  const { result, output } = await runFixture({
    company: 'Stock Estate',
    domain: 'stock.estate',
    raw: {
      discovery: [{
        searchQuery: { term: 'Stock Estate reviews -site:stock.estate' },
        organicResults: [
          { title: 'Is Stock Estate trustworthy?', url: 'https://stock.estate/reviews' },
          { title: 'How does Stock Estate work?', url: 'https://help.stock.estate/guide' },
          { title: 'Stock Estate discussion', url: 'https://www.reddit.com/r/investing/comments/example/stock_estate/' },
        ],
      }],
      reddit: [
        { dataType: 'post', url: 'https://www.reddit.com/r/investing/comments/example/stock_estate/', title: 'What are Stock Estate fees?', body: 'I cannot find a clear fee table.', createdAt: '2026-08-21T12:00:00Z' },
      ],
    },
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
