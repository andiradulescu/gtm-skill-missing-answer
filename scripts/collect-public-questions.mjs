#!/usr/bin/env node

import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GOOGLE_ACTOR = 'apify~google-search-scraper';
const REDDIT_ACTOR = 'trudax~reddit-scraper-lite';
const QUESTION_START = /^(?:who|what|when|where|why|how|can|could|does|do|is|are|should|would|which)\b/i;

function actorEndpoint(actor) {
  return `https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items?timeout=120&maxTotalChargeUsd=1.00&clean=true`;
}

function parseArguments(argv) {
  const options = {};
  const names = { '--company': 'company', '--domain': 'domain', '--output': 'output', '--raw-fixture': 'rawFixture', '--queries': 'queries' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const name = names[argument];
    if (!name) throw new Error(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
    options[name] = value;
    index += 1;
  }
  for (const required of ['company', 'domain', 'output']) {
    if (!options[required]) throw new Error(`--${required} is required`);
  }
  let domain;
  try { domain = new URL(`https://${options.domain}`).hostname.toLowerCase().replace(/\.$/, ''); }
  catch { throw new Error('--domain must be a valid hostname'); }
  if (domain !== options.domain.toLowerCase().replace(/\.$/, '') || !domain.includes('.')) throw new Error('--domain must be a bare hostname');
  return { ...options, company: options.company.trim(), domain };
}

function boundedQueries(company, domain, supplied) {
  const values = supplied
    ? supplied.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    : [`${company} alternatives`, `${company} reviews`, `${company} pricing questions`, `${company} limitations`, `site:reddit.com ${company}`];
  if (values.length === 0 || values.length > 8) throw new Error('--queries must contain between 1 and 8 queries');
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return values.map((query) => `${query.replace(new RegExp(`\\s*-site:${escapedDomain}(?=\\s|$)`, 'gi'), '').trim()} -site:${domain}`);
}

function parseDotEnv(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    values[match[1]] = value;
  }
  return values;
}

async function loadToken() {
  if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN;
  try {
    const token = parseDotEnv(await readFile(path.join(process.cwd(), '.env'), 'utf8')).APIFY_TOKEN;
    if (token) return token;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  throw new Error('APIFY_TOKEN is required in the environment or cwd .env');
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`${label} must be a JSON array of objects`);
  }
  return value;
}

async function readFixture(filename) {
  let fixture;
  try { fixture = JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in fixture: ${error.message}`);
    throw error;
  }
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) throw new Error('Fixture must be an object with discovery and reddit arrays');
  return { discovery: requireArray(fixture.discovery, 'Fixture discovery'), reddit: requireArray(fixture.reddit, 'Fixture reddit') };
}

async function runActor(actor, token, input) {
  const response = await fetch(actorEndpoint(actor), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`${actor} API request failed with HTTP ${response.status}`);
  try { return requireArray(await response.json(), `${actor} response`); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${actor} API returned invalid JSON: ${error.message}`);
    throw error;
  }
}

function textField(value, names) {
  for (const name of names) {
    if (typeof value?.[name] === 'string' && value[name].trim()) return value[name].trim();
  }
  return '';
}

function decodeHtmlEntities(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (entity, decimal, hexadecimal, name) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    return named[name.toLowerCase()] ?? entity;
  });
}

function sanitize(value) {
  return decodeHtmlEntities(value)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/(^|\s)@[A-Z0-9_][A-Z0-9_.-]*/gi, '$1[redacted-handle]')
    .replace(/(^|[\s(])(?:\/u\/|u\/)[A-Z0-9_-]+/gi, '$1[redacted-author]');
}

function canonicalRedditUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || !['reddit.com', 'www.reddit.com'].includes(hostname)) return null;
  if (!/^\/r\/[^/]+\/comments\/[^/]+(?:\/[^/]*)?\/?$/i.test(url.pathname)) return null;
  url.hostname = 'www.reddit.com';
  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url.href;
}

function discoverRedditUrls(discovery) {
  const candidates = [];
  const queries = [];
  for (const resultPage of discovery) {
    const query = textField(resultPage?.searchQuery, ['term', 'query']) || textField(resultPage, ['query', 'searchQuery']) || 'unknown';
    if (query !== 'unknown' && !queries.includes(query)) queries.push(query);
    if (resultPage.organicResults !== undefined && !Array.isArray(resultPage.organicResults)) throw new Error('organicResults must be an array');
    if (resultPage.peopleAlsoAsk !== undefined && !Array.isArray(resultPage.peopleAlsoAsk)) throw new Error('peopleAlsoAsk must be an array');
    for (const result of resultPage.organicResults ?? []) {
      const sourceUrl = canonicalRedditUrl(textField(result, ['url', 'link']));
      if (sourceUrl && !candidates.some((candidate) => candidate.source_url === sourceUrl)) {
        candidates.push({ source_url: sourceUrl, source_platform: 'reddit', discovery_query: query });
      }
      if (candidates.length === 10) return { candidates, queries };
    }
  }
  return { candidates, queries };
}

async function collectLive(queries) {
  const token = await loadToken();
  const discovery = await runActor(GOOGLE_ACTOR, token, { queries: queries.join('\n'), maxPagesPerQuery: 1, resultsPerPage: 10 });
  const { candidates } = discoverRedditUrls(discovery);
  if (candidates.length === 0) return { discovery, reddit: [] };
  const reddit = await runActor(REDDIT_ACTOR, token, {
    startUrls: candidates.map(({ source_url }) => ({ url: source_url })),
    skipComments: true,
    includeMediaLinks: false,
    includeNSFW: false,
    maxItems: 10,
    maxPostCount: 10,
    maxComments: 0,
  });
  return { discovery, reddit };
}

function explicitQuestion(title, body) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  if (cleanTitle.endsWith('?') || QUESTION_START.test(cleanTitle)) return cleanTitle.slice(0, 280);
  for (const line of body.split(/\r?\n/)) {
    const clean = line.replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(.{1,279}?\?)(?:\s|$)/);
    if (match && QUESTION_START.test(match[1])) return match[1];
    if (QUESTION_START.test(clean) && clean.length <= 280) return clean;
  }
  return '';
}

function normalize({ discovery, reddit }, { company, domain, mode, liveQueries }) {
  const retrievedAt = new Date().toISOString();
  const { candidates, queries: fixtureQueries } = discoverRedditUrls(discovery);
  const candidateByUrl = new Map(candidates.map((candidate) => [candidate.source_url, candidate]));
  const seen = new Set();
  const rawAuthors = new Set();
  const seenAuthors = new Set();
  let duplicateAuthorPostsExcluded = 0;
  const questions = [];
  for (const post of reddit) {
    if (textField(post, ['dataType', 'type']).toLowerCase() !== 'post') continue;
    const sourceUrl = canonicalRedditUrl(textField(post, ['canonicalUrl', 'url', 'postUrl', 'link']));
    const candidate = candidateByUrl.get(sourceUrl);
    if (!candidate || post.isDeleted === true || post.isRemoved === true || post.deleted === true || post.removed === true) continue;
    const title = textField(post, ['title']);
    const body = textField(post, ['body', 'text', 'selftext']);
    if (/^\[(?:deleted|removed)\]$/i.test(title) || /^\[(?:deleted|removed)\]$/i.test(body)) continue;
    const question = explicitQuestion(title, body);
    const key = question.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    if (!question || seen.has(key)) continue;
    const rawAuthor = textField(post, ['username', 'userId', 'author', 'authorName']);
    if (rawAuthor && seenAuthors.has(rawAuthor)) {
      duplicateAuthorPostsExcluded += 1;
      continue;
    }
    seen.add(key);
    if (rawAuthor) seenAuthors.add(rawAuthor);
    if (rawAuthor) rawAuthors.add(rawAuthor);
    const excerpt = sanitize(body.replace(/\s+/g, ' ').trim()).slice(0, 280);
    questions.push({
      question: sanitize(question),
      excerpt,
      context: excerpt,
      source_url: sourceUrl,
      source_domain: 'www.reddit.com',
      source_platform: 'reddit',
      source_type: 'reddit_post',
      discovery_query: candidate.discovery_query,
      validation: 'fetched-source',
      author_available: Boolean(rawAuthor),
      author_redacted: Boolean(rawAuthor),
      created_at: textField(post, ['createdAt', 'created_at', 'date']) || null,
      retrieved_at: retrievedAt,
    });
  }
  if (questions.length === 0) throw new Error('No qualifying fetched Reddit questions were found');
  return {
    schema_version: 1,
    subject: { name: company, domain },
    retrieved_at: retrievedAt,
    collection_mode: mode,
    actors: {
      discovery: { id: GOOGLE_ACTOR, endpoint: actorEndpoint(GOOGLE_ACTOR), max_pages_per_query: 1, results_per_page: 10 },
      validation: { id: REDDIT_ACTOR, endpoint: actorEndpoint(REDDIT_ACTOR), max_source_urls: 10, comments: false },
    },
    queries: mode === 'live-apify' ? liveQueries : fixtureQueries,
    discovered_sources: candidates,
    independence_check: {
      distinct_authors_verified_at_collection: rawAuthors.size >= 2,
      accepted_posts_with_author: rawAuthors.size,
      duplicate_author_posts_excluded: duplicateAuthorPostsExcluded,
    },
    questions,
  };
}

async function writeJsonAtomically(filename, value) {
  const absolute = path.resolve(filename);
  const temporary = `${absolute}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, absolute);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const queries = boundedQueries(options.company, options.domain, options.queries);
  const mode = options.rawFixture ? 'fixture' : 'live-apify';
  const raw = options.rawFixture ? await readFixture(options.rawFixture) : await collectLive(queries);
  await writeJsonAtomically(options.output, normalize(raw, { ...options, mode, liveQueries: queries }));
}

main().catch((error) => {
  console.error(`collect-public-questions: ${error.message}`);
  process.exitCode = 1;
});
