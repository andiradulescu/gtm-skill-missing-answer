#!/usr/bin/env node

import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ACTOR_ID = 'apify~google-search-scraper';
const APIFY_ENDPOINT = `https://api.apify.com/v2/actors/${ACTOR_ID}/run-sync-get-dataset-items?timeout=120&maxTotalChargeUsd=0.10&clean=true`;
const QUESTION_START = /^(?:who|what|when|where|why|how|can|could|does|do|is|are|should|would|which)\b/i;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const name = { '--company': 'company', '--domain': 'domain', '--output': 'output', '--raw-fixture': 'rawFixture', '--queries': 'queries' }[argument];
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
  try {
    domain = new URL(`https://${options.domain}`).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    throw new Error('--domain must be a valid hostname');
  }
  if (domain !== options.domain.toLowerCase().replace(/\.$/, '') || domain.includes('/') || !domain.includes('.')) {
    throw new Error('--domain must be a bare hostname');
  }
  return { ...options, company: options.company.trim(), domain };
}

function boundedQueries(company, domain, supplied) {
  const values = supplied
    ? supplied.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    : [`${company} alternatives`, `${company} reviews`, `${company} pricing questions`, `${company} limitations`, `site:reddit.com ${company}`];
  if (values.length === 0 || values.length > 8) throw new Error('--queries must contain between 1 and 8 queries');
  return values.map((query) => `${query.replace(new RegExp(`\\s+-site:${domain.replaceAll('.', '\\.')}(?=\\s|$)`, 'gi'), '')} -site:${domain}`);
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

function requireDataset(value) {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('Raw data must be a JSON array of result objects');
  }
  return value;
}

async function readFixture(filename) {
  try {
    return requireDataset(JSON.parse(await readFile(filename, 'utf8')));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in fixture: ${error.message}`);
    throw error;
  }
}

async function collectLive(queries) {
  const token = await loadToken();
  const response = await fetch(APIFY_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ queries: queries.join('\n'), maxPagesPerQuery: 1, resultsPerPage: 10 }),
  });
  if (!response.ok) throw new Error(`Apify API request failed with HTTP ${response.status}`);
  try {
    return requireDataset(await response.json());
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Apify API returned invalid JSON: ${error.message}`);
    throw error;
  }
}

function textField(value, names) {
  for (const name of names) {
    if (typeof value?.[name] === 'string' && value[name].trim()) return value[name].trim();
  }
  return '';
}

function sanitizeContext(value) {
  return value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]').replace(/(^|\s)@[A-Z0-9_][A-Z0-9_.-]*/gi, '$1[redacted-handle]');
}

function sourceDetails(rawUrl, excludedDomain) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const domain = url.hostname.toLowerCase().replace(/\.$/, '');
  if (domain === excludedDomain || domain.endsWith(`.${excludedDomain}`)) return null;
  return { source_url: url.href, source_domain: domain };
}

function normalize(dataset, { company, domain, mode, liveQueries }) {
  const retrievedAt = new Date().toISOString();
  const questions = [];
  const seen = new Set();
  const discoveredQueries = [];
  for (const item of dataset) {
    const query = textField(item?.searchQuery, ['term', 'query']) || textField(item, ['query', 'searchQuery']) || 'unknown';
    if (query !== 'unknown' && !discoveredQueries.includes(query)) discoveredQueries.push(query);
    for (const [sourceType, candidates] of [['organic_result', item.organicResults], ['people_also_ask', item.peopleAlsoAsk]]) {
      if (candidates === undefined) continue;
      if (!Array.isArray(candidates)) throw new Error(`${sourceType} must be an array`);
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') throw new Error(`${sourceType} entries must be objects`);
        const question = textField(candidate, ['question', 'title']).replace(/\s+/g, ' ');
        const source = sourceDetails(textField(candidate, ['url', 'link']), domain);
        const explicitQuestion = question.endsWith('?') || QUESTION_START.test(question);
        const key = question.toLocaleLowerCase().trim();
        if (!question || !explicitQuestion || !source || seen.has(key)) continue;
        seen.add(key);
        questions.push({ question, ...source, source_type: sourceType, discovery_query: query, retrieved_at: retrievedAt, context: sanitizeContext(textField(candidate, ['description', 'snippet'])) });
      }
    }
  }
  if (questions.length === 0) throw new Error('No qualifying third-party questions were found');
  return {
    schema_version: 1,
    subject: { name: company, domain },
    retrieved_at: retrievedAt,
    collection_mode: mode,
    actor: { id: ACTOR_ID, endpoint: APIFY_ENDPOINT, max_pages_per_query: 1, results_per_page: 10 },
    queries: mode === 'live-apify' ? liveQueries : discoveredQueries,
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
  const dataset = options.rawFixture ? await readFixture(options.rawFixture) : await collectLive(queries);
  await writeJsonAtomically(options.output, normalize(dataset, { ...options, mode, liveQueries: queries }));
}

main().catch((error) => {
  console.error(`collect-public-questions: ${error.message}`);
  process.exitCode = 1;
});
