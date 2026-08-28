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
          { title: 'Unknown author', url: 'https://www.reddit.com/r/socialmedia/comments/unknown/planable_question/' },
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
        {
          dataType: 'post',
          url: 'https://www.reddit.com/r/socialmedia/comments/unknown/planable_question/',
          title: 'Does Planable support this workflow?',
          body: 'The source actor did not return a verifiable author.',
          createdAt: '2026-08-21T12:00:00.000Z',
        },
      ],
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(collected.schema_version, 1);
  assert.deepEqual(collected.subject, { name: 'Planable', domain: 'planable.io' });
  assert.equal(collected.collection_mode, 'fixture');
  assert.ok(!('discovered_sources' in collected));
  assert.equal(collected.discovery_summary.canonical_reddit_urls_found, 2);
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
  assert.ok(collected.questions.every((question) => !('score' in question)));
  assert.equal(collected.independence_check.distinct_authors_verified_at_collection, false);
  assert.equal(collected.independence_check.accepted_posts_with_author, 1);
  assert.equal(collected.independence_check.duplicate_author_posts_excluded, 0);
  assert.equal(collected.independence_check.unverifiable_author_posts_excluded, 1);
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
        { dataType: 'post', url: 'https://www.reddit.com/r/investing/comments/example/stock_estate/', title: 'What are Stock Estate fees?', body: 'I cannot find a clear fee table.', createdAt: '2026-08-21T12:00:00Z', username: 'verified_source' },
      ],
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.deepEqual(collected.subject, { name: 'Stock Estate', domain: 'stock.estate' });
  assert.deepEqual(collected.questions.map((item) => item.question), ['What are Stock Estate fees?']);
  assert.equal(collected.questions[0].source_domain, 'www.reddit.com');
});

test('redacts Reddit attribution and excludes crossposts from the same author', async () => {
  const { result, output } = await runFixture({
    company: 'Planable',
    domain: 'planable.io',
    raw: {
      discovery: [{
        searchQuery: { term: 'site:reddit.com Planable -site:planable.io' },
        organicResults: [
          { title: 'First post', url: 'https://www.reddit.com/r/one/comments/first/planable_question/' },
          { title: 'Crosspost', url: 'https://www.reddit.com/r/two/comments/second/planable_question/' },
        ],
      }],
      reddit: [
        {
          dataType: 'post',
          url: 'https://www.reddit.com/r/one/comments/first/planable_question/',
          title: 'Do you know a cheaper Planable alternative?',
          body: 'Anyone know a cheaper option? &amp; why? submitted by /u/real_person',
          username: 'real_person',
        },
        {
          dataType: 'post',
          url: 'https://www.reddit.com/r/two/comments/second/planable_question/',
          title: '[Crosspost] Is there a cheaper Planable alternative?',
          body: 'Anyone know a cheaper option? submitted by u/real_person',
          username: 'real_person',
        },
      ],
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(collected.questions.length, 1);
  assert.equal(collected.questions[0].excerpt, 'Anyone know a cheaper option? & why?');
  assert.equal(collected.questions[0].author_available, true);
  assert.equal(collected.independence_check.duplicate_author_posts_excluded, 1);
  assert.ok(!JSON.stringify(collected).includes('real_person'));
  assert.ok(!JSON.stringify(collected).includes('/u/'));
});

test('expands bounded discovery and retains only fetched qualifying Reddit comments', async () => {
  const discoveredPosts = Array.from({ length: 105 }, (_, index) => ({
    title: `Planable discussion ${index}`,
    url: `https://www.reddit.com/r/socialmedia/comments/post${index}/planable_discussion_${index}/`,
  }));
  const parentUrl = discoveredPosts[0].url;
  const duplicateAuthorPostUrl = discoveredPosts[1].url;
  const { result, output } = await runFixture({
    company: 'Planable',
    domain: 'planable.io',
    raw: {
      discovery: [{
        searchQuery: { term: 'site:reddit.com Planable -site:planable.io' },
        organicResults: discoveredPosts,
        peopleAlsoAsk: [{
          question: 'Does Planable let clients approve without an account?',
          link: 'https://www.reddit.com/r/socialmedia/comments/paa/not_a_fetched_source/',
        }],
      }],
      reddit: [
        {
          dataType: 'post',
          id: 't3_post0',
          url: parentUrl,
          title: 'Planable workflow discussion',
          body: 'We are evaluating Planable for client review at our agency.',
          username: 'parent_author',
          createdAt: '2026-08-20T10:00:00.000Z',
        },
        {
          dataType: 'comment',
          postId: 't3_post0',
          url: `${parentUrl}comment1/`,
          body: 'Does it let clients approve without an account?',
          username: 'comment_author',
          createdAt: '2026-08-20T11:00:00.000Z',
        },
        {
          dataType: 'comment',
          postId: 't3_post0',
          url: `${parentUrl}comment2/`,
          body: 'I wonder whether approvals need an account.',
          username: 'not_an_interrogative',
        },
        {
          dataType: 'comment',
          postId: 't3_post0',
          url: `${parentUrl}comment3/`,
          body: '[removed]',
          username: 'removed_author',
        },
        {
          dataType: 'comment',
          postId: 't3_post0',
          url: `${parentUrl}comment4/`,
          body: 'Does it support this workflow?',
        },
        {
          dataType: 'post',
          id: 't3_post2',
          url: discoveredPosts[2].url,
          title: 'Planable won an award',
          body: 'A brief award announcement.',
          username: 'announcement_author',
        },
        {
          dataType: 'comment',
          postId: 't3_post2',
          url: `${discoveredPosts[2].url}comment5/`,
          body: 'Does it support this workflow?',
          username: 'unrelated_context_author',
        },
        {
          dataType: 'post',
          id: 't3_post1',
          url: duplicateAuthorPostUrl,
          title: 'Can Planable handle agency approvals?',
          body: 'I am evaluating the product.',
          username: 'comment_author',
          createdAt: '2026-08-21T11:00:00.000Z',
        },
      ],
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const collected = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(collected.discovery_summary.canonical_reddit_urls_found, 100);
  assert.ok(collected.actors.discovery.max_pages_per_query > 1);
  assert.ok(collected.actors.discovery.results_per_page >= 100);
  assert.ok(collected.actors.validation.max_source_urls >= 100);
  assert.equal(collected.actors.validation.comments, true);
  assert.deepEqual(collected.questions.map(({ question }) => question), [
    'Does it let clients approve without an account?',
  ]);
  assert.equal(collected.questions[0].source_type, 'reddit_comment');
  assert.equal(collected.questions[0].source_url, `${parentUrl}comment1/`);
  assert.equal(collected.questions[0].excerpt, 'Does it let clients approve without an account?');
  assert.equal(collected.questions[0].context, 'Planable workflow discussion We are evaluating Planable for client review at our agency.');
  assert.equal(collected.questions[0].created_at, '2026-08-20T11:00:00.000Z');
  assert.equal(collected.questions[0].validation, 'fetched-source');
  assert.equal(collected.independence_check.accepted_posts_with_author, 1);
  assert.equal(collected.independence_check.accepted_questions_with_author, 1);
  assert.equal(collected.independence_check.duplicate_author_questions_excluded, 1);
  assert.equal(collected.independence_check.unverifiable_author_questions_excluded, 1);
  assert.ok(!JSON.stringify(collected).includes('comment_author'));
  assert.ok(!collected.questions.some(({ source_url }) => source_url.includes('/paa/')));
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
