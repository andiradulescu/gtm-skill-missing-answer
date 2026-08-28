#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const REQUIRED_TEXT_FIELDS = ['question', 'context', 'source_url', 'source_platform', 'created_at', 'retrieved_at'];
const IDENTITY_FIELD = /^(?:author|authors|author_name|author_handle|name|names|handle|handles|email|emails|username|user_name|user_id|userid|user_ids|userids)$/i;
const ALLOWED_IDENTITY_FIELDS = new Set(['author_available', 'author_redacted']);

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonemptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a nonempty string`);
}

function requireTimestamp(value, label) {
  requireNonemptyString(value, label);
  if (!Number.isFinite(Date.parse(value))) fail(`${label} must be a valid timestamp`);
}

function requireNonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) fail(`${label} must be a nonnegative integer`);
}

function subjectHostname(subject) {
  if (!isObject(subject)) fail('subject must be an object');
  requireNonemptyString(subject.name, 'subject.name');
  requireNonemptyString(subject.domain, 'subject.domain');
  let hostname;
  try {
    hostname = new URL(`https://${subject.domain}`).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    fail('subject.domain must be a valid bare hostname');
  }
  if (hostname !== subject.domain.toLowerCase().replace(/\.$/, '') || !hostname.includes('.')) {
    fail('subject.domain must be a valid bare hostname');
  }
  return hostname;
}

function sourceHostname(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) fail(`${label} must be an HTTP(S) URL`);
  return url.hostname.toLowerCase().replace(/\.$/, '');
}

function rejectIdentityFields(value, location = 'snapshot') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectIdentityFields(item, `${location}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (location !== 'snapshot.subject' && IDENTITY_FIELD.test(key) && !ALLOWED_IDENTITY_FIELDS.has(key)) {
      fail(`${location} contains forbidden identity field ${key}`);
    }
    rejectIdentityFields(child, `${location}.${key}`);
  }
}

function rejectDiscoveryUrlLists(value, location = 'snapshot') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectDiscoveryUrlLists(item, `${location}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (/discover(?:y|ed)/i.test(key) && Array.isArray(child) && child.some((item) => typeof item === 'string' && /^https?:\/\//i.test(item))) {
      fail(`${location}.${key} must not contain discovery-only URLs`);
    }
    rejectDiscoveryUrlLists(child, `${location}.${key}`);
  }
}

function validate(snapshot) {
  if (!isObject(snapshot)) fail('snapshot must be a JSON object');
  if (snapshot.schema_version !== 1) fail('schema_version must be 1');
  const subjectDomain = subjectHostname(snapshot.subject);
  requireTimestamp(snapshot.retrieved_at, 'retrieved_at');
  rejectIdentityFields(snapshot);
  rejectDiscoveryUrlLists(snapshot);

  if (!Array.isArray(snapshot.questions) || snapshot.questions.length === 0) fail('questions must be a nonempty array');
  const sourceUrls = new Set();
  snapshot.questions.forEach((question, index) => {
    const label = `questions[${index}]`;
    if (!isObject(question)) fail(`${label} must be an object`);
    for (const field of REQUIRED_TEXT_FIELDS) requireNonemptyString(question[field], `${label}.${field}`);
    requireTimestamp(question.created_at, `${label}.created_at`);
    requireTimestamp(question.retrieved_at, `${label}.retrieved_at`);
    if (question.validation !== 'fetched-source') fail(`${label}.validation must be fetched-source`);
    if (question.author_available !== true) fail(`${label}.author_available must be true`);
    if (question.author_redacted !== true) fail(`${label}.author_redacted must be true`);
    if (sourceUrls.has(question.source_url)) fail('question source URLs must be distinct');
    sourceUrls.add(question.source_url);
    const hostname = sourceHostname(question.source_url, `${label}.source_url`);
    if (hostname === subjectDomain || hostname.endsWith(`.${subjectDomain}`)) fail(`${label}.source_url must exclude the subject domain`);
  });

  const independence = snapshot.independence_check;
  if (!isObject(independence)) fail('independence_check must be an object');
  if (independence.distinct_authors_verified_at_collection !== true) {
    fail('independence_check.distinct_authors_verified_at_collection must be true');
  }
  requireNonnegativeInteger(independence.accepted_posts_with_author, 'independence_check.accepted_posts_with_author');
  if (independence.accepted_posts_with_author !== snapshot.questions.length) {
    fail('independence_check.accepted_posts_with_author must match questions length');
  }
  requireNonnegativeInteger(independence.duplicate_author_posts_excluded, 'independence_check.duplicate_author_posts_excluded');
  requireNonnegativeInteger(independence.unverifiable_author_posts_excluded, 'independence_check.unverifiable_author_posts_excluded');
}

async function main() {
  if (process.argv.length !== 3) fail('usage: validate-question-snapshot.mjs <snapshot.json>');
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) fail('snapshot must contain valid JSON');
    throw error;
  }
  validate(snapshot);
}

main().catch((error) => {
  console.error(`validate-question-snapshot: ${error.message}`);
  process.exitCode = 1;
});
