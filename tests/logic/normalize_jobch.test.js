const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJobchListing } = require('../../n8n/logic/normalize_jobch.js');

test('maps the common fields and buckets the rest into raw_extra', () => {
  const raw = {
    id: 'jch-12345',
    title: 'Data Engineer 80-100%',
    company: 'Exemple SA',
    url: 'https://www.job.ch/en/vacancies/detail/jch-12345',
    location: 'Lausanne',
    postedDate: '2026-08-10',
    contractType: 'CDI',
    remote: 'hybride',
    description: 'Nous cherchons un data engineer maîtrisant Python.',
    fullDescription: 'Full text of the job.ch ad, unabridged.',
  };
  const result = normalizeJobchListing(raw);
  assert.deepEqual(result, {
    source: 'jobs.ch',
    source_id: 'jch-12345',
    title: 'Data Engineer 80-100%',
    company: 'Exemple SA',
    url: 'https://www.job.ch/en/vacancies/detail/jch-12345',
    location: 'Lausanne',
    posted_at: '2026-08-10',
    raw_extra: {
      contract_type: 'CDI',
      remote: 'hybride',
      description: 'Nous cherchons un data engineer maîtrisant Python.',
      description_full: 'Full text of the job.ch ad, unabridged.',
    },
  });
});

test('handles a missing postedDate as null', () => {
  const raw = {
    id: 'jch-999', title: 'X', company: null, url: 'https://job.ch/x',
    location: null, postedDate: null, contractType: null, remote: null, description: null, fullDescription: null,
  };
  const result = normalizeJobchListing(raw);
  assert.equal(result.posted_at, null);
  assert.equal(result.raw_extra.description_full, null);
});
