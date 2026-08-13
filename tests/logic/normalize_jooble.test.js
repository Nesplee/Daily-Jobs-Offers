const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJoobleItem } = require('../../n8n/logic/normalize_jooble.js');

test('maps the common fields and buckets the rest into raw_extra', () => {
  const raw = {
    id: '7345981',
    title: 'DevOps Engineer',
    location: 'Genève, Suisse',
    company: 'Exemple SA',
    salary: '80000 - 95000 CHF',
    link: 'https://jooble.org/desc/7345981',
    updated: '2026-08-10T09:00:00.0000000',
    snippet: 'We are looking for a DevOps engineer with AWS experience.',
    source: 'linkedin.com',
    type: 'Full-time',
    fullDescription: 'Full text of the Jooble-sourced ad, unabridged.',
  };
  const result = normalizeJoobleItem(raw);
  assert.deepEqual(result, {
    source: 'jooble.ch',
    source_id: '7345981',
    title: 'DevOps Engineer',
    company: 'Exemple SA',
    url: 'https://jooble.org/desc/7345981',
    location: 'Genève, Suisse',
    posted_at: '2026-08-10',
    raw_extra: {
      description_snippet: 'We are looking for a DevOps engineer with AWS experience.',
      salary: '80000 - 95000 CHF',
      type: 'Full-time',
      source_name: 'linkedin.com',
      description_full: 'Full text of the Jooble-sourced ad, unabridged.',
    },
  });
});

test('handles missing optional fields as null', () => {
  const raw = {
    id: '1', title: 'T', location: null, company: null, salary: null,
    link: 'https://x', updated: '2026-08-10T09:00:00.0000000', snippet: null,
    source: null, type: null, fullDescription: null,
  };
  const result = normalizeJoobleItem(raw);
  assert.equal(result.company, null);
  assert.deepEqual(result.raw_extra, {
    description_snippet: null,
    salary: null,
    type: null,
    source_name: null,
    description_full: null,
  });
});
