#!/usr/bin/env node

import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOOGLE_ACTOR = 'apify~google-search-scraper';
const REDDIT_ACTOR = 'trudax~reddit-scraper-lite';
const QUESTION_START = /^(?:who|what|when|where|why|how|can|could|does|do|is|are|should|would|which)\b/i;
const DEFAULT_MAX_SOURCE_URLS = 100;
const DEFAULT_MAX_PAGES_PER_QUERY = 3;
const RESULTS_PER_PAGE = 100;
const MAX_SOURCE_URLS_LIMIT = 200;
const MAX_PAGES_PER_QUERY_LIMIT = 10;
const APIFY_API = 'https://api.apify.com';
const REDDIT_MAX_CHARGE_USD = 8;
const REDDIT_MAX_ITEMS = 5000;
const REDDIT_MAX_COMMENTS = 40;
const REDDIT_POLL_INTERVAL_MS = 5000;
const REDDIT_MAX_WAIT_MS = 15 * 60 * 1000;
const TERMINAL_RUN_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);

function actorEndpoint(actor) {
  return `https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items?timeout=120&maxTotalChargeUsd=1.00&clean=true`;
}

function parseArguments(argv) {
  const options = {};
  const names = {
    '--company': 'company',
    '--domain': 'domain',
    '--output': 'output',
    '--raw-fixture': 'rawFixture',
    '--queries': 'queries',
    '--max-source-urls': 'maxSourceUrls',
    '--max-pages-per-query': 'maxPagesPerQuery',
  };
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
  const maxSourceUrls = boundedInteger(options.maxSourceUrls, '--max-source-urls', DEFAULT_MAX_SOURCE_URLS, 1, MAX_SOURCE_URLS_LIMIT);
  const maxPagesPerQuery = boundedInteger(options.maxPagesPerQuery, '--max-pages-per-query', DEFAULT_MAX_PAGES_PER_QUERY, 1, MAX_PAGES_PER_QUERY_LIMIT);
  return { ...options, company: options.company.trim(), domain, maxSourceUrls, maxPagesPerQuery };
}

function boundedInteger(raw, name, fallback, minimum, maximum) {
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  const value = Number.parseInt(raw, 10);
  if (value < minimum || value > maximum) throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  return value;
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
  const responseBody = await response.text();
  if (!response.ok) {
    const detail = responseBody.replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`${actor} API request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  try { return requireArray(JSON.parse(responseBody), `${actor} response`); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${actor} API returned invalid JSON: ${error.message}`);
    throw error;
  }
}

async function responseJson(response, label) {
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}`);
  try { return JSON.parse(await response.text()); }
  catch { throw new Error(`${label} returned invalid JSON`); }
}

function actorRunRecord(value, label) {
  const run = value?.data;
  if (!run || typeof run !== 'object' || typeof run.id !== 'string' || typeof run.status !== 'string') {
    throw new Error(`${label} did not return a valid actor run`);
  }
  return run;
}

export async function runRedditActorAsync(token, startUrls, dependencies = {}) {
  const {
    fetchImpl = fetch,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    now = Date.now,
    pollIntervalMs = REDDIT_POLL_INTERVAL_MS,
    maxWaitMs = REDDIT_MAX_WAIT_MS,
    onProgress = () => {},
  } = dependencies;
  if (!Array.isArray(startUrls) || startUrls.length === 0 || startUrls.length > MAX_SOURCE_URLS_LIMIT) {
    throw new Error(`Reddit actor requires between 1 and ${MAX_SOURCE_URLS_LIMIT} source URLs`);
  }
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const input = {
    startUrls,
    skipComments: false,
    includeMediaLinks: false,
    includeNSFW: false,
    maxComments: REDDIT_MAX_COMMENTS,
    maxPostCount: startUrls.length,
    maxItems: Math.min(REDDIT_MAX_ITEMS, Math.max(50, startUrls.length * 50)),
  };
  const startResponse = await fetchImpl(
    `${APIFY_API}/v2/acts/${REDDIT_ACTOR}/runs?maxTotalChargeUsd=${REDDIT_MAX_CHARGE_USD}`,
    { method: 'POST', headers, body: JSON.stringify(input) },
  );
  let run = actorRunRecord(await responseJson(startResponse, 'Reddit actor start'), 'Reddit actor start');
  const startedAt = now();
  onProgress(run.status);

  while (!TERMINAL_RUN_STATUSES.has(run.status)) {
    await sleep(pollIntervalMs);
    if (now() - startedAt >= maxWaitMs) throw new Error(`Reddit actor run did not complete within ${maxWaitMs} ms`);
    const statusResponse = await fetchImpl(`${APIFY_API}/v2/actor-runs/${encodeURIComponent(run.id)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    run = actorRunRecord(await responseJson(statusResponse, 'Reddit actor status'), 'Reddit actor status');
    onProgress(run.status);
  }

  if (run.status !== 'SUCCEEDED') throw new Error(`Reddit actor run failed with status ${run.status}`);
  if (typeof run.defaultDatasetId !== 'string' || !run.defaultDatasetId) {
    throw new Error('Successful Reddit actor run did not return a dataset');
  }
  const datasetResponse = await fetchImpl(
    `${APIFY_API}/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  return requireArray(await responseJson(datasetResponse, 'Reddit actor dataset'), 'Reddit actor dataset');
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

function parsedRedditUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || !['reddit.com', 'www.reddit.com'].includes(hostname)) return null;
  url.hostname = 'www.reddit.com';
  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url;
}

function canonicalRedditPostUrl(rawUrl) {
  const url = parsedRedditUrl(rawUrl);
  if (!url || !/^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/?$/i.test(url.pathname)) return null;
  return url.href;
}

function canonicalRedditCommentUrl(rawUrl) {
  const url = parsedRedditUrl(rawUrl);
  if (!url || !/^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/[^/]+\/?$/i.test(url.pathname)) return null;
  return url.href;
}

function discoverRedditUrls(discovery, maxSourceUrls = DEFAULT_MAX_SOURCE_URLS) {
  const candidates = [];
  const queries = [];
  for (const resultPage of discovery) {
    const query = textField(resultPage?.searchQuery, ['term', 'query']) || textField(resultPage, ['query', 'searchQuery']) || 'unknown';
    if (query !== 'unknown' && !queries.includes(query)) queries.push(query);
    if (resultPage.organicResults !== undefined && !Array.isArray(resultPage.organicResults)) throw new Error('organicResults must be an array');
    if (resultPage.peopleAlsoAsk !== undefined && !Array.isArray(resultPage.peopleAlsoAsk)) throw new Error('peopleAlsoAsk must be an array');
    for (const result of resultPage.organicResults ?? []) {
      const sourceUrl = canonicalRedditPostUrl(textField(result, ['url', 'link']));
      if (sourceUrl && !candidates.some((candidate) => candidate.source_url === sourceUrl)) {
        candidates.push({ source_url: sourceUrl, source_platform: 'reddit', discovery_query: query });
      }
      if (candidates.length === maxSourceUrls) return { candidates, queries };
    }
  }
  return { candidates, queries };
}

async function collectLive(queries, { maxSourceUrls, maxPagesPerQuery }) {
  const token = await loadToken();
  const discovery = await runActor(GOOGLE_ACTOR, token, {
    queries: queries.join('\n'),
    maxPagesPerQuery,
    resultsPerPage: RESULTS_PER_PAGE,
  });
  const { candidates } = discoverRedditUrls(discovery, maxSourceUrls);
  if (candidates.length === 0) return { discovery, reddit: [] };
  const reddit = await runRedditActorAsync(
    token,
    candidates.map(({ source_url }) => ({ url: source_url })),
    { onProgress: (status) => console.error(`collect-public-questions: Reddit actor ${status}`) },
  );
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

function literalCommentQuestion(body) {
  const clean = body.replace(/\s+/g, ' ').trim();
  const match = clean.match(/(?:^|[.!]\s+)((?:who|what|when|where|why|how|can|could|does|do|is|are|should|would|which)\b[^?]{0,279}\?)/i);
  return match?.[1] ?? '';
}

function mentionsSubject(value, company, domain) {
  const names = [company, domain, domain.split('.')[0]].map((item) => item.trim()).filter(Boolean);
  return names.some((name) => new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(value));
}

function hasSubjectRelationship(value, company, domain) {
  if (!mentionsSubject(value, company, domain)) return false;
  return /\b(?:evaluat\w*|using|used|use|customer\w*|client\w*|workflow\w*|alternative\w*|switch\w*|trial\w*|pricing|price\w*|feature\w*|support\w*|account\w*|approv\w*|schedul\w*|manag\w*|need\w*|looking|who|what|when|where|why|how|can|could|does|do|is|are|should|would|which)\b/i.test(value);
}

function isRemoved(item, ...values) {
  if (item.isDeleted === true || item.isRemoved === true || item.deleted === true || item.removed === true) return true;
  return values.some((value) => /^\[(?:deleted|removed)\]$/i.test(value.trim()));
}

function verifiedAuthor(item) {
  const author = textField(item, ['username']);
  return /^\[(?:deleted|removed)\]$/i.test(author) ? '' : author;
}

function normalize({ discovery, reddit }, { company, domain, mode, liveQueries, maxSourceUrls, maxPagesPerQuery }) {
  const retrievedAt = new Date().toISOString();
  const { candidates, queries: fixtureQueries } = discoverRedditUrls(discovery, maxSourceUrls);
  const candidateByUrl = new Map(candidates.map((candidate) => [candidate.source_url, candidate]));
  const fetchedParents = new Map();
  for (const item of reddit) {
    if (textField(item, ['dataType']).toLowerCase() !== 'post') continue;
    const sourceUrl = canonicalRedditPostUrl(textField(item, ['url']));
    const id = textField(item, ['id']);
    const title = textField(item, ['title']);
    const body = textField(item, ['body']);
    if (!id || !candidateByUrl.has(sourceUrl) || isRemoved(item, title, body)) continue;
    fetchedParents.set(id, { sourceUrl, title, body, candidate: candidateByUrl.get(sourceUrl) });
  }
  const seen = new Set();
  const rawAuthors = new Set();
  const seenAuthors = new Set();
  let duplicateAuthorPostsExcluded = 0;
  let unverifiableAuthorPostsExcluded = 0;
  let duplicateAuthorQuestionsExcluded = 0;
  let unverifiableAuthorQuestionsExcluded = 0;
  const questions = [];
  for (const post of reddit) {
    const dataType = textField(post, ['dataType']).toLowerCase();
    if (!['post', 'comment'].includes(dataType)) continue;
    const isComment = dataType === 'comment';
    const sourceUrl = isComment
      ? canonicalRedditCommentUrl(textField(post, ['url']))
      : canonicalRedditPostUrl(textField(post, ['url']));
    const parent = isComment ? fetchedParents.get(textField(post, ['postId'])) : null;
    const candidate = isComment ? parent?.candidate : candidateByUrl.get(sourceUrl);
    if (!sourceUrl || !candidate) continue;
    const title = textField(post, ['title']);
    const body = textField(post, ['body']);
    if (isRemoved(post, title, body)) continue;
    const question = isComment ? literalCommentQuestion(body) : explicitQuestion(title, body);
    if (isComment && !hasSubjectRelationship(body, company, domain) && !hasSubjectRelationship(`${parent.title} ${parent.body}`, company, domain)) continue;
    const key = question.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    if (!question || seen.has(key)) continue;
    const rawAuthor = verifiedAuthor(post);
    if (!rawAuthor) {
      unverifiableAuthorQuestionsExcluded += 1;
      if (!isComment) unverifiableAuthorPostsExcluded += 1;
      continue;
    }
    if (rawAuthor && seenAuthors.has(rawAuthor)) {
      duplicateAuthorQuestionsExcluded += 1;
      if (!isComment) duplicateAuthorPostsExcluded += 1;
      continue;
    }
    seen.add(key);
    if (rawAuthor) seenAuthors.add(rawAuthor);
    if (rawAuthor) rawAuthors.add(rawAuthor);
    const sanitizedBody = sanitize(body.replace(/\s+/g, ' ').trim())
      .replace(/\s+submitted by\s+\[redacted-author\].*$/i, '')
      .trim();
    const excerpt = (isComment ? sanitize(question) : sanitizedBody).slice(0, 280);
    const parentContext = parent ? sanitize(`${parent.title} ${parent.body}`.replace(/\s+/g, ' ').trim()).slice(0, 280) : '';
    questions.push({
      question: sanitize(question),
      excerpt,
      context: isComment && !hasSubjectRelationship(body, company, domain) ? parentContext : excerpt,
      source_url: sourceUrl,
      source_domain: 'www.reddit.com',
      source_platform: 'reddit',
      source_type: isComment ? 'reddit_comment' : 'reddit_post',
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
      discovery: { id: GOOGLE_ACTOR, endpoint: actorEndpoint(GOOGLE_ACTOR), max_pages_per_query: maxPagesPerQuery, results_per_page: RESULTS_PER_PAGE },
      validation: { id: REDDIT_ACTOR, endpoint: actorEndpoint(REDDIT_ACTOR), max_source_urls: maxSourceUrls, comments: true },
    },
    queries: mode === 'live-apify' ? liveQueries : fixtureQueries,
    discovery_summary: { canonical_reddit_urls_found: candidates.length },
    independence_check: {
      distinct_authors_verified_at_collection: rawAuthors.size >= 2,
      accepted_posts_with_author: rawAuthors.size,
      duplicate_author_posts_excluded: duplicateAuthorPostsExcluded,
      unverifiable_author_posts_excluded: unverifiableAuthorPostsExcluded,
      accepted_questions_with_author: rawAuthors.size,
      duplicate_author_questions_excluded: duplicateAuthorQuestionsExcluded,
      unverifiable_author_questions_excluded: unverifiableAuthorQuestionsExcluded,
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
  const raw = options.rawFixture ? await readFixture(options.rawFixture) : await collectLive(queries, options);
  await writeJsonAtomically(options.output, normalize(raw, { ...options, mode, liveQueries: queries }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`collect-public-questions: ${error.message}`);
    process.exitCode = 1;
  });
}
